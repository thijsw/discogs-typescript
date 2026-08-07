import { describe, expect, it, vi } from 'vitest'
import {
  DiscogsAuthenticationError,
  DiscogsClient,
  DiscogsError,
  DiscogsMethodNotAllowedError,
  DiscogsNotFoundError,
  DiscogsPermissionError,
  DiscogsRateLimitError,
  DiscogsServerError,
  DiscogsValidationError,
  parseLinkHeader,
  parseRateLimit
} from '../src/index.js'
import { createFakeFetch, createTestClient, TEST_USER_AGENT } from './helpers.js'

describe('DiscogsClient configuration', () => {
  it('refuses to construct without a User-Agent', () => {
    // Discogs answers requests without a User-Agent with an empty body, so this must fail loudly.
    expect(() => new DiscogsClient({ userAgent: '' })).toThrow(TypeError)
  })

  it('sends the User-Agent and the default Accept header', async () => {
    const { client, fake } = createTestClient({ body: {} })

    await client.database.getRelease(1)

    const { headers } = fake.lastRequest()
    expect(headers.get('User-Agent')).toBe(TEST_USER_AGENT)
    expect(headers.get('Accept')).toBe('application/vnd.discogs.v2.discogs+json')
  })

  it('honours the mediaType option', async () => {
    const { client, fake } = createTestClient({ body: {} }, { mediaType: 'plaintext' })

    await client.database.getRelease(1)

    expect(fake.lastRequest().headers.get('Accept')).toBe(
      'application/vnd.discogs.v2.plaintext+json'
    )
  })

  it('honours a custom baseUrl and strips its trailing slash', async () => {
    const { client, fake } = createTestClient(
      { body: {} },
      { baseUrl: 'https://proxy.example.com/api/' }
    )

    await client.database.getRelease(1)

    expect(fake.lastRequest().url.toString()).toBe('https://proxy.example.com/api/releases/1')
  })

  it('sends no Authorization header when unauthenticated', async () => {
    const { client, fake } = createTestClient({ body: {} })

    await client.database.getRelease(1)

    expect(fake.lastRequest().headers.get('Authorization')).toBeNull()
  })

  it('tracks rate-limit headers and reports them through onResponse', async () => {
    const onResponse = vi.fn()
    const { client } = createTestClient(
      {
        body: {},
        headers: {
          'X-Discogs-Ratelimit': '60',
          'X-Discogs-Ratelimit-Used': '13',
          'X-Discogs-Ratelimit-Remaining': '47'
        }
      },
      { onResponse }
    )

    expect(client.rateLimit).toBeNull()
    await client.database.getRelease(1)

    expect(client.rateLimit).toEqual({ limit: 60, used: 13, remaining: 47 })
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onResponse.mock.calls[0]?.[0]).toMatchObject({
      rateLimit: { limit: 60, used: 13, remaining: 47 }
    })
  })

  it('request() exposes the raw response alongside the parsed body', async () => {
    const { client } = createTestClient({
      body: { id: 1 },
      headers: { Link: '<https://api.discogs.com/x?page=2>; rel="next"' }
    })

    const { data, response, rateLimit } = await client.request<{ id: number }>({
      path: '/releases/1'
    })

    expect(data).toEqual({ id: 1 })
    expect(parseLinkHeader(response.headers.get('Link')).next).toBe(
      'https://api.discogs.com/x?page=2'
    )
    expect(rateLimit).toBeNull()
  })
})

describe('query serialization', () => {
  it('drops undefined and null but keeps false and 0', async () => {
    const fake = createFakeFetch({ body: {} })
    const client = new DiscogsClient({ userAgent: TEST_USER_AGENT, fetch: fake.fetch })

    await client.request({
      path: '/x',
      query: { a: undefined, b: null, c: false, d: 0, e: 'keep' }
    })

    const { url } = fake.lastRequest()
    expect(url.searchParams.has('a')).toBe(false)
    expect(url.searchParams.has('b')).toBe(false)
    expect(url.searchParams.get('c')).toBe('false')
    expect(url.searchParams.get('d')).toBe('0')
    expect(url.searchParams.get('e')).toBe('keep')
  })

  it('repeats the key for array values', async () => {
    const fake = createFakeFetch({ body: {} })
    const client = new DiscogsClient({ userAgent: TEST_USER_AGENT, fetch: fake.fetch })

    await client.request({ path: '/x', query: { genre: ['rock', 'pop'] } })

    expect(fake.lastRequest().url.searchParams.getAll('genre')).toEqual(['rock', 'pop'])
  })
})

describe('error mapping', () => {
  it.each([
    [401, DiscogsAuthenticationError],
    [403, DiscogsPermissionError],
    [404, DiscogsNotFoundError],
    [405, DiscogsMethodNotAllowedError],
    [422, DiscogsValidationError],
    [429, DiscogsRateLimitError],
    [500, DiscogsServerError],
    [503, DiscogsServerError]
  ])('maps %i to the matching error class', async (status, ErrorClass) => {
    const { client } = createTestClient({ status, body: { message: 'boom' } })

    await expect(client.database.getRelease(1)).rejects.toBeInstanceOf(ErrorClass)
  })

  it('uses the body message as the error message and keeps the status and body', async () => {
    const { client } = createTestClient({ status: 404, body: { message: 'Release not found.' } })

    const error = await client.database.getRelease(1).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(DiscogsNotFoundError)
    const discogsError = error as DiscogsNotFoundError
    expect(discogsError.message).toBe('Release not found.')
    expect(discogsError.status).toBe(404)
    expect(discogsError.body).toEqual({ message: 'Release not found.' })
    expect(discogsError.name).toBe('DiscogsNotFoundError')
  })

  it('falls back to the status text when the body carries no message', async () => {
    const { client } = createTestClient({ status: 418 })

    const error = (await client.database.getRelease(1).catch((e: unknown) => e)) as DiscogsError

    expect(error).toBeInstanceOf(DiscogsError)
    expect(error.message.length).toBeGreaterThan(0)
  })

  it('keeps a non-JSON error body as text', async () => {
    const { client } = createTestClient({ status: 500, text: '<html>nope</html>' })

    const error = (await client.database.getRelease(1).catch((e: unknown) => e)) as DiscogsError

    expect(error.body).toBe('<html>nope</html>')
  })

  it('attaches rate-limit state to a 429', async () => {
    const { client } = createTestClient({
      status: 429,
      body: { message: 'too many' },
      headers: {
        'X-Discogs-Ratelimit': '60',
        'X-Discogs-Ratelimit-Used': '60',
        'X-Discogs-Ratelimit-Remaining': '0'
      }
    })

    const error = (await client.database
      .getRelease(1)
      .catch((e: unknown) => e)) as DiscogsRateLimitError

    expect(error.rateLimit).toEqual({ limit: 60, used: 60, remaining: 0 })
  })
})

describe('parseRateLimit', () => {
  it('returns null when none of the headers are present', () => {
    expect(parseRateLimit(new Headers())).toBeNull()
  })

  it('defaults missing individual headers to zero', () => {
    const headers = new Headers({ 'X-Discogs-Ratelimit': '25' })
    expect(parseRateLimit(headers)).toEqual({ limit: 25, used: 0, remaining: 0 })
  })
})

describe('parseLinkHeader', () => {
  it('parses every relation Discogs sends', () => {
    const header = [
      '<https://api.discogs.com/artists/1/releases?page=3&per_page=75>; rel=next',
      '<https://api.discogs.com/artists/1/releases?page=1&per_page=75>; rel=first',
      '<https://api.discogs.com/artists/1/releases?page=30&per_page=75>; rel=last',
      '<https://api.discogs.com/artists/1/releases?page=1&per_page=75>; rel=prev'
    ].join(', ')

    expect(parseLinkHeader(header)).toEqual({
      next: 'https://api.discogs.com/artists/1/releases?page=3&per_page=75',
      first: 'https://api.discogs.com/artists/1/releases?page=1&per_page=75',
      last: 'https://api.discogs.com/artists/1/releases?page=30&per_page=75',
      prev: 'https://api.discogs.com/artists/1/releases?page=1&per_page=75'
    })
  })

  it('handles quoted rel values and returns an empty object for absent headers', () => {
    expect(parseLinkHeader('<https://x/1>; rel="next"')).toEqual({ next: 'https://x/1' })
    expect(parseLinkHeader(null)).toEqual({})
    expect(parseLinkHeader('garbage')).toEqual({})
  })
})
