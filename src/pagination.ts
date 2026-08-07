/**
 * Pagination helpers.
 *
 * Paginated endpoints accept `page` and `per_page` and return a `pagination` object in the
 * body. Discogs additionally sends an RFC 5988 `Link` header with `first` / `prev` / `next` /
 * `last` relations; {@link parseLinkHeader} reads it.
 *
 * @see https://www.discogs.com/developers/#page:home,header:home-pagination
 * @module
 */

import type { PaginationUrls } from './types/common.js'

/** Default number of items Discogs returns per page. */
export const DEFAULT_PER_PAGE = 50

/** Maximum number of items Discogs will return per page. */
export const MAX_PER_PAGE = 100

/**
 * Parses an RFC 5988 `Link` header into its `rel` relations.
 *
 * The same information is available in the body's `pagination.urls`, so this is mainly useful
 * when you are working with a raw {@link Response} from {@link DiscogsClient.request}.
 *
 * @param header - Raw `Link` header value, or `null` when absent.
 * @returns A map of relation name to URL. Empty when the header is absent or unparseable.
 *
 * @example
 * ```ts
 * parseLinkHeader('<https://api.discogs.com/artists/1/releases?page=2>; rel=next')
 * // → { next: 'https://api.discogs.com/artists/1/releases?page=2' }
 * ```
 */
export function parseLinkHeader(header: string | null | undefined): PaginationUrls {
  const urls: PaginationUrls = {}
  if (!header) return urls

  for (const part of header.split(',')) {
    const match = /<([^>]*)>\s*;\s*rel\s*=\s*"?([^";]+)"?/.exec(part.trim())
    if (!match) continue
    const [, url, rel] = match
    if (url === undefined || rel === undefined) continue

    switch (rel.trim()) {
      case 'first':
        urls.first = url
        break
      case 'prev':
        urls.prev = url
        break
      case 'next':
        urls.next = url
        break
      case 'last':
        urls.last = url
        break
      default:
        break
    }
  }

  return urls
}
