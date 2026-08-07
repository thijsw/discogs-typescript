/**
 * The User Lists section.
 *
 * @see https://www.discogs.com/developers/#page:user-lists
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { PaginationParams } from '../types/common.js'
import type { ListDetail, UserListsResponse } from '../types/lists.js'

/**
 * User list endpoints.
 *
 * Reachable as `client.lists`.
 */
export class ListsResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Lists a user's lists. Private lists are only returned when authenticated as the owner.
   *
   * @see https://www.discogs.com/developers/#page:user-lists,header:user-lists-user-lists
   */
  getUserLists(username: string, params: PaginationParams = {}): Promise<UserListsResponse> {
    return this.#client.requestData<UserListsResponse>({
      path: `/users/${encodePathSegment(username)}/lists`,
      query: params as QueryParams
    })
  }

  /**
   * Gets a list and its items. Private lists are only returned when authenticated as the
   * owner.
   *
   * @remarks This endpoint names its fields differently from the index endpoint —
   * `created_ts` / `modified_ts` / `list_id` / `url` rather than
   * `date_added` / `date_changed` / `id` / `uri`.
   *
   * @see https://www.discogs.com/developers/#page:user-lists,header:user-lists-list
   */
  getList(listId: number | string): Promise<ListDetail> {
    return this.#client.requestData<ListDetail>({
      path: `/lists/${encodePathSegment(listId)}`
    })
  }
}
