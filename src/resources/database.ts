/**
 * The Database section: releases, masters, artists, labels and search.
 *
 * @see https://www.discogs.com/developers/#page:database
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type {
  Artist,
  ArtistReleasesResponse,
  CommunityReleaseRating,
  GetArtistReleasesParams,
  GetMasterVersionsParams,
  GetReleaseParams,
  Label,
  LabelReleasesResponse,
  Master,
  MasterVersionsResponse,
  Release,
  ReleaseRating,
  ReleaseStats,
  SearchParams,
  SearchResponse
} from '../types/database.js'
import type { PaginationParams } from '../types/common.js'

/**
 * Database endpoints.
 *
 * Reachable as `client.database`.
 */
export class DatabaseResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Gets a release.
   *
   * @param releaseId - The release id.
   * @param params - Optional currency for the embedded marketplace data.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-release
   */
  getRelease(releaseId: number, params: GetReleaseParams = {}): Promise<Release> {
    return this.#client.requestData<Release>({
      path: `/releases/${encodePathSegment(releaseId)}`,
      query: params as QueryParams
    })
  }

  /**
   * Gets a particular user's rating of a release.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-release-rating-by-user
   */
  getReleaseRating(releaseId: number, username: string): Promise<ReleaseRating> {
    return this.#client.requestData<ReleaseRating>({
      path: `/releases/${encodePathSegment(releaseId)}/rating/${encodePathSegment(username)}`
    })
  }

  /**
   * Sets a user's rating of a release. Requires authentication as that user.
   *
   * @param rating - The new rating, between 1 and 5.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-release-rating-by-user
   */
  updateReleaseRating(releaseId: number, username: string, rating: number): Promise<ReleaseRating> {
    return this.#client.requestData<ReleaseRating>({
      method: 'PUT',
      path: `/releases/${encodePathSegment(releaseId)}/rating/${encodePathSegment(username)}`,
      body: { rating }
    })
  }

  /**
   * Deletes a user's rating of a release. Requires authentication as that user.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-release-rating-by-user
   */
  deleteReleaseRating(releaseId: number, username: string): Promise<void> {
    return this.#client.requestData<void>({
      method: 'DELETE',
      path: `/releases/${encodePathSegment(releaseId)}/rating/${encodePathSegment(username)}`,
      responseType: 'none'
    })
  }

  /**
   * Gets the community's average rating and rating count for a release.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-community-release-rating
   */
  getCommunityReleaseRating(releaseId: number): Promise<CommunityReleaseRating> {
    return this.#client.requestData<CommunityReleaseRating>({
      path: `/releases/${encodePathSegment(releaseId)}/rating`
    })
  }

  /**
   * Gets the "have" and "want" counts for a release.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-release-stats
   */
  getReleaseStats(releaseId: number): Promise<ReleaseStats> {
    return this.#client.requestData<ReleaseStats>({
      path: `/releases/${encodePathSegment(releaseId)}/stats`
    })
  }

  /**
   * Gets a master release.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-master-release
   */
  getMaster(masterId: number): Promise<Master> {
    return this.#client.requestData<Master>({
      path: `/masters/${encodePathSegment(masterId)}`
    })
  }

  /**
   * Lists all releases that are versions of a master release.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-master-release-versions
   */
  getMasterVersions(
    masterId: number,
    params: GetMasterVersionsParams = {}
  ): Promise<MasterVersionsResponse> {
    return this.#client.requestData<MasterVersionsResponse>({
      path: `/masters/${encodePathSegment(masterId)}/versions`,
      query: params as QueryParams
    })
  }

  /**
   * Gets an artist.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-artist
   */
  getArtist(artistId: number): Promise<Artist> {
    return this.#client.requestData<Artist>({
      path: `/artists/${encodePathSegment(artistId)}`
    })
  }

  /**
   * Lists the releases and masters associated with an artist.
   *
   * Entries are discriminated by their `type` field: `"master"` or `"release"`.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-artist-releases
   */
  getArtistReleases(
    artistId: number,
    params: GetArtistReleasesParams = {}
  ): Promise<ArtistReleasesResponse> {
    return this.#client.requestData<ArtistReleasesResponse>({
      path: `/artists/${encodePathSegment(artistId)}/releases`,
      query: params as QueryParams
    })
  }

  /**
   * Gets a label.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-label
   */
  getLabel(labelId: number): Promise<Label> {
    return this.#client.requestData<Label>({
      path: `/labels/${encodePathSegment(labelId)}`
    })
  }

  /**
   * Lists the releases associated with a label.
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-all-label-releases
   */
  getLabelReleases(labelId: number, params: PaginationParams = {}): Promise<LabelReleasesResponse> {
    return this.#client.requestData<LabelReleasesResponse>({
      path: `/labels/${encodePathSegment(labelId)}/releases`,
      query: params as QueryParams
    })
  }

  /**
   * Searches the Discogs database.
   *
   * **Authentication (as any user) is required.** Unauthenticated searches fail with a 401.
   *
   * @example
   * ```ts
   * await client.database.search({ artist: 'nirvana', release_title: 'nevermind', per_page: 3 });
   * ```
   *
   * @see https://www.discogs.com/developers/#page:database,header:database-search
   */
  search(params: SearchParams = {}): Promise<SearchResponse> {
    return this.#client.requestData<SearchResponse>({
      path: '/database/search',
      query: params as QueryParams
    })
  }
}
