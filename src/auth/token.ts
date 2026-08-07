/**
 * Personal access token authentication.
 *
 * @module
 */

import type { AuthStrategy, AuthorizableRequest } from './types.js'

/**
 * Authenticates with a personal access token.
 *
 * Sends `Authorization: Discogs token=<token>`. This authenticates as the token holder and
 * only as the token holder — use {@link OAuth1Auth} to act on behalf of other users.
 *
 * @see https://www.discogs.com/developers/#page:authentication,header:authentication-discogs-auth-flow
 */
export class TokenAuth implements AuthStrategy {
  readonly #token: string

  constructor(token: string) {
    if (!token) throw new TypeError('A personal access token is required.')
    this.#token = token
  }

  authorize(request: AuthorizableRequest): void {
    request.headers.set('Authorization', `Discogs token=${this.#token}`)
  }
}
