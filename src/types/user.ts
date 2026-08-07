/**
 * Types for the User Identity section of the Discogs API.
 *
 * @see https://www.discogs.com/developers/#page:user-identity
 * @module
 */

import type { Currency, Paginated, Pagination, PaginationParams, SortOrder } from './common.js'
import type { Release } from './database.js'

/**
 * Basic information about the authenticated user.
 *
 * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-identity
 */
export interface Identity {
  id: number
  username: string
  resource_url: string
  /** The name of the application whose credentials made the request. */
  consumer_name: string
}

/**
 * A user profile.
 *
 * `email` is only returned when authenticated as this user. `num_collection` and
 * `num_wantlist` are only returned when authenticated as this user or when the respective
 * list is public, and `num_lists` only counts private lists for the owner.
 *
 * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-profile
 */
export interface UserProfile {
  id: number
  username: string
  /** The user's real name. */
  name?: string
  /** Only visible when authenticated as this user. */
  email?: string
  /** Profile text, which may contain BBCode. */
  profile: string
  home_page: string
  location: string
  /** ISO 8601 registration timestamp. */
  registered: string
  rank: number
  uri: string
  resource_url: string
  inventory_url: string
  wantlist_url: string
  collection_folders_url: string
  collection_fields_url: string
  avatar_url: string
  /** @remarks Not returned by the profile-edit endpoint. */
  banner_url?: string
  num_lists: number
  num_for_sale: number
  num_collection?: number
  num_wantlist?: number
  num_pending: number
  releases_contributed: number
  releases_rated: number
  rating_avg: number
  /** The user's preferred currency. Not returned by the profile-edit endpoint. */
  curr_abbr?: Currency
  buyer_rating?: number
  buyer_rating_stars?: number
  buyer_num_ratings?: number
  seller_rating?: number
  seller_rating_stars?: number
  seller_num_ratings?: number
  /** @remarks Undocumented; returned by the live API. Unread message count, owner only. */
  num_unread?: number
  /** @remarks Undocumented; returned by the live API. */
  activated?: boolean
  /** @remarks Undocumented; returned by the live API. */
  marketplace_suspended?: boolean
  /** @remarks Undocumented; returned by the live API. */
  is_staff?: boolean
  /** @remarks Undocumented; returned by the live API. */
  seller_payment_disabled?: boolean
}

/** Body accepted by {@link UserResource.editProfile}. All fields are optional. */
export interface EditProfileParams {
  /** The user's real name. */
  name?: string
  home_page?: string
  location?: string
  profile?: string
  curr_abbr?: Currency
}

/** An artist entry in a user's submissions. */
export interface SubmissionArtist {
  id: number
  name: string
  namevariations: string[]
  data_quality: string
  releases_url: string
  resource_url: string
  uri: string
}

/** A label entry in a user's submissions. */
export interface SubmissionLabel {
  id: number
  name: string
  profile?: string
  releases_url: string
  resource_url: string
  uri: string
  data_quality: string
}

/** The database entries a user has submitted, grouped by resource type. */
export interface Submissions {
  artists: SubmissionArtist[]
  labels: SubmissionLabel[]
  releases: Release[]
}

/**
 * Response of {@link UserResource.getSubmissions}.
 *
 * Unlike other paginated endpoints the collection key holds an object grouping three arrays,
 * not a single array, so {@link Paginated} does not apply here.
 */
export interface SubmissionsResponse {
  pagination: Pagination
  submissions: Submissions
}

/** Sort keys accepted by {@link UserResource.getContributions}. */
export type ContributionSort =
  'label' | 'artist' | 'title' | 'catno' | 'format' | 'rating' | 'year' | 'added'

/** Query parameters for {@link UserResource.getContributions}. */
export interface GetContributionsParams extends PaginationParams {
  sort?: ContributionSort
  sort_order?: SortOrder
}

/** Response of {@link UserResource.getContributions}. */
export type ContributionsResponse = Paginated<'contributions', Release>
