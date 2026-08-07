/**
 * The User Collection section: folders, release instances, custom notes fields and collection
 * value.
 *
 * @see https://www.discogs.com/developers/#page:user-collection
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { PaginationParams } from '../types/common.js'
import type {
  AddToCollectionResponse,
  ChangeInstanceParams,
  CollectionFieldsResponse,
  CollectionFolder,
  CollectionFoldersResponse,
  CollectionItemsResponse,
  CollectionValue,
  GetCollectionItemsParams
} from '../types/collection.js'

/**
 * User collection endpoints.
 *
 * A collection is arranged into folders. Folder `0` is the permanent "All" folder (releases
 * cannot be added to it) and folder `1` is "Uncategorized". Since a user may own several
 * copies of the same release, each copy in a folder is an *instance* with its own
 * `instance_id`.
 *
 * Reachable as `client.collection`.
 */
export class CollectionResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Lists a user's collection folders.
   *
   * Without authentication as the owner, only folder `0` ("All") is visible, and only if the
   * collection is public.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection
   */
  getFolders(username: string): Promise<CollectionFoldersResponse> {
    return this.#client.requestData<CollectionFoldersResponse>({
      path: `/users/${encodePathSegment(username)}/collection/folders`
    })
  }

  /**
   * Creates a new folder. Requires authentication as the collection owner.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-post
   */
  createFolder(username: string, name: string): Promise<CollectionFolder> {
    return this.#client.requestData<CollectionFolder>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}/collection/folders`,
      body: { name }
    })
  }

  /**
   * Gets a single folder. Requires authentication as the owner unless `folderId` is `0`.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-folder
   */
  getFolder(username: string, folderId: number): Promise<CollectionFolder> {
    return this.#client.requestData<CollectionFolder>({
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}`
    })
  }

  /**
   * Renames a folder. Requires authentication as the owner.
   *
   * Folders `0` ("All") and `1` ("Uncategorized") cannot be renamed.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-folder-post
   */
  editFolder(username: string, folderId: number, name: string): Promise<CollectionFolder> {
    return this.#client.requestData<CollectionFolder>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}`,
      body: { name }
    })
  }

  /**
   * Deletes a folder. Requires authentication as the owner, and the folder must be empty.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-folder-delete
   */
  deleteFolder(username: string, folderId: number): Promise<void> {
    return this.#client.requestData<void>({
      method: 'DELETE',
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}`,
      responseType: 'none'
    })
  }

  /**
   * Finds every instance of a given release across a user's collection folders.
   *
   * @param releaseId - Must be non-zero.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-items-by-release
   */
  getItemsByRelease(
    username: string,
    releaseId: number,
    params: PaginationParams = {}
  ): Promise<CollectionItemsResponse> {
    return this.#client.requestData<CollectionItemsResponse>({
      path: `/users/${encodePathSegment(username)}/collection/releases/${encodePathSegment(releaseId)}`,
      query: params as QueryParams
    })
  }

  /**
   * Lists the releases in a collection folder.
   *
   * Requires authentication as the owner when `folderId` is not `0` or the collection is
   * private. Without it, only public notes fields are returned.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-items-by-folder
   */
  getItemsByFolder(
    username: string,
    folderId: number,
    params: GetCollectionItemsParams = {}
  ): Promise<CollectionItemsResponse> {
    return this.#client.requestData<CollectionItemsResponse>({
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}/releases`,
      query: params as QueryParams
    })
  }

  /**
   * Adds a release to a folder. Requires authentication as the owner.
   *
   * @param folderId - Must be non-zero; pass `1` for "Uncategorized".
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-add-to-collection-folder
   */
  addReleaseToFolder(
    username: string,
    folderId: number,
    releaseId: number
  ): Promise<AddToCollectionResponse> {
    return this.#client.requestData<AddToCollectionResponse>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}/releases/${encodePathSegment(releaseId)}`
    })
  }

  /**
   * Changes an instance's rating and/or moves it to a different folder. Requires
   * authentication as the owner.
   *
   * Note the two folder ids: `folderId` identifies the folder the instance currently lives in,
   * while `params.folder_id` is the folder to move it to.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-change-rating-of-release
   */
  changeInstance(
    username: string,
    folderId: number,
    releaseId: number,
    instanceId: number,
    params: ChangeInstanceParams
  ): Promise<void> {
    return this.#client.requestData<void>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}/releases/${encodePathSegment(releaseId)}/instances/${encodePathSegment(instanceId)}`,
      body: params,
      responseType: 'none'
    })
  }

  /**
   * Removes an instance from a collection folder. Requires authentication as the owner.
   *
   * To move it to "Uncategorized" instead of deleting it, use
   * {@link CollectionResource.changeInstance}.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-delete-instance-from-folder
   */
  deleteInstance(
    username: string,
    folderId: number,
    releaseId: number,
    instanceId: number
  ): Promise<void> {
    return this.#client.requestData<void>({
      method: 'DELETE',
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}/releases/${encodePathSegment(releaseId)}/instances/${encodePathSegment(instanceId)}`,
      responseType: 'none'
    })
  }

  /**
   * Lists a user's custom collection notes fields.
   *
   * These can only be created and deleted through the Discogs website. Without authentication
   * as the owner, only fields with `public: true` are returned.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-list-custom-fields
   */
  getFields(username: string): Promise<CollectionFieldsResponse> {
    return this.#client.requestData<CollectionFieldsResponse>({
      path: `/users/${encodePathSegment(username)}/collection/fields`
    })
  }

  /**
   * Sets the value of a custom notes field on a collection instance.
   *
   * @param value - For a `dropdown` field this must be one of the field's `options`. Sent as a
   * query-string parameter, which is what this endpoint expects.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-edit-fields-instance
   */
  editFieldInstance(
    username: string,
    folderId: number,
    releaseId: number,
    instanceId: number,
    fieldId: number,
    value: string
  ): Promise<void> {
    return this.#client.requestData<void>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}/collection/folders/${encodePathSegment(folderId)}/releases/${encodePathSegment(releaseId)}/instances/${encodePathSegment(instanceId)}/fields/${encodePathSegment(fieldId)}`,
      query: { value },
      responseType: 'none'
    })
  }

  /**
   * Gets the minimum, median and maximum value of a collection, as currency-formatted strings.
   * Requires authentication as the collection owner.
   *
   * @see https://www.discogs.com/developers/#page:user-collection,header:user-collection-collection-value
   */
  getValue(username: string): Promise<CollectionValue> {
    return this.#client.requestData<CollectionValue>({
      path: `/users/${encodePathSegment(username)}/collection/value`
    })
  }
}
