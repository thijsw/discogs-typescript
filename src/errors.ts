/**
 * Error types thrown by the client.
 *
 * Every non-2xx Discogs response is turned into a {@link DiscogsError} (or one of its
 * subclasses). Discogs error bodies are always of the form `{ "message": "…" }`, and that
 * message becomes the error's message when present.
 *
 * @module
 */

import type { RateLimit } from './types/common.js'

/** Options carried by every {@link DiscogsError}. */
export interface DiscogsErrorOptions {
  /** HTTP status code of the failing response. */
  status: number
  /** The raw response, in case you need headers or want to re-read the body. */
  response: Response
  /** Parsed response body, when it could be read. */
  body?: unknown
}

/**
 * Base class for every error the client throws for a failed API response.
 *
 * Use `instanceof DiscogsError` to catch all of them, or one of the subclasses below to
 * handle a specific status.
 */
export class DiscogsError extends Error {
  /** HTTP status code of the failing response. */
  readonly status: number
  /** The raw response object. */
  readonly response: Response
  /** Parsed response body, when it could be read. */
  readonly body: unknown

  constructor(message: string, options: DiscogsErrorOptions) {
    super(message)
    this.name = new.target.name
    this.status = options.status
    this.response = options.response
    this.body = options.body
  }
}

/** 401 — the resource requires authentication, or the supplied credentials were rejected. */
export class DiscogsAuthenticationError extends DiscogsError {}

/** 403 — authenticated, but not allowed to access or modify this resource. */
export class DiscogsPermissionError extends DiscogsError {}

/** 404 — the resource does not exist. */
export class DiscogsNotFoundError extends DiscogsError {}

/** 405 — the HTTP verb is not supported for this resource (e.g. `PUT /artists/1`). */
export class DiscogsMethodNotAllowedError extends DiscogsError {}

/**
 * 422 — the request was well-formed but semantically wrong: a missing or mistyped parameter,
 * an invalid enum value, or a nonsensical action.
 */
export class DiscogsValidationError extends DiscogsError {}

/**
 * 429 — the rate limit was exceeded.
 *
 * Discogs allows 60 requests per minute when authenticated and 25 when not, measured as a
 * moving average over a 60-second window per source IP. Inspect
 * {@link DiscogsRateLimitError.rateLimit} to see where you stand.
 */
export class DiscogsRateLimitError extends DiscogsError {
  /** Rate-limit headers from the rejected response, when present. */
  readonly rateLimit: RateLimit | null

  constructor(message: string, options: DiscogsErrorOptions & { rateLimit?: RateLimit | null }) {
    super(message, options)
    this.rateLimit = options.rateLimit ?? null
  }
}

/**
 * 5xx — Discogs failed to handle the request.
 *
 * For a 500 the `message` in the body is an error code you can quote to Discogs Support.
 */
export class DiscogsServerError extends DiscogsError {}

/**
 * Extracts the human-readable message from a Discogs error body.
 *
 * @internal
 */
function extractMessage(body: unknown, response: Response): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body
    if (typeof message === 'string' && message.length > 0) return message
  }
  if (typeof body === 'string' && body.trim().length > 0) return body.trim()
  return response.statusText || `Request failed with status ${String(response.status)}`
}

/**
 * Builds the appropriate {@link DiscogsError} subclass for a failed response.
 *
 * @internal
 */
export function createDiscogsError(
  response: Response,
  body: unknown,
  rateLimit: RateLimit | null
): DiscogsError {
  const message = extractMessage(body, response)
  const options: DiscogsErrorOptions = { status: response.status, response, body }

  switch (response.status) {
    case 401:
      return new DiscogsAuthenticationError(message, options)
    case 403:
      return new DiscogsPermissionError(message, options)
    case 404:
      return new DiscogsNotFoundError(message, options)
    case 405:
      return new DiscogsMethodNotAllowedError(message, options)
    case 422:
      return new DiscogsValidationError(message, options)
    case 429:
      return new DiscogsRateLimitError(message, { ...options, rateLimit })
    default:
      if (response.status >= 500) return new DiscogsServerError(message, options)
      return new DiscogsError(message, options)
  }
}
