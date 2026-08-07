/**
 * Types for the User Collection section of the Discogs API.
 *
 * A collection is arranged into folders. Every user has two permanent folders: folder `0`
 * ("All", which cannot have releases added to it) and folder `1` ("Uncategorized"). Because a
 * user may own several copies of the same release, each copy in a folder is an *instance*
 * with its own `instance_id`.
 *
 * @see https://www.discogs.com/developers/#page:user-collection
 * @module
 */

import type {
  ArtistCredit,
  Format,
  LabelCredit,
  Paginated,
  PaginationParams,
  SortOrder
} from './common.js'

/** The permanent "All" folder, which lists every release in the collection. */
export const FOLDER_ALL = 0

/** The permanent "Uncategorized" folder, the default destination for new additions. */
export const FOLDER_UNCATEGORIZED = 1

/** A collection folder. */
export interface CollectionFolder {
  id: number
  name: string
  /** Number of release instances in the folder. */
  count: number
  resource_url: string
}

/** Response of {@link CollectionResource.getFolders}. */
export interface CollectionFoldersResponse {
  folders: CollectionFolder[]
}

/** Condensed release metadata embedded in collection and wantlist items. */
export interface BasicInformation {
  id: number
  title: string
  year: number
  resource_url: string
  thumb: string
  /** @remarks Present on most, but not all, collection and wantlist responses. */
  cover_image?: string
  artists: ArtistCredit[]
  labels: LabelCredit[]
  formats: Format[]
  genres?: string[]
  styles?: string[]
  /** @remarks Undocumented; returned by the live API. */
  master_id?: number
  /** @remarks Undocumented; returned by the live API. */
  master_url?: string | null
}

/** The value of one custom notes field on a collection instance. */
export interface CollectionNote {
  field_id: number
  value: string
}

/**
 * One copy of a release in a collection folder.
 *
 * @remarks `notes` here is an array of field values — on wantlist items, by contrast, `notes`
 * is a plain string.
 */
export interface CollectionItem {
  /** The release id. */
  id: number
  /** Identifies this particular copy, since a user may own several. */
  instance_id: number
  folder_id: number
  /** 0–5, where `0` means unrated. */
  rating: number
  date_added: string
  basic_information: BasicInformation
  /** Only public fields are returned unless authenticated as the collection owner. */
  notes?: CollectionNote[]
}

/** Sort keys accepted by {@link CollectionResource.getItemsByFolder}. */
export type CollectionSort =
  'label' | 'artist' | 'title' | 'catno' | 'format' | 'rating' | 'added' | 'year'

/** Query parameters for {@link CollectionResource.getItemsByFolder}. */
export interface GetCollectionItemsParams extends PaginationParams {
  sort?: CollectionSort
  sort_order?: SortOrder
}

/** Response of {@link CollectionResource.getItemsByFolder} and `getItemsByRelease`. */
export type CollectionItemsResponse = Paginated<'releases', CollectionItem>

/** Response of {@link CollectionResource.addReleaseToFolder}. */
export interface AddToCollectionResponse {
  instance_id: number
  resource_url: string
}

/** Body accepted by {@link CollectionResource.changeInstance}. */
export interface ChangeInstanceParams {
  /** New rating, 0–5. */
  rating?: number
  /** Target folder id — supply this to move the instance to a different folder. */
  folder_id?: number
}

/** A custom notes field of type `dropdown`, whose value must be one of `options`. */
export interface CollectionDropdownField {
  id: number
  name: string
  position: number
  type: 'dropdown'
  public: boolean
  options: string[]
}

/** A custom notes field of type `textarea`, which accepts free text. */
export interface CollectionTextareaField {
  id: number
  name: string
  position: number
  type: 'textarea'
  public: boolean
  /** Height of the input on the website, in lines. */
  lines: number
}

/**
 * A user-defined collection notes field, discriminated by `type`.
 *
 * These fields can only be created and deleted through the Discogs website; the API can list
 * them and change their values on an instance.
 */
export type CollectionField = CollectionDropdownField | CollectionTextareaField

/** Response of {@link CollectionResource.getFields}. */
export interface CollectionFieldsResponse {
  fields: CollectionField[]
}

/**
 * The estimated value of a collection.
 *
 * All three values are currency-formatted strings (e.g. `"$250.00"`), not numbers.
 */
export interface CollectionValue {
  minimum: string
  median: string
  maximum: string
}
