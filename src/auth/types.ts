/**
 * The authentication strategy contract.
 *
 * @module
 */

/** The parts of an outgoing request a strategy may inspect and mutate. */
export interface AuthorizableRequest {
  /** Uppercase HTTP method, e.g. `"GET"`. */
  method: string
  /** Fully resolved request URL, including the query string. */
  url: URL
  /** Mutable headers — strategies add their `Authorization` header here. */
  headers: Headers
}

/**
 * A pluggable authentication scheme.
 *
 * Implementations mutate `headers` in place. `authorize` may be asynchronous because
 * HMAC-SHA1 signing goes through the Web Crypto API.
 */
export interface AuthStrategy {
  authorize(request: AuthorizableRequest): void | Promise<void>
}

/** Credentials for a personal access token, generated in Discogs Developer Settings. */
export interface TokenCredentials {
  /** A personal access token. Authenticates as the token holder. */
  token: string
}

/**
 * Credentials for a consumer key/secret pair.
 *
 * These raise your rate limit and unlock image URLs, but do not authenticate you as any
 * particular user.
 */
export interface ConsumerCredentials {
  consumerKey: string
  consumerSecret: string
}

/** OAuth 1.0a signature methods supported by Discogs. */
export type OAuthSignatureMethod = 'PLAINTEXT' | 'HMAC-SHA1'

/**
 * Credentials for a completed OAuth 1.0a flow. Authenticates as the user who granted access.
 */
export interface OAuthCredentials extends ConsumerCredentials {
  /** The OAuth access token obtained at the end of the three-legged flow. */
  accessToken: string
  /** The matching access token secret. */
  accessTokenSecret: string
  /**
   * Signature method to sign requests with. Defaults to `"PLAINTEXT"`, which is what the
   * Discogs documentation recommends (all traffic is over HTTPS anyway).
   */
  signatureMethod?: OAuthSignatureMethod
}

/**
 * Any credential shape accepted by the client's `auth` option, or a hand-rolled
 * {@link AuthStrategy}.
 */
export type AuthOption = TokenCredentials | ConsumerCredentials | OAuthCredentials | AuthStrategy
