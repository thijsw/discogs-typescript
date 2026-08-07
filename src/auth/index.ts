/**
 * Authentication strategies and the OAuth 1.0a flow helper.
 *
 * @module
 */

export * from './types.js'
export * from './token.js'
export * from './key-secret.js'
export * from './oauth.js'
export * from './flow.js'

import { KeySecretAuth } from './key-secret.js'
import { OAuth1Auth } from './oauth.js'
import { TokenAuth } from './token.js'
import type { AuthOption, AuthStrategy } from './types.js'

function isAuthStrategy(value: AuthOption): value is AuthStrategy {
  return typeof (value as AuthStrategy).authorize === 'function'
}

/**
 * Turns the client's `auth` option into a concrete {@link AuthStrategy}.
 *
 * Accepts a personal token, a consumer key/secret pair, a full set of OAuth credentials, or a
 * strategy object you built yourself.
 *
 * @internal
 */
export function resolveAuth(auth: AuthOption): AuthStrategy {
  if (isAuthStrategy(auth)) return auth

  if ('token' in auth) return new TokenAuth(auth.token)

  if ('accessToken' in auth) return new OAuth1Auth(auth)

  if ('consumerKey' in auth) return new KeySecretAuth(auth.consumerKey, auth.consumerSecret)

  throw new TypeError(
    'Unrecognised auth option. Supply { token }, { consumerKey, consumerSecret }, ' +
      '{ consumerKey, consumerSecret, accessToken, accessTokenSecret }, or an AuthStrategy.'
  )
}
