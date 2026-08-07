/**
 * The Inventory Export section: request and download CSV exports of your Marketplace
 * inventory.
 *
 * @see https://www.discogs.com/developers/#page:inventory-export
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { PaginationParams } from '../types/common.js'
import type { InventoryExport, InventoryExportsResponse } from '../types/inventory.js'

/** Result of requesting a new export. */
export interface CreateExportResult {
  /**
   * Id of the newly created export, parsed out of the `Location` response header, or `null`
   * if Discogs did not send one.
   */
  id: number | null
  /** The raw `Location` header, e.g. `https://api.discogs.com/inventory/export/599632`. */
  location: string | null
}

/** Options for the conditional-request variants of the status endpoints. */
export interface ConditionalRequestOptions {
  /**
   * Sets `If-Modified-Since`. When the export has not changed since this time Discogs answers
   * `304 Not Modified` and the method resolves to `null`.
   */
  ifModifiedSince?: string | Date
}

/**
 * Inventory export endpoints.
 *
 * Reachable as `client.inventoryExport`.
 */
export class InventoryExportResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Requests a CSV export of your inventory.
   *
   * Exports are generated asynchronously — poll {@link InventoryExportResource.get} until the
   * status reports success, then call {@link InventoryExportResource.downloadCsv}.
   *
   * @throws A `DiscogsError` with status 409 when an export is already in progress.
   *
   * @see https://www.discogs.com/developers/#page:inventory-export,header:inventory-export-export-your-inventory
   */
  async create(): Promise<CreateExportResult> {
    const { response } = await this.#client.request<null>({
      method: 'POST',
      path: '/inventory/export',
      responseType: 'none'
    })

    const location = response.headers.get('Location')
    const match = location === null ? null : /\/inventory\/export\/(\d+)/.exec(location)
    const id = match?.[1] === undefined ? null : Number.parseInt(match[1], 10)

    return { id, location }
  }

  /**
   * Lists your recent inventory exports, newest first.
   *
   * @remarks Discogs names the collection key `items` on this endpoint, not `exports`.
   *
   * @see https://www.discogs.com/developers/#page:inventory-export,header:inventory-export-get-recent-exports
   */
  list(params: PaginationParams = {}): Promise<InventoryExportsResponse> {
    return this.#client.requestData<InventoryExportsResponse>({
      path: '/inventory/export',
      query: params as QueryParams
    })
  }

  /**
   * Gets the status of an export.
   *
   * @returns The export, or `null` when `ifModifiedSince` was supplied and Discogs answered
   * `304 Not Modified`.
   *
   * @see https://www.discogs.com/developers/#page:inventory-export,header:inventory-export-get-an-export
   */
  get(exportId: number, options: ConditionalRequestOptions = {}): Promise<InventoryExport | null> {
    return this.#client.requestData<InventoryExport | null>({
      path: `/inventory/export/${encodePathSegment(exportId)}`,
      headers: buildConditionalHeaders(options)
    })
  }

  /**
   * Downloads a finished export as CSV text.
   *
   * @see https://www.discogs.com/developers/#page:inventory-export,header:inventory-export-download-an-export
   */
  downloadCsv(exportId: number): Promise<string> {
    return this.#client.requestData<string>({
      path: `/inventory/export/${encodePathSegment(exportId)}/download`,
      headers: { Accept: 'text/csv' },
      responseType: 'text'
    })
  }

  /**
   * Downloads a finished export as a raw {@link Response}, so you can stream it to disk or
   * read the `Content-Disposition` filename.
   *
   * @see https://www.discogs.com/developers/#page:inventory-export,header:inventory-export-download-an-export
   */
  async downloadRaw(exportId: number): Promise<Response> {
    const { response } = await this.#client.request<null>({
      path: `/inventory/export/${encodePathSegment(exportId)}/download`,
      headers: { Accept: 'text/csv' },
      responseType: 'none'
    })
    return response
  }
}

/**
 * Builds the `If-Modified-Since` header for a conditional request.
 *
 * @internal
 */
export function buildConditionalHeaders(options: ConditionalRequestOptions): HeadersInit {
  if (options.ifModifiedSince === undefined) return {}
  const value =
    options.ifModifiedSince instanceof Date
      ? options.ifModifiedSince.toUTCString()
      : options.ifModifiedSince
  return { 'If-Modified-Since': value }
}
