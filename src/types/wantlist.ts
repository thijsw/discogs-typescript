/**
 * Types for the User Wantlist section of the Discogs API.
 *
 * @see https://www.discogs.com/developers/#page:user-wantlist
 * @module
 */

import type { Paginated } from './common.js'
import type { BasicInformation } from './collection.js'

/**
 * A release on a user's wantlist.
 *
 * @remarks `notes` here is a plain string and is only visible to the wantlist owner — on
 * collection items, by contrast, `notes` is an array of custom field values.
 */
export interface WantlistItem {
  /** The release id. */
  id: number
  resource_url: string
  /** 0–5, where `0` means unrated. */
  rating: number
  /** Only visible when authenticated as the wantlist owner. */
  notes?: string
  basic_information: BasicInformation
}

/** Response of {@link WantlistResource.getWants}. */
export type WantlistResponse = Paginated<'wants', WantlistItem>

/** Parameters accepted when adding to or editing an entry on the wantlist. */
export interface WantlistItemParams {
  /** User notes to associate with this release. */
  notes?: string
  /** The user's rating of this release, from 0 (unrated) to 5 (best). Defaults to `0`. */
  rating?: number
}
