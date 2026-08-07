/**
 * OAuth 1.0a request signing.
 *
 * Discogs supports both `PLAINTEXT` and `HMAC-SHA1`, and its documentation recommends
 * `PLAINTEXT` — every request goes over HTTPS, so the extra signing buys little. `HMAC-SHA1`
 * is implemented here too, via the Web Crypto API, which is why signing is asynchronous.
 *
 * @see https://www.discogs.com/developers/#page:authentication,header:authentication-oauth-flow
 * @module
 */

import type {
  AuthStrategy,
  AuthorizableRequest,
  OAuthCredentials,
  OAuthSignatureMethod
} from './types.js'

/**
 * Percent-encodes a value per RFC 3986, which is stricter than `encodeURIComponent`:
 * `!`, `'`, `(`, `)` and `*` must be escaped too.
 *
 * @internal
 */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/**
 * Generates a random nonce.
 *
 * @internal
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Current Unix timestamp in seconds, as a string.
 *
 * @internal
 */
export function currentTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString()
}

/** OAuth protocol parameters, minus the signature. */
export type OAuthParams = Record<string, string>

/**
 * Builds the signature base string defined by RFC 5849 §3.4.1.
 *
 * Query-string parameters participate in the signature; JSON and multipart request bodies do
 * not, which covers every Discogs endpoint this client talks to.
 *
 * @internal
 */
export function buildSignatureBaseString(
  method: string,
  url: URL,
  oauthParams: OAuthParams
): string {
  const base = `${url.origin}${url.pathname}`

  const pairs: Array<[string, string]> = []
  for (const [key, value] of url.searchParams) pairs.push([key, value])
  for (const [key, value] of Object.entries(oauthParams)) pairs.push([key, value])

  // RFC 5849 §3.4.1.3.2 sorts by byte value, not by locale.
  const byteCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

  const normalized = pairs
    .map(([key, value]): [string, string] => [percentEncode(key), percentEncode(value)])
    .sort(([keyA, valueA], [keyB, valueB]) =>
      keyA === keyB ? byteCompare(valueA, valueB) : byteCompare(keyA, keyB)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return [method.toUpperCase(), percentEncode(base), percentEncode(normalized)].join('&')
}

/**
 * The signing key: the percent-encoded consumer secret and token secret, joined by `&`.
 *
 * @internal
 */
export function buildSigningKey(consumerSecret: string, tokenSecret = ''): string {
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
}

/**
 * Computes an HMAC-SHA1 signature and returns it base64-encoded.
 *
 * @internal
 */
export async function hmacSha1(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))

  let binary = ''
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Computes the `oauth_signature` value for a request.
 *
 * @internal
 */
export async function signRequest(options: {
  method: string
  url: URL
  oauthParams: OAuthParams
  consumerSecret: string
  tokenSecret?: string
  signatureMethod: OAuthSignatureMethod
}): Promise<string> {
  const key = buildSigningKey(options.consumerSecret, options.tokenSecret)
  if (options.signatureMethod === 'PLAINTEXT') return key

  const baseString = buildSignatureBaseString(options.method, options.url, options.oauthParams)
  return hmacSha1(key, baseString)
}

/**
 * Assembles an `Authorization: OAuth …` header value from a set of parameters.
 *
 * @internal
 */
export function buildAuthorizationHeader(params: OAuthParams): string {
  const encoded = Object.entries(params)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')
  return `OAuth ${encoded}`
}

/** Injection points used by the tests to make signatures deterministic. */
export interface OAuthNonceOptions {
  /** Overrides nonce generation. Defaults to 16 random bytes, hex-encoded. */
  nonce?: () => string
  /** Overrides the timestamp. Defaults to the current Unix time in seconds. */
  timestamp?: () => string
}

/**
 * Signs requests with a full OAuth 1.0a access token, authenticating as the user who granted
 * access.
 *
 * Obtain the access token and secret with {@link DiscogsOAuth}; they do not expire unless the
 * user revokes them.
 */
export class OAuth1Auth implements AuthStrategy {
  readonly #consumerKey: string
  readonly #consumerSecret: string
  readonly #accessToken: string
  readonly #accessTokenSecret: string
  readonly #signatureMethod: OAuthSignatureMethod
  readonly #nonce: () => string
  readonly #timestamp: () => string

  constructor(credentials: OAuthCredentials, options: OAuthNonceOptions = {}) {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = credentials
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new TypeError(
        'OAuth authentication requires consumerKey, consumerSecret, accessToken and accessTokenSecret.'
      )
    }
    this.#consumerKey = consumerKey
    this.#consumerSecret = consumerSecret
    this.#accessToken = accessToken
    this.#accessTokenSecret = accessTokenSecret
    this.#signatureMethod = credentials.signatureMethod ?? 'PLAINTEXT'
    this.#nonce = options.nonce ?? generateNonce
    this.#timestamp = options.timestamp ?? currentTimestamp
  }

  async authorize(request: AuthorizableRequest): Promise<void> {
    const params: OAuthParams = {
      oauth_consumer_key: this.#consumerKey,
      oauth_token: this.#accessToken,
      oauth_signature_method: this.#signatureMethod,
      oauth_timestamp: this.#timestamp(),
      oauth_nonce: this.#nonce(),
      oauth_version: '1.0'
    }

    const signature = await signRequest({
      method: request.method,
      url: request.url,
      oauthParams: params,
      consumerSecret: this.#consumerSecret,
      tokenSecret: this.#accessTokenSecret,
      signatureMethod: this.#signatureMethod
    })

    request.headers.set(
      'Authorization',
      buildAuthorizationHeader({ ...params, oauth_signature: signature })
    )
  }
}
