/**
 * Test harness: a fake `fetch` that records the requests made against it.
 *
 * Every endpoint test drives the real client through this, so the assertions cover the URL,
 * method, headers and body that would actually go out over the wire.
 */

import { DiscogsClient, type DiscogsClientConfig } from '../src/index.js'

/** A request captured by the fake fetch. */
export interface CapturedRequest {
  method: string
  url: URL
  /** Path plus query string, e.g. `/releases/1?curr_abbr=EUR`. */
  target: string
  headers: Headers
  init: RequestInit
  body: BodyInit | null | undefined
}

/** How the fake fetch should answer. */
export interface FakeResponseSpec {
  status?: number
  body?: unknown
  /** Send the body as raw text rather than JSON. */
  text?: string
  headers?: Record<string, string>
}

/** A fake fetch plus the log of requests it has seen. */
export interface FakeFetch {
  fetch: typeof globalThis.fetch
  requests: CapturedRequest[]
  /** The single request made, asserting exactly one was. */
  lastRequest(): CapturedRequest
  /** The parsed JSON body of the single request made. */
  lastJsonBody(): unknown
}

/** Builds a fake fetch that answers every call with `spec`. */
export function createFakeFetch(spec: FakeResponseSpec = {}): FakeFetch {
  const requests: CapturedRequest[] = []

  const fetch: typeof globalThis.fetch = (input, init) => {
    // The client always calls fetch with a string URL.
    const url = new URL(input as string)
    requests.push({
      method: init?.method ?? 'GET',
      url,
      target: `${url.pathname}${url.search}`,
      headers: new Headers(init?.headers),
      init: init ?? {},
      body: init?.body
    })

    const status = spec.status ?? 200
    const headers = new Headers(spec.headers)

    let body: string | null = null
    if (spec.text !== undefined) {
      body = spec.text
    } else if (spec.body !== undefined) {
      body = JSON.stringify(spec.body)
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    }

    // 204 and 304 must not carry a body.
    if (status === 204 || status === 304) body = null

    return Promise.resolve(new Response(body, { status, headers }))
  }

  return {
    fetch,
    requests,
    lastRequest() {
      if (requests.length !== 1) {
        throw new Error(`Expected exactly 1 request, got ${String(requests.length)}`)
      }
      return requests[0]!
    },
    lastJsonBody(): unknown {
      const { body } = this.lastRequest()
      if (typeof body !== 'string') throw new Error('Request body was not a JSON string')
      return JSON.parse(body) as unknown
    }
  }
}

/** Test user agent, shaped the way Discogs asks for. */
export const TEST_USER_AGENT = 'DiscogsTsTest/0.1 +https://example.com'

/** Builds a client wired to a fake fetch, and returns both. */
export function createTestClient(
  spec: FakeResponseSpec = {},
  config: Partial<DiscogsClientConfig> = {}
): { client: DiscogsClient; fake: FakeFetch } {
  const fake = createFakeFetch(spec)
  const client = new DiscogsClient({
    userAgent: TEST_USER_AGENT,
    fetch: fake.fetch,
    ...config
  })
  return { client, fake }
}
