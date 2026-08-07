/**
 * The three-legged OAuth 1.0a flow.
 *
 * @see https://www.discogs.com/developers/#page:authentication,header:authentication-oauth-flow
 * @module
 */

import { createDiscogsError } from '../errors.js'
import { parseRateLimit } from '../rate-limit.js'
import {
  buildAuthorizationHeader,
  currentTimestamp,
  generateNonce,
  signRequest,
  type OAuthNonceOptions,
  type OAuthParams
} from './oauth.js'
import type { OAuthSignatureMethod } from './types.js'

/** Default base URL of the Discogs API. */
export const DEFAULT_BASE_URL = 'https://api.discogs.com'

/** Default base URL of the Discogs website, which hosts the authorize page. */
export const DEFAULT_WEBSITE_URL = 'https://www.discogs.com'

/** Configuration for {@link DiscogsOAuth}. */
export interface DiscogsOAuthConfig extends OAuthNonceOptions {
  consumerKey: string
  consumerSecret: string
  /**
   * Identifies your application to Discogs. Required — requests without a User-Agent receive
   * an empty response.
   *
   * @example `'MyDiscogsClient/1.0 +https://mydiscogsclient.org'`
   */
  userAgent: string
  /** Defaults to `"PLAINTEXT"`, as recommended by the Discogs documentation. */
  signatureMethod?: OAuthSignatureMethod
  /** Override the API base URL. Defaults to `https://api.discogs.com`. */
  baseUrl?: string
  /** Override the website base URL used to build the authorize link. */
  websiteUrl?: string
  /** Custom `fetch` implementation. Defaults to the global one. */
  fetch?: typeof globalThis.fetch
}

/** A temporary request token, valid for 15 minutes. */
export interface RequestToken {
  oauthToken: string
  oauthTokenSecret: string
  /** Discogs confirms it honoured the callback URL you supplied. */
  callbackConfirmed: boolean
}

/** A long-lived access token. Does not expire unless the user revokes access. */
export interface AccessToken {
  oauthToken: string
  oauthTokenSecret: string
}

/** Arguments for {@link DiscogsOAuth.getAccessToken}. */
export interface GetAccessTokenParams {
  /** The request token from {@link DiscogsOAuth.getRequestToken}. */
  oauthToken: string
  /** The matching request token secret. */
  oauthTokenSecret: string
  /**
   * The verifier Discogs handed back after the user approved access — either from the
   * `oauth_verifier` query parameter on your callback URL, or typed in by the user when no
   * callback is registered.
   */
  verifier: string
}

/**
 * Drives the three-legged OAuth 1.0a flow that yields an access token for a Discogs user.
 *
 * Once you have the access token, hand it to {@link DiscogsClient} as the `auth` option.
 *
 * @example
 * ```ts
 * const oauth = new DiscogsOAuth({
 *   consumerKey: process.env.DISCOGS_CONSUMER_KEY!,
 *   consumerSecret: process.env.DISCOGS_CONSUMER_SECRET!,
 *   userAgent: 'MyApp/1.0 +https://example.com',
 * });
 *
 * // 1. Get a temporary request token and send the user to Discogs.
 * const request = await oauth.getRequestToken('https://example.com/callback');
 * console.log(oauth.getAuthorizeUrl(request.oauthToken));
 *
 * // 2. Discogs redirects back with ?oauth_verifier=… — exchange it for an access token.
 * const access = await oauth.getAccessToken({ ...request, verifier });
 *
 * // 3. Use it.
 * const client = new DiscogsClient({
 *   userAgent: 'MyApp/1.0 +https://example.com',
 *   auth: {
 *     consumerKey, consumerSecret,
 *     accessToken: access.oauthToken,
 *     accessTokenSecret: access.oauthTokenSecret,
 *   },
 * });
 * ```
 */
export class DiscogsOAuth {
  readonly #consumerKey: string
  readonly #consumerSecret: string
  readonly #userAgent: string
  readonly #signatureMethod: OAuthSignatureMethod
  readonly #baseUrl: string
  readonly #websiteUrl: string
  readonly #fetch: typeof globalThis.fetch
  readonly #nonce: () => string
  readonly #timestamp: () => string

  constructor(config: DiscogsOAuthConfig) {
    if (!config.consumerKey || !config.consumerSecret) {
      throw new TypeError('DiscogsOAuth requires a consumerKey and a consumerSecret.')
    }
    if (!config.userAgent) {
      throw new TypeError(
        'DiscogsOAuth requires a userAgent. Discogs returns an empty response without one.'
      )
    }

    this.#consumerKey = config.consumerKey
    this.#consumerSecret = config.consumerSecret
    this.#userAgent = config.userAgent
    this.#signatureMethod = config.signatureMethod ?? 'PLAINTEXT'
    this.#baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.#websiteUrl = (config.websiteUrl ?? DEFAULT_WEBSITE_URL).replace(/\/+$/, '')
    this.#fetch = config.fetch ?? globalThis.fetch.bind(globalThis)
    this.#nonce = config.nonce ?? generateNonce
    this.#timestamp = config.timestamp ?? currentTimestamp
  }

  /**
   * Step 1 — requests a temporary token from `GET /oauth/request_token`.
   *
   * @param callbackUrl - Where Discogs should send the user after they approve access. Pass
   * `'oob'` (out of band) when you have no callback URL and want the user to type the
   * verifier in manually.
   */
  async getRequestToken(callbackUrl: string): Promise<RequestToken> {
    const url = new URL('/oauth/request_token', `${this.#baseUrl}/`)
    const body = await this.#send('GET', url, { oauth_callback: callbackUrl })

    const token = body.get('oauth_token')
    const secret = body.get('oauth_token_secret')
    if (token === null || secret === null) {
      throw new Error(
        `Discogs did not return an oauth_token pair from ${url.pathname}: "${body.toString()}"`
      )
    }

    return {
      oauthToken: token,
      oauthTokenSecret: secret,
      callbackConfirmed: body.get('oauth_callback_confirmed') === 'true'
    }
  }

  /**
   * Step 2 — the URL to send the user to so they can approve your application.
   *
   * @param requestToken - The `oauthToken` from {@link DiscogsOAuth.getRequestToken}.
   */
  getAuthorizeUrl(requestToken: string): string {
    const url = new URL('/oauth/authorize', `${this.#websiteUrl}/`)
    url.searchParams.set('oauth_token', requestToken)
    return url.toString()
  }

  /**
   * Step 3 — exchanges the approved request token for a long-lived access token via
   * `POST /oauth/access_token`.
   *
   * Request tokens and verifiers expire 15 minutes after they are issued; an expired or
   * malformed exchange fails with a 400.
   */
  async getAccessToken(params: GetAccessTokenParams): Promise<AccessToken> {
    const url = new URL('/oauth/access_token', `${this.#baseUrl}/`)
    const body = await this.#send(
      'POST',
      url,
      { oauth_token: params.oauthToken, oauth_verifier: params.verifier },
      params.oauthTokenSecret
    )

    const token = body.get('oauth_token')
    const secret = body.get('oauth_token_secret')
    if (token === null || secret === null) {
      throw new Error(
        `Discogs did not return an oauth_token pair from ${url.pathname}: "${body.toString()}"`
      )
    }

    return { oauthToken: token, oauthTokenSecret: secret }
  }

  /**
   * Signs and sends a token request, returning the form-encoded response body.
   *
   * Both token endpoints answer with `application/x-www-form-urlencoded`, not JSON.
   */
  async #send(
    method: 'GET' | 'POST',
    url: URL,
    extraParams: OAuthParams,
    tokenSecret = ''
  ): Promise<URLSearchParams> {
    const params: OAuthParams = {
      oauth_consumer_key: this.#consumerKey,
      oauth_signature_method: this.#signatureMethod,
      oauth_timestamp: this.#timestamp(),
      oauth_nonce: this.#nonce(),
      oauth_version: '1.0',
      ...extraParams
    }

    const signature = await signRequest({
      method,
      url,
      oauthParams: params,
      consumerSecret: this.#consumerSecret,
      tokenSecret,
      signatureMethod: this.#signatureMethod
    })

    const response = await this.#fetch(url.toString(), {
      method,
      headers: {
        Authorization: buildAuthorizationHeader({ ...params, oauth_signature: signature }),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.#userAgent
      }
    })

    const text = await response.text()
    if (!response.ok) {
      throw createDiscogsError(response, text, parseRateLimit(response.headers))
    }

    return new URLSearchParams(text)
  }
}
