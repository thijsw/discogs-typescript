/**
 * Parsing of the `X-Discogs-Ratelimit*` response headers.
 *
 * @see https://www.discogs.com/developers/#page:home,header:home-rate-limiting
 * @module
 */

import type { RateLimit } from './types/common.js'

/** Header carrying the total request allowance for the current window. */
export const RATE_LIMIT_HEADER = 'X-Discogs-Ratelimit'
/** Header carrying the number of requests already used in the current window. */
export const RATE_LIMIT_USED_HEADER = 'X-Discogs-Ratelimit-Used'
/** Header carrying the number of requests still available in the current window. */
export const RATE_LIMIT_REMAINING_HEADER = 'X-Discogs-Ratelimit-Remaining'

function readInt(headers: Headers, name: string): number | null {
  const raw = headers.get(name)
  if (raw === null) return null
  const value = Number.parseInt(raw, 10)
  return Number.isNaN(value) ? null : value
}

/**
 * Reads the rate-limit headers off a response.
 *
 * @returns The parsed rate-limit state, or `null` when the headers are absent — which happens
 * on endpoints Discogs does not throttle, and on responses served from a cache.
 */
export function parseRateLimit(headers: Headers): RateLimit | null {
  const limit = readInt(headers, RATE_LIMIT_HEADER)
  const used = readInt(headers, RATE_LIMIT_USED_HEADER)
  const remaining = readInt(headers, RATE_LIMIT_REMAINING_HEADER)

  if (limit === null && used === null && remaining === null) return null

  return {
    limit: limit ?? 0,
    used: used ?? 0,
    remaining: remaining ?? 0
  }
}
