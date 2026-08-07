/**
 * Consumer key/secret authentication.
 *
 * @module
 */

import type { AuthStrategy, AuthorizableRequest } from './types.js'

/**
 * Authenticates with a consumer key and secret.
 *
 * Sends `Authorization: Discogs key=<key>, secret=<secret>`. This raises your rate limit to
 * the authenticated tier and unlocks image URLs, but does not authenticate you as any
 * particular user — endpoints that act on a user's data still require OAuth or a personal
 * access token.
 *
 * @see https://www.discogs.com/developers/#page:authentication,header:authentication-discogs-auth-flow
 */
export class KeySecretAuth implements AuthStrategy {
  readonly #key: string
  readonly #secret: string

  constructor(consumerKey: string, consumerSecret: string) {
    if (!consumerKey || !consumerSecret) {
      throw new TypeError('Both a consumer key and a consumer secret are required.')
    }
    this.#key = consumerKey
    this.#secret = consumerSecret
  }

  authorize(request: AuthorizableRequest): void {
    request.headers.set('Authorization', `Discogs key=${this.#key}, secret=${this.#secret}`)
  }
}
