/**
 * Types for the Database section of the Discogs API.
 *
 * @see https://www.discogs.com/developers/#page:database
 * @module
 */

import type {
  ArtistCredit,
  CommunityRating,
  CompanyCredit,
  Currency,
  DataQuality,
  Format,
  Identifier,
  Image,
  LabelCredit,
  Paginated,
  PaginationParams,
  ReleaseCommunity,
  SeriesEntry,
  SortOrder,
  SubmissionStatus,
  Track,
  Video
} from './common.js'

/* -------------------------------------------------------------------------- */
/* Release                                                                     */
/* -------------------------------------------------------------------------- */

/** Query parameters for {@link DatabaseResource.getRelease}. */
export interface GetReleaseParams {
  /**
   * Currency for marketplace data (`lowest_price`). Defaults to the authenticated user's
   * currency, or USD when unauthenticated.
   */
  curr_abbr?: Currency
}

/**
 * A release — a particular physical or digital object released by one or more artists.
 *
 * @see https://www.discogs.com/developers/#page:database,header:database-release
 */
export interface Release {
  id: number
  title: string
  status: SubmissionStatus
  data_quality: DataQuality
  resource_url: string
  uri: string
  artists: ArtistCredit[]
  /** @remarks Undocumented; returned by the live API. Artists joined into a sortable string. */
  artists_sort?: string
  extraartists?: ArtistCredit[]
  labels: LabelCredit[]
  companies: CompanyCredit[]
  series: SeriesEntry[]
  formats: Format[]
  format_quantity: number
  identifiers: Identifier[]
  genres: string[]
  styles?: string[]
  tracklist: Track[]
  images?: Image[]
  videos?: Video[]
  community: ReleaseCommunity
  country?: string
  released?: string
  released_formatted?: string
  year: number
  notes?: string
  /** Estimated shipping weight in grams. */
  estimated_weight?: number
  date_added: string
  date_changed: string
  master_id?: number
  master_url?: string
  thumb: string
  num_for_sale: number
  lowest_price: number | null
  /** @remarks Undocumented; returned by the live API. */
  blocked_from_sale?: boolean
  /** @remarks Undocumented; returned by the live API. */
  is_offensive?: boolean
}

/** A user's rating of a release. */
export interface ReleaseRating {
  username: string
  release_id: number
  /** 1–5, or `0` when the user has not rated the release. */
  rating: number
}

/** Aggregate community rating for a release. */
export interface CommunityReleaseRating {
  release_id: number
  rating: CommunityRating
}

/**
 * "Have" and "want" counts for a release.
 *
 * @remarks Both fields may be absent for blocked releases; the live API also returns
 * `is_offensive` on this endpoint.
 */
export interface ReleaseStats {
  num_have?: number
  num_want?: number
  /** @remarks Undocumented; returned by the live API. */
  is_offensive?: boolean
}

/* -------------------------------------------------------------------------- */
/* Master release                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A master release — the abstract "album" that groups together all its versions.
 *
 * @see https://www.discogs.com/developers/#page:database,header:database-master-release
 */
export interface Master {
  id: number
  title: string
  resource_url: string
  uri: string
  versions_url: string
  main_release: number
  main_release_url: string
  artists: ArtistCredit[]
  genres: string[]
  styles?: string[]
  tracklist: Track[]
  images?: Image[]
  videos?: Video[]
  year: number
  data_quality: DataQuality
  num_for_sale: number
  lowest_price: number | null
  /** @remarks Undocumented; returned by the live API. */
  most_recent_release?: number
  /** @remarks Undocumented; returned by the live API. */
  most_recent_release_url?: string
}

/** Sort keys accepted by {@link DatabaseResource.getMasterVersions}. */
export type MasterVersionSort = 'released' | 'title' | 'format' | 'label' | 'catno' | 'country'

/** Query parameters for {@link DatabaseResource.getMasterVersions}. */
export interface GetMasterVersionsParams extends PaginationParams {
  /** Filter by format, e.g. `"Vinyl"`. */
  format?: string
  /** Filter by label, e.g. `"Scorpio Music"`. */
  label?: string
  /** Filter by release year, e.g. `"1992"`. */
  released?: string
  /** Filter by country, e.g. `"Belgium"`. */
  country?: string
  sort?: MasterVersionSort
  sort_order?: SortOrder
}

/** Collection/wantlist counts for a master version, split by viewer and community. */
export interface MasterVersionStats {
  user: { in_collection: number; in_wantlist: number }
  community: { in_collection: number; in_wantlist: number }
}

/** One release that is a version of a master release. */
export interface MasterVersion {
  id: number
  title: string
  status: SubmissionStatus
  resource_url: string
  thumb: string
  format: string
  major_formats: string[]
  label: string
  catno: string
  country: string
  released: string
  stats: MasterVersionStats
}

/** Response of {@link DatabaseResource.getMasterVersions}. */
export type MasterVersionsResponse = Paginated<'versions', MasterVersion>

/* -------------------------------------------------------------------------- */
/* Artist                                                                      */
/* -------------------------------------------------------------------------- */

/** A member of a band, as listed on an {@link Artist}. */
export interface ArtistMember {
  id: number
  name: string
  active: boolean
  resource_url: string
  /** @remarks Undocumented; returned by the live API. */
  thumbnail_url?: string
}

/**
 * An artist — a person or group credited on releases.
 *
 * @see https://www.discogs.com/developers/#page:database,header:database-artist
 */
export interface Artist {
  id: number
  name: string
  resource_url: string
  uri: string
  releases_url: string
  profile: string
  data_quality: DataQuality
  namevariations?: string[]
  urls?: string[]
  images?: Image[]
  members?: ArtistMember[]
  /** @remarks Undocumented; returned by the live API for artists with aliases. */
  aliases?: ArtistMember[]
  /** @remarks Undocumented; returned by the live API for artists who are group members. */
  groups?: ArtistMember[]
  /** @remarks Undocumented; returned by the live API. */
  realname?: string
}

/** Sort keys accepted by {@link DatabaseResource.getArtistReleases}. */
export type ArtistReleaseSort = 'year' | 'title' | 'format'

/** Query parameters for {@link DatabaseResource.getArtistReleases}. */
export interface GetArtistReleasesParams extends PaginationParams {
  sort?: ArtistReleaseSort
  sort_order?: SortOrder
}

/** Fields shared by both variants of {@link ArtistRelease}. */
interface ArtistReleaseBase {
  id: number
  title: string
  artist: string
  /** Credited role, e.g. `"Main"`, `"Appearance"`, `"TrackAppearance"`. */
  role: string
  resource_url: string
  thumb: string
  year: number
}

/** A master release in an artist's discography. */
export interface ArtistMasterRelease extends ArtistReleaseBase {
  type: 'master'
  main_release: number
}

/** A single release in an artist's discography. */
export interface ArtistSingleRelease extends ArtistReleaseBase {
  type: 'release'
  status: SubmissionStatus
  format: string
  label: string
  /** @remarks Undocumented; returned by the live API. */
  stats?: MasterVersionStats
}

/**
 * An entry in an artist's discography — either a master or an individual release,
 * discriminated by the `type` field.
 */
export type ArtistRelease = ArtistMasterRelease | ArtistSingleRelease

/** Response of {@link DatabaseResource.getArtistReleases}. */
export type ArtistReleasesResponse = Paginated<'releases', ArtistRelease>

/* -------------------------------------------------------------------------- */
/* Label                                                                       */
/* -------------------------------------------------------------------------- */

/** A sublabel or parent label reference. */
export interface LabelRef {
  id: number
  name: string
  resource_url: string
}

/**
 * A label — a company or imprint that released records.
 *
 * @see https://www.discogs.com/developers/#page:database,header:database-label
 */
export interface Label {
  id: number
  name: string
  resource_url: string
  uri: string
  releases_url: string
  profile: string
  data_quality: DataQuality
  contact_info?: string
  urls?: string[]
  images?: Image[]
  sublabels?: LabelRef[]
  /** @remarks Undocumented; present when the label is itself a sublabel. */
  parent_label?: LabelRef
}

/** One release on a label. */
export interface LabelRelease {
  id: number
  title: string
  artist: string
  catno: string
  format: string
  status: SubmissionStatus
  resource_url: string
  thumb: string
  year: number
  /** @remarks Undocumented; returned by the live API. */
  stats?: MasterVersionStats
}

/** Response of {@link DatabaseResource.getLabelReleases}. */
export type LabelReleasesResponse = Paginated<'releases', LabelRelease>

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

/** Resource types that can be searched. */
export type SearchType = 'release' | 'master' | 'artist' | 'label'

/**
 * Query parameters for {@link DatabaseResource.search}.
 *
 * Every field is optional, but at least one should be supplied for a meaningful result.
 *
 * @see https://www.discogs.com/developers/#page:database,header:database-search
 */
export interface SearchParams extends PaginationParams {
  /** Free-text search query. Sent on the wire as `q`. */
  q?: string
  /** Restrict results to a single resource type. */
  type?: SearchType
  /** Search the combined `"Artist Name - Release Title"` field. */
  title?: string
  /** Search release titles. */
  release_title?: string
  /** Search release credits. */
  credit?: string
  /** Search artist names. */
  artist?: string
  /** Search artist name variations (ANV). */
  anv?: string
  /** Search label names. */
  label?: string
  /** Search genres. */
  genre?: string
  /** Search styles. */
  style?: string
  /** Search release country. */
  country?: string
  /** Search release year. */
  year?: string | number
  /** Search formats. */
  format?: string
  /** Search catalogue numbers. */
  catno?: string
  /** Search barcodes. */
  barcode?: string
  /** Search track titles. */
  track?: string
  /** Search by submitter username. */
  submitter?: string
  /** Search by contributor username. */
  contributor?: string
}

/**
 * A single search result.
 *
 * Which fields are populated depends on the `type` of the result, so nearly everything is
 * optional.
 */
export interface SearchResult {
  id: number
  type: SearchType
  title: string
  uri: string
  resource_url: string
  thumb: string
  /** @remarks Undocumented; returned by the live API. */
  cover_image?: string
  /** Release year as a string — Discogs does not return a number here. */
  year?: string
  country?: string
  catno?: string
  label?: string[]
  genre?: string[]
  style?: string[]
  format?: string[]
  barcode?: string[]
  community?: { want: number; have: number }
  /** @remarks Undocumented; returned by the live API for release results. */
  master_id?: number | null
  /** @remarks Undocumented; returned by the live API for release results. */
  master_url?: string | null
  /** @remarks Undocumented; returned by the live API for release results. */
  formats?: Format[]
  /** @remarks Undocumented; returned by the live API when authenticated. */
  user_data?: { in_wantlist: boolean; in_collection: boolean }
}

/** Response of {@link DatabaseResource.search}. */
export type SearchResponse = Paginated<'results', SearchResult>
