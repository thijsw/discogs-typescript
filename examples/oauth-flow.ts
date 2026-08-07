/**
 * The full three-legged OAuth 1.0a flow, driven from the terminal.
 *
 * Uses the out-of-band callback ('oob'), so Discogs shows the user a verifier code to paste
 * back here rather than redirecting to a callback URL.
 *
 * Register an application at https://www.discogs.com/settings/developers to get the consumer
 * key and secret, then run with:
 *   DISCOGS_CONSUMER_KEY=… DISCOGS_CONSUMER_SECRET=… pnpm tsx examples/oauth-flow.ts
 */

import { createInterface } from 'node:readline/promises'
import { DiscogsClient, DiscogsOAuth } from '../src/index.js'

const consumerKey = process.env['DISCOGS_CONSUMER_KEY']
const consumerSecret = process.env['DISCOGS_CONSUMER_SECRET']
if (!consumerKey || !consumerSecret) {
  throw new Error('Set DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET.')
}

const userAgent = 'DiscogsTsExample/0.1 +https://github.com/example/discogs-typescript'
const oauth = new DiscogsOAuth({ consumerKey, consumerSecret, userAgent })

// Step 1 — a temporary request token, valid for 15 minutes.
const requestToken = await oauth.getRequestToken('oob')
console.log('Request token obtained, callback confirmed:', requestToken.callbackConfirmed)

// Step 2 — send the user to Discogs to approve the application.
console.log('\nOpen this URL and approve access:')
console.log(`  ${oauth.getAuthorizeUrl(requestToken.oauthToken)}\n`)

const rl = createInterface({ input: process.stdin, output: process.stdout })
const verifier = await rl.question('Paste the verifier code here: ')
rl.close()

// Step 3 — exchange the approved request token for a long-lived access token.
const accessToken = await oauth.getAccessToken({
  oauthToken: requestToken.oauthToken,
  oauthTokenSecret: requestToken.oauthTokenSecret,
  verifier: verifier.trim()
})

console.log('\nAccess token (store these — they do not expire unless revoked):')
console.log(`  oauth_token:        ${accessToken.oauthToken}`)
console.log(`  oauth_token_secret: ${accessToken.oauthTokenSecret}`)

// Step 4 — confirm the credentials work.
const client = new DiscogsClient({
  userAgent,
  auth: {
    consumerKey,
    consumerSecret,
    accessToken: accessToken.oauthToken,
    accessTokenSecret: accessToken.oauthTokenSecret
  }
})

const identity = await client.user.getIdentity()
console.log(`\nAuthenticated as ${identity.username} (id ${String(identity.id)})`)
