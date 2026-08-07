import { describe, expect, it } from 'vitest'
import {
  DiscogsClient,
  DiscogsOAuth,
  KeySecretAuth,
  OAuth1Auth,
  TokenAuth,
  type AuthStrategy
} from '../src/index.js'
import {
  buildAuthorizationHeader,
  buildSignatureBaseString,
  buildSigningKey,
  generateNonce,
  hmacSha1,
  percentEncode
} from '../src/auth/oauth.js'
import { createFakeFetch, createTestClient, TEST_USER_AGENT } from './helpers.js'

/** Parses an `Authorization: OAuth …` header back into a parameter map. */
function parseOAuthHeader(header: string): Record<string, string> {
  expect(header.startsWith('OAuth ')).toBe(true)
  const params: Record<string, string> = {}
  for (const part of header.slice('OAuth '.length).split(', ')) {
    const index = part.indexOf('=')
    const key = decodeURIComponent(part.slice(0, index))
    params[key] = decodeURIComponent(part.slice(index + 1).replace(/^"|"$/g, ''))
  }
  return params
}

describe('percentEncode', () => {
  it('escapes the characters encodeURIComponent leaves alone', () => {
    expect(percentEncode("!'()*")).toBe('%21%27%28%29%2A')
  })

  it('leaves unreserved characters untouched', () => {
    expect(percentEncode('abcXYZ019-._~')).toBe('abcXYZ019-._~')
  })

  it('escapes spaces as %20, not +', () => {
    expect(percentEncode('a b')).toBe('a%20b')
  })
})

describe('generateNonce', () => {
  it('produces distinct 32-character hex strings', () => {
    const a = generateNonce()
    const b = generateNonce()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toBe(b)
  })
})

describe('OAuth signing', () => {
  // The worked example from the Twitter OAuth documentation, a widely used HMAC-SHA1 vector.
  const EXPECTED_BASE_STRING =
    'POST&https%3A%2F%2Fapi.twitter.com%2F1%2Fstatuses%2Fupdate.json&' +
    'include_entities%3Dtrue%26oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog%26' +
    'oauth_nonce%3DkYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg%26' +
    'oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1318622958%26' +
    'oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb%26' +
    'oauth_version%3D1.0%26status%3DHello%2520Ladies%2520%252B%2520Gentlemen%252C%2520' +
    'a%2520signed%2520OAuth%2520request%2521'

  const SIGNING_KEY =
    'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'

  it('builds the RFC 5849 signature base string, sorted by byte value', () => {
    const url = new URL(
      'https://api.twitter.com/1/statuses/update.json' +
        '?include_entities=true' +
        '&status=Hello%20Ladies%20%2B%20Gentlemen%2C%20a%20signed%20OAuth%20request%21'
    )

    const baseString = buildSignatureBaseString('POST', url, {
      oauth_consumer_key: 'xvz1evFS4wEEPTGEFPHBog',
      oauth_nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: '1318622958',
      oauth_token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
      oauth_version: '1.0'
    })

    expect(baseString).toBe(EXPECTED_BASE_STRING)
  })

  it('computes the documented HMAC-SHA1 signature', async () => {
    await expect(hmacSha1(SIGNING_KEY, EXPECTED_BASE_STRING)).resolves.toBe(
      'tnnArxj06cWHq44gCs1OSKk/jLY='
    )
  })

  it('excludes the query string from the base URL but keeps it in the parameters', () => {
    const baseString = buildSignatureBaseString(
      'get',
      new URL('https://api.discogs.com/database/search?q=nirvana'),
      { oauth_nonce: 'n' }
    )

    expect(baseString).toBe(
      'GET&https%3A%2F%2Fapi.discogs.com%2Fdatabase%2Fsearch&oauth_nonce%3Dn%26q%3Dnirvana'
    )
  })

  it('builds a signing key from percent-encoded secrets', () => {
    expect(buildSigningKey('con sumer', 'to+ken')).toBe('con%20sumer&to%2Bken')
    // A request-token call has no token secret yet, leaving a trailing ampersand.
    expect(buildSigningKey('secret')).toBe('secret&')
  })

  it('quotes and percent-encodes every parameter in the Authorization header', () => {
    expect(buildAuthorizationHeader({ oauth_signature: 'a+b/c=', oauth_nonce: 'x' })).toBe(
      'OAuth oauth_signature="a%2Bb%2Fc%3D", oauth_nonce="x"'
    )
  })
})

describe('auth strategies', () => {
  it('TokenAuth sends the Discogs token scheme', async () => {
    const { client, fake } = createTestClient({ body: {} }, { auth: { token: 'abcxyz123456' } })

    await client.database.getRelease(1)

    expect(fake.lastRequest().headers.get('Authorization')).toBe('Discogs token=abcxyz123456')
  })

  it('KeySecretAuth sends the Discogs key/secret scheme', async () => {
    const { client, fake } = createTestClient(
      { body: {} },
      { auth: { consumerKey: 'foo123', consumerSecret: 'bar456' } }
    )

    await client.database.search({ q: 'Nirvana' })

    expect(fake.lastRequest().headers.get('Authorization')).toBe(
      'Discogs key=foo123, secret=bar456'
    )
  })

  it('OAuth1Auth signs with PLAINTEXT by default', async () => {
    const { client, fake } = createTestClient(
      { body: {} },
      {
        auth: {
          consumerKey: 'ckey',
          consumerSecret: 'csecret',
          accessToken: 'atoken',
          accessTokenSecret: 'asecret'
        }
      }
    )

    await client.database.getRelease(1)

    const params = parseOAuthHeader(fake.lastRequest().headers.get('Authorization')!)
    expect(params['oauth_signature_method']).toBe('PLAINTEXT')
    expect(params['oauth_signature']).toBe('csecret&asecret')
    expect(params['oauth_consumer_key']).toBe('ckey')
    expect(params['oauth_token']).toBe('atoken')
    expect(params['oauth_version']).toBe('1.0')
    expect(params['oauth_nonce']).toMatch(/^[0-9a-f]{32}$/)
    expect(params['oauth_timestamp']).toMatch(/^\d+$/)
  })

  it('OAuth1Auth signs with HMAC-SHA1 when asked, over the final query string', async () => {
    const auth = new OAuth1Auth(
      {
        consumerKey: 'ckey',
        consumerSecret: 'csecret',
        accessToken: 'atoken',
        accessTokenSecret: 'asecret',
        signatureMethod: 'HMAC-SHA1'
      },
      { nonce: () => 'fixednonce', timestamp: () => '1600000000' }
    )

    const url = new URL('https://api.discogs.com/database/search?q=nirvana')
    const headers = new Headers()
    await auth.authorize({ method: 'GET', url, headers })

    const params = parseOAuthHeader(headers.get('Authorization')!)
    expect(params['oauth_signature_method']).toBe('HMAC-SHA1')

    const expected = await hmacSha1(
      buildSigningKey('csecret', 'asecret'),
      buildSignatureBaseString('GET', url, {
        oauth_consumer_key: 'ckey',
        oauth_token: 'atoken',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: '1600000000',
        oauth_nonce: 'fixednonce',
        oauth_version: '1.0'
      })
    )
    expect(params['oauth_signature']).toBe(expected)
  })

  it('rejects incomplete credentials', () => {
    expect(() => new TokenAuth('')).toThrow(TypeError)
    expect(() => new KeySecretAuth('key', '')).toThrow(TypeError)
    expect(
      () =>
        new OAuth1Auth({
          consumerKey: 'k',
          consumerSecret: 's',
          accessToken: '',
          accessTokenSecret: ''
        })
    ).toThrow(TypeError)
  })

  it('rejects an unrecognised auth option', () => {
    expect(
      () =>
        new DiscogsClient({
          userAgent: TEST_USER_AGENT,
          auth: {} as unknown as { token: string }
        })
    ).toThrow(TypeError)
  })

  it('accepts a hand-rolled AuthStrategy', async () => {
    const custom: AuthStrategy = {
      authorize(request) {
        request.headers.set('Authorization', 'Custom hello')
      }
    }
    const { client, fake } = createTestClient({ body: {} }, { auth: custom })

    await client.database.getRelease(1)

    expect(fake.lastRequest().headers.get('Authorization')).toBe('Custom hello')
  })
})

describe('DiscogsOAuth flow', () => {
  const config = {
    consumerKey: 'ckey',
    consumerSecret: 'csecret',
    userAgent: TEST_USER_AGENT,
    nonce: () => 'fixednonce',
    timestamp: () => '1600000000'
  }

  it('getRequestToken GETs the request-token endpoint and parses the form-encoded reply', async () => {
    const fake = createFakeFetch({
      text: 'oauth_token=abc123&oauth_token_secret=xyz789&oauth_callback_confirmed=true'
    })
    const oauth = new DiscogsOAuth({ ...config, fetch: fake.fetch })

    const token = await oauth.getRequestToken('https://example.com/cb')

    expect(token).toEqual({
      oauthToken: 'abc123',
      oauthTokenSecret: 'xyz789',
      callbackConfirmed: true
    })

    const request = fake.lastRequest()
    expect(request.method).toBe('GET')
    expect(request.url.toString()).toBe('https://api.discogs.com/oauth/request_token')
    expect(request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded')
    expect(request.headers.get('User-Agent')).toBe(TEST_USER_AGENT)

    const params = parseOAuthHeader(request.headers.get('Authorization')!)
    expect(params['oauth_callback']).toBe('https://example.com/cb')
    // No token secret exists yet, so the PLAINTEXT signature ends in a bare ampersand.
    expect(params['oauth_signature']).toBe('csecret&')
  })

  it('getAuthorizeUrl points at the website, not the API', () => {
    const oauth = new DiscogsOAuth(config)

    expect(oauth.getAuthorizeUrl('abc123')).toBe(
      'https://www.discogs.com/oauth/authorize?oauth_token=abc123'
    )
  })

  it('getAccessToken POSTs the verifier and signs with the request token secret', async () => {
    const fake = createFakeFetch({ text: 'oauth_token=final123&oauth_token_secret=finalsecret' })
    const oauth = new DiscogsOAuth({ ...config, fetch: fake.fetch })

    const access = await oauth.getAccessToken({
      oauthToken: 'abc123',
      oauthTokenSecret: 'xyz789',
      verifier: 'verify42'
    })

    expect(access).toEqual({ oauthToken: 'final123', oauthTokenSecret: 'finalsecret' })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.url.toString()).toBe('https://api.discogs.com/oauth/access_token')

    const params = parseOAuthHeader(request.headers.get('Authorization')!)
    expect(params['oauth_token']).toBe('abc123')
    expect(params['oauth_verifier']).toBe('verify42')
    expect(params['oauth_signature']).toBe('csecret&xyz789')
  })

  it('throws a DiscogsError when the token endpoint fails', async () => {
    const fake = createFakeFetch({ status: 400, text: 'Invalid signature' })
    const oauth = new DiscogsOAuth({ ...config, fetch: fake.fetch })

    await expect(oauth.getRequestToken('oob')).rejects.toThrow('Invalid signature')
  })

  it('throws when the reply omits the token pair', async () => {
    const fake = createFakeFetch({ text: 'oauth_problem=parameter_absent' })
    const oauth = new DiscogsOAuth({ ...config, fetch: fake.fetch })

    await expect(oauth.getRequestToken('oob')).rejects.toThrow(/did not return an oauth_token/)
  })

  it('requires a consumer key/secret and a user agent', () => {
    expect(() => new DiscogsOAuth({ ...config, consumerKey: '' })).toThrow(TypeError)
    expect(() => new DiscogsOAuth({ ...config, userAgent: '' })).toThrow(TypeError)
  })
})
