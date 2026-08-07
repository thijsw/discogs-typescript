/**
 * Types for the Inventory Export and Inventory Upload sections of the Discogs API.
 *
 * @see https://www.discogs.com/developers/#page:inventory-export
 * @see https://www.discogs.com/developers/#page:inventory-upload
 * @module
 */

import type { Paginated } from './common.js'

/**
 * Processing status of an export or upload job.
 *
 * The docs only ever show `"success"`; the full set is not enumerated, so this stays a string.
 */
export type JobStatus = string

/**
 * A requested CSV export of your Marketplace inventory.
 *
 * @see https://www.discogs.com/developers/#page:inventory-export
 */
export interface InventoryExport {
  id: number
  status: JobStatus
  /** Timestamp the export was requested, e.g. `"2018-09-27T12:50:39"`. */
  created_ts: string
  /** Timestamp the export finished. `null` while the export is still running. */
  finished_ts: string | null
  filename: string
  /** URL of this export's status resource. */
  url: string
  /** URL to download the finished CSV. */
  download_url: string
}

/**
 * Response of {@link InventoryExportResource.list}.
 *
 * Note that Discogs uses `items` as the collection key here, which is easy to confuse with
 * `pagination.items` — the latter is a count, the former the array of exports.
 */
export type InventoryExportsResponse = Paginated<'items', InventoryExport>

/** Which kind of change an inventory upload applies. */
export type InventoryUploadType = 'add' | 'change' | 'delete'

/**
 * A submitted CSV upload against your Marketplace inventory.
 *
 * @see https://www.discogs.com/developers/#page:inventory-upload
 */
export interface InventoryUpload {
  id: number
  status: JobStatus
  /** Human-readable summary containing light HTML, e.g. `"CSV file contains 1 records.<p>Processed 1 records."` */
  results: string
  created_ts: string
  finished_ts: string | null
  filename: string
  type: InventoryUploadType
}

/** Response of {@link InventoryUploadResource.list}. Uses `items` as the collection key. */
export type InventoryUploadsResponse = Paginated<'items', InventoryUpload>

/**
 * A CSV payload for an inventory upload.
 *
 * A string is wrapped in a `text/csv` {@link Blob} automatically; pass a `Blob` or `File`
 * directly to control the filename and content type.
 */
export type CsvUpload = string | Blob
