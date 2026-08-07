/**
 * The Inventory Upload section: bulk add, change and delete Marketplace listings from a CSV.
 *
 * @see https://www.discogs.com/developers/#page:inventory-upload
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { PaginationParams } from '../types/common.js'
import type { CsvUpload, InventoryUpload, InventoryUploadsResponse } from '../types/inventory.js'
import { buildConditionalHeaders, type ConditionalRequestOptions } from './inventory-export.js'

/** Result of submitting an inventory upload. */
export interface CreateUploadResult {
  /**
   * Id of the newly created upload, parsed out of the `Location` response header, or `null`
   * if Discogs did not send one.
   */
  id: number | null
  /** The raw `Location` header, e.g. `https://api.discogs.com/inventory/upload/599632`. */
  location: string | null
}

/**
 * Wraps a CSV payload in the `multipart/form-data` body Discogs expects, under the field name
 * `upload`.
 *
 * @internal
 */
export function buildUploadFormData(csv: CsvUpload, filename = 'inventory.csv'): FormData {
  const form = new FormData()
  const blob = typeof csv === 'string' ? new Blob([csv], { type: 'text/csv' }) : csv
  form.append('upload', blob, filename)
  return form
}

/**
 * Inventory upload endpoints.
 *
 * Every upload takes a comma-separated CSV whose first row is a header of **lower case**
 * field names. Uploads are processed asynchronously — poll
 * {@link InventoryUploadResource.get} for the outcome.
 *
 * Reachable as `client.inventoryUpload`.
 */
export class InventoryUploadResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Uploads a CSV of listings to add to your inventory. Added listings go on sale immediately,
   * priced in the currency from your Marketplace settings.
   *
   * Required columns: `release_id`, `price`, `media_condition`.
   * Optional columns: `sleeve_condition`, `comments`, `accept_offer` (`Y` or `N`), `location`,
   * `external_id`, `weight` (grams, non-negative integer), `format_quantity`.
   * Any other column is ignored.
   *
   * @param csv - CSV text, or a `Blob`/`File` if you want to control the filename.
   *
   * @example
   * ```ts
   * await client.inventoryUpload.add(
   *   'release_id,price,media_condition\n249504,12.50,Near Mint (NM or M-)\n',
   * );
   * ```
   *
   * @see https://www.discogs.com/developers/#page:inventory-upload,header:inventory-upload-add-inventory
   */
  add(csv: CsvUpload, filename?: string): Promise<CreateUploadResult> {
    return this.#upload('add', csv, filename)
  }

  /**
   * Uploads a CSV of changes to existing listings.
   *
   * Required column: `release_id`.
   * At least one of: `price`, `media_condition`, `sleeve_condition`, `comments`,
   * `accept_offer` (`Y` or `N`), `external_id`, `location`, `weight`, `format_quantity`.
   *
   * @see https://www.discogs.com/developers/#page:inventory-upload,header:inventory-upload-change-inventory
   */
  change(csv: CsvUpload, filename?: string): Promise<CreateUploadResult> {
    return this.#upload('change', csv, filename)
  }

  /**
   * Uploads a CSV of listings to delete. The only column is `listing_id`.
   *
   * @example
   * ```ts
   * await client.inventoryUpload.delete('listing_id\n12345678\n98765432\n');
   * ```
   *
   * @see https://www.discogs.com/developers/#page:inventory-upload,header:inventory-upload-delete-inventory
   */
  delete(csv: CsvUpload, filename?: string): Promise<CreateUploadResult> {
    return this.#upload('delete', csv, filename)
  }

  /**
   * Lists your recent inventory uploads.
   *
   * @remarks Discogs names the collection key `items` on this endpoint, not `uploads`.
   *
   * @see https://www.discogs.com/developers/#page:inventory-upload,header:inventory-upload-get-recent-uploads
   */
  list(params: PaginationParams = {}): Promise<InventoryUploadsResponse> {
    return this.#client.requestData<InventoryUploadsResponse>({
      path: '/inventory/upload',
      query: params as QueryParams
    })
  }

  /**
   * Gets the status of an upload, including how many records were processed.
   *
   * @returns The upload, or `null` when `ifModifiedSince` was supplied and Discogs answered
   * `304 Not Modified`.
   *
   * @see https://www.discogs.com/developers/#page:inventory-upload,header:inventory-upload-get-an-upload
   */
  get(uploadId: number, options: ConditionalRequestOptions = {}): Promise<InventoryUpload | null> {
    return this.#client.requestData<InventoryUpload | null>({
      path: `/inventory/upload/${encodePathSegment(uploadId)}`,
      headers: buildConditionalHeaders(options)
    })
  }

  async #upload(
    kind: 'add' | 'change' | 'delete',
    csv: CsvUpload,
    filename?: string
  ): Promise<CreateUploadResult> {
    const { response } = await this.#client.request<null>({
      method: 'POST',
      path: `/inventory/upload/${kind}`,
      formData: buildUploadFormData(csv, filename),
      responseType: 'none'
    })

    const location = response.headers.get('Location')
    const match = location === null ? null : /\/inventory\/upload\/(\d+)/.exec(location)
    const id = match?.[1] === undefined ? null : Number.parseInt(match[1], 10)

    return { id, location }
  }
}
