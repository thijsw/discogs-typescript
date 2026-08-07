/**
 * The User Wantlist section.
 *
 * @see https://www.discogs.com/developers/#page:user-wantlist
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { PaginationParams } from '../types/common.js'
import type { WantlistItem, WantlistItemParams, WantlistResponse } from '../types/wantlist.js'

/**
 * User wantlist endpoints.
 *
 * Reachable as `client.wantlist`.
 */
export class WantlistResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Lists the releases on a user's wantlist.
   *
   * A private wantlist requires authentication as its owner, and the `notes` field is only
   * returned to the owner.
   *
   * @see https://www.discogs.com/developers/#page:user-wantlist,header:user-wantlist-wantlist
   */
  getWants(username: string, params: PaginationParams = {}): Promise<WantlistResponse> {
    return this.#client.requestData<WantlistResponse>({
      path: `/users/${encodePathSegment(username)}/wants`,
      query: params as QueryParams
    })
  }

  /**
   * Adds a release to a user's wantlist. Requires authentication as the wantlist owner.
   *
   * @see https://www.discogs.com/developers/#page:user-wantlist,header:user-wantlist-add-to-wantlist
   */
  addToWantlist(
    username: string,
    releaseId: number,
    params: WantlistItemParams = {}
  ): Promise<WantlistItem> {
    return this.#client.requestData<WantlistItem>({
      method: 'PUT',
      path: `/users/${encodePathSegment(username)}/wants/${encodePathSegment(releaseId)}`,
      query: params as QueryParams
    })
  }

  /**
   * Edits the notes or rating on a wantlist entry. Requires authentication as the owner.
   *
   * @see https://www.discogs.com/developers/#page:user-wantlist,header:user-wantlist-add-to-wantlist-post
   */
  editWantlistItem(
    username: string,
    releaseId: number,
    params: WantlistItemParams = {}
  ): Promise<WantlistItem> {
    return this.#client.requestData<WantlistItem>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}/wants/${encodePathSegment(releaseId)}`,
      query: params as QueryParams
    })
  }

  /**
   * Removes a release from a user's wantlist. Requires authentication as the owner.
   *
   * @see https://www.discogs.com/developers/#page:user-wantlist,header:user-wantlist-add-to-wantlist-delete
   */
  removeFromWantlist(username: string, releaseId: number): Promise<void> {
    return this.#client.requestData<void>({
      method: 'DELETE',
      path: `/users/${encodePathSegment(username)}/wants/${encodePathSegment(releaseId)}`,
      responseType: 'none'
    })
  }
}
