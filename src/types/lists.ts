/**
 * Types for the User Lists section of the Discogs API.
 *
 * Note that the two endpoints in this section name their timestamp and identifier fields
 * differently: the index endpoint returns `date_added` / `date_changed` / `id` / `uri`, while
 * the detail endpoint returns `created_ts` / `modified_ts` / `list_id` / `url`.
 *
 * @see https://www.discogs.com/developers/#page:user-lists
 * @module
 */

import type { Paginated } from './common.js'

/** A list as returned by the per-user index endpoint. */
export interface ListSummary {
  id: number
  name: string
  description: string
  public: boolean
  date_added: string
  date_changed: string
  uri: string
  resource_url: string
  /** @remarks Undocumented; returned by the live API. */
  image_url?: string
}

/** Response of {@link ListsResource.getUserLists}. */
export type UserListsResponse = Paginated<'lists', ListSummary>

/** An entry in a list. */
export interface ListItem {
  id: number
  /** The kind of database object this entry points at. */
  type: 'release' | 'master' | 'artist' | 'label'
  display_title: string
  comment: string
  uri: string
  image_url: string
  resource_url: string
  /** @remarks Undocumented; returned by the live API. */
  stats?: { community?: { in_collection: number; in_wantlist: number } }
}

/**
 * A list with its items.
 *
 * @remarks Field names differ from {@link ListSummary} — see the module description.
 */
export interface ListDetail {
  list_id: number
  name: string
  description: string
  public: boolean
  created_ts: string
  modified_ts: string
  url: string
  resource_url: string
  items: ListItem[]
  /** @remarks Undocumented; returned by the live API. */
  image_url?: string
  /** @remarks Undocumented; returned by the live API. */
  user?: { id: number; username: string; resource_url: string }
}
