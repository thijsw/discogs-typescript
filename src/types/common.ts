/**
 * Shared primitives that appear across many Discogs resources.
 *
 * @module
 */

/**
 * Currency codes accepted by the `curr_abbr` parameter and returned in price objects.
 *
 * @see https://www.discogs.com/developers/#page:database,header:database-release
 */
export type Currency =
  'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'MXN' | 'BRL' | 'NZD' | 'SEK' | 'ZAR'

/** Every {@link Currency} value, in the order the Discogs docs list them. */
export const CURRENCIES: readonly Currency[] = [
  'USD',
  'GBP',
  'EUR',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'MXN',
  'BRL',
  'NZD',
  'SEK',
  'ZAR'
]

/** Sort direction accepted by every endpoint that takes a `sort` parameter. */
export type SortOrder = 'asc' | 'desc'

/** Pagination parameters accepted by every paginated endpoint. */
export interface PaginationParams {
  /** 1-based page number. Defaults to `1`. */
  page?: number
  /** Items per page. Defaults to `50`, maximum `100`. */
  per_page?: number
}

/** Links to other pages of a paginated result. May be an empty object on single-page results. */
export interface PaginationUrls {
  first?: string
  prev?: string
  next?: string
  last?: string
}

/** The `pagination` object attached to every paginated response. */
export interface Pagination {
  /** The page currently being viewed. */
  page: number
  /** Total number of pages available. */
  pages: number
  /** Total number of items across all pages. */
  items: number
  /** Number of items on each page. */
  per_page: number
  urls: PaginationUrls
}

/**
 * A paginated response envelope.
 *
 * Discogs names the collection key differently per endpoint (`releases`, `listings`, `wants`,
 * `items`, …), so the key is a type parameter.
 *
 * @typeParam K - Name of the key holding the collection.
 * @typeParam T - Element type of the collection.
 */
export type Paginated<K extends string, T> = { pagination: Pagination } & {
  [P in K]: T[]
}

/** A monetary amount as returned by most Marketplace endpoints. */
export interface Price {
  currency: Currency
  value: number
}

/**
 * A monetary amount in the *seller's* original currency, returned alongside the converted
 * {@link Price} on listing resources.
 */
export interface OriginalPrice {
  curr_abbr: Currency
  curr_id: number
  formatted: string
  value: number
}

/**
 * A user-contributed image.
 *
 * Image URLs are signed and only present when the request is authenticated (a consumer
 * key/secret pair is sufficient). Never construct these URLs yourself — altering any part of
 * them results in a 404.
 */
export interface Image {
  type: 'primary' | 'secondary'
  uri: string
  /** 150px thumbnail variant. */
  uri150: string
  resource_url: string
  width: number
  height: number
}

/** An embedded video (usually YouTube) attached to a release, master or artist. */
export interface Video {
  uri: string
  title: string
  description: string
  /** Duration in seconds. */
  duration: number
  embed: boolean
}

/** Minimal reference to a user, as embedded in other resources. */
export interface UserRef {
  username: string
  resource_url: string
}

/** Reference to a user that also carries their numeric id. */
export interface UserIdRef extends UserRef {
  id: number
}

/**
 * Data-quality marker set by the Discogs community, e.g. `"Correct"`, `"Needs Vote"`,
 * `"Complete and Correct"`. Not exhaustively enumerated by the API docs, so left as a string.
 */
export type DataQuality = string

/** Submission status of a database entry, e.g. `"Accepted"`. */
export type SubmissionStatus = string

/** An artist credit as embedded in releases, masters and tracklists. */
export interface ArtistCredit {
  id: number
  name: string
  /** Artist name variation used on this particular release; empty when the canonical name is used. */
  anv: string
  /** Text joining this credit to the next one, e.g. `"&"` or `","`. */
  join: string
  /** Credited role, e.g. `"Design"`, `"Written-By, Producer"`. Empty for main artists. */
  role: string
  /** Tracks this credit applies to; empty when it applies to the whole release. */
  tracks: string
  resource_url: string
  /** @remarks Undocumented; returned by the live API on some resources. */
  thumbnail_url?: string
}

/** A label credit as embedded in releases. */
export interface LabelCredit {
  id: number
  name: string
  /** Catalogue number for this release on this label. */
  catno: string
  entity_type: string
  /** @remarks Present on some resources only (e.g. collection/wantlist basic information). */
  entity_type_name?: string
  resource_url: string
  /** @remarks Undocumented; returned by the live API on some resources. */
  thumbnail_url?: string
}

/** A company credit (pressing plant, copyright holder, distributor, …). */
export interface CompanyCredit {
  id: number
  name: string
  catno: string
  entity_type: string
  entity_type_name: string
  resource_url: string
  /** @remarks Undocumented; returned by the live API on some resources. */
  thumbnail_url?: string
}

/** A physical or digital format descriptor. */
export interface Format {
  name: string
  /** Quantity of this format, as a string (e.g. `"1"`, `"2"`). */
  qty: string
  /** Free-form text qualifier, e.g. `"Digipak"`. */
  text?: string
  descriptions?: string[]
}

/** A barcode, matrix number, rights-society code, or similar identifier. */
export interface Identifier {
  type: string
  value: string
  /** @remarks Optional; present when the submitter added a qualifier. */
  description?: string
}

/** A single entry in a release or master tracklist. */
export interface Track {
  position: string
  /** Trailing underscore is part of the wire format. Usually `"track"` or `"heading"`. */
  type_: string
  title: string
  duration: string
  artists?: ArtistCredit[]
  extraartists?: ArtistCredit[]
}

/** An entry in the `series` array of a release. */
export interface SeriesEntry {
  id: number
  name: string
  catno: string
  entity_type: string
  entity_type_name?: string
  resource_url: string
  /** @remarks Undocumented; returned by the live API on some resources. */
  thumbnail_url?: string
}

/** Aggregate community rating for a release. */
export interface CommunityRating {
  average: number
  count: number
}

/** Community metadata attached to a release. */
export interface ReleaseCommunity {
  have: number
  want: number
  rating: CommunityRating
  status: SubmissionStatus
  data_quality: DataQuality
  submitter: UserRef
  contributors: UserRef[]
}

/**
 * The error payload Discogs returns for every non-2xx response.
 *
 * @example `{ "message": "Release not found." }`
 */
export interface DiscogsErrorBody {
  message: string
}

/**
 * Rate-limit state parsed from the `X-Discogs-Ratelimit*` response headers.
 *
 * Discogs throttles by source IP over a rolling 60-second window: 60 requests per minute when
 * authenticated, 25 when not.
 *
 * @see https://www.discogs.com/developers/#page:home,header:home-rate-limiting
 */
export interface RateLimit {
  /** Total number of requests permitted in the current one-minute window. */
  limit: number
  /** Requests already made in the current window. */
  used: number
  /** Requests still available in the current window. */
  remaining: number
}
