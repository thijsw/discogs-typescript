/**
 * The HTTP transport: URL building, query serialization, header assembly and response
 * handling.
 *
 * @module
 */

import type { AuthStrategy } from './auth/types.js'
import { createDiscogsError } from './errors.js'
import { parseRateLimit } from './rate-limit.js'
import type { RateLimit } from './types/common.js'

/** Query-string values the serializer knows how to render. */
export type QueryValue = string | number | boolean | null | undefined | Array<string | number>

/** A bag of query-string parameters. `null` and `undefined` values are dropped. */
export type QueryParams = Record<string, QueryValue>

/** The three response representations Discogs offers, selected via the `Accept` header. */
export type MediaType = 'discogs' | 'html' | 'plaintext'

/** HTTP verbs used by the Discogs API. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Options for a single request. */
export interface RequestOptions {
  method?: HttpMethod
  /** Path relative to the base URL, e.g. `"/releases/249504"`. */
  path: string
  query?: QueryParams
  /** Body to send as JSON. Mutually exclusive with `formData`. */
  body?: unknown
  /** Body to send as `multipart/form-data`. Mutually exclusive with `body`. */
  formData?: FormData
  /** Extra headers, merged over the defaults. */
  headers?: HeadersInit
  /** Aborts the request. */
  signal?: AbortSignal
  /**
   * How to read the response body. `"json"` parses JSON, `"text"` returns the raw string,
   * `"none"` skips reading entirely and leaves the body for you.
   */
  responseType?: 'json' | 'text' | 'none'
}

/** A response with its parsed body and the metadata that came with it. */
export interface DiscogsResponse<T> {
  /** The parsed response body. `null` for `204 No Content` and `304 Not Modified`. */
  data: T
  /** The raw response, for headers such as `Location` and `Last-Modified`. */
  response: Response
  /** Rate-limit state from this response, or `null` when the headers were absent. */
  rateLimit: RateLimit | null
}

/** Everything the transport needs to build and send a request. */
export interface HttpClientConfig {
  baseUrl: string
  userAgent: string
  mediaType: MediaType
  auth: AuthStrategy | null
  fetch: typeof globalThis.fetch
  onResponse?: ((info: { response: Response; rateLimit: RateLimit | null }) => void) | undefined
}

/**
 * Appends parameters to a URL's query string, skipping `null` and `undefined` and repeating
 * the key for array values.
 *
 * @internal
 */
export function appendQuery(url: URL, query: QueryParams | undefined): void {
  if (!query) return

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item))
    } else {
      url.searchParams.append(key, String(value))
    }
  }
}

/**
 * Percent-encodes a value for use as a single path segment.
 *
 * Usernames may contain characters such as `.` and `+` that must survive the round trip.
 *
 * @internal
 */
export function encodePathSegment(value: string | number): string {
  return encodeURIComponent(String(value))
}

/**
 * Sends a request to the Discogs API and returns the parsed body plus its metadata.
 *
 * Non-2xx responses are thrown as a {@link DiscogsError}. `304 Not Modified` is treated as a
 * success with a `null` body, so conditional requests against the inventory export and upload
 * status endpoints work as intended.
 *
 * @internal
 */
export async function sendRequest<T>(
  config: HttpClientConfig,
  options: RequestOptions
): Promise<DiscogsResponse<T>> {
  const method = options.method ?? 'GET'
  const url = new URL(options.path.replace(/^\//, ''), `${config.baseUrl}/`)
  appendQuery(url, options.query)

  const headers = new Headers(options.headers)
  headers.set('User-Agent', config.userAgent)
  if (!headers.has('Accept')) {
    headers.set('Accept', `application/vnd.discogs.v2.${config.mediaType}+json`)
  }

  let body: BodyInit | undefined
  if (options.formData) {
    // Let fetch set the multipart boundary itself.
    body = options.formData
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body)
    headers.set('Content-Type', 'application/json')
  }

  // Signing must happen after the query string is final, since query parameters participate
  // in the OAuth signature base string.
  await config.auth?.authorize({ method, url, headers })

  const init: RequestInit = { method, headers }
  if (body !== undefined) init.body = body
  if (options.signal) init.signal = options.signal

  const response = await config.fetch(url.toString(), init)
  const rateLimit = parseRateLimit(response.headers)
  config.onResponse?.({ response, rateLimit })

  const responseType = options.responseType ?? 'json'

  // `response.ok` is false for 304, but a conditional request that hits the cache succeeded.
  if (response.status === 304) {
    return { data: null as T, response, rateLimit }
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response)
    throw createDiscogsError(response, errorBody, rateLimit)
  }

  if (responseType === 'none' || response.status === 204) {
    return { data: null as T, response, rateLimit }
  }

  if (responseType === 'text') {
    return { data: (await response.text()) as T, response, rateLimit }
  }

  const text = await response.text()
  if (text.length === 0) {
    return { data: null as T, response, rateLimit }
  }

  return { data: JSON.parse(text) as T, response, rateLimit }
}

/**
 * Reads a failed response's body as JSON, falling back to text, and to `undefined` when the
 * body cannot be read at all.
 *
 * @internal
 */
async function readErrorBody(response: Response): Promise<unknown> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return undefined
  }

  if (text.length === 0) return undefined

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
