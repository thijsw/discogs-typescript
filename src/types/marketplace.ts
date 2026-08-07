/**
 * Types for the Marketplace section of the Discogs API.
 *
 * @see https://www.discogs.com/developers/#page:marketplace
 * @module
 */

import type {
  Currency,
  OriginalPrice,
  Paginated,
  PaginationParams,
  Price,
  SortOrder,
  UserIdRef
} from './common.js'

/* -------------------------------------------------------------------------- */
/* Conditions                                                                  */
/* -------------------------------------------------------------------------- */

/** Goldmine grading for the media itself. */
export type MediaCondition =
  | 'Mint (M)'
  | 'Near Mint (NM or M-)'
  | 'Very Good Plus (VG+)'
  | 'Very Good (VG)'
  | 'Good Plus (G+)'
  | 'Good (G)'
  | 'Fair (F)'
  | 'Poor (P)'

/** Every {@link MediaCondition}, best to worst. */
export const MEDIA_CONDITIONS: readonly MediaCondition[] = [
  'Mint (M)',
  'Near Mint (NM or M-)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)'
]

/** Grading for the sleeve: any {@link MediaCondition}, plus three sleeve-specific values. */
export type SleeveCondition = MediaCondition | 'Generic' | 'Not Graded' | 'No Cover'

/** Every {@link SleeveCondition}. */
export const SLEEVE_CONDITIONS: readonly SleeveCondition[] = [
  ...MEDIA_CONDITIONS,
  'Generic',
  'Not Graded',
  'No Cover'
]

/* -------------------------------------------------------------------------- */
/* Listing                                                                     */
/* -------------------------------------------------------------------------- */

/** Listing statuses that can be set when creating or editing a listing. */
export type ListingStatus = 'For Sale' | 'Draft'

/** Listing statuses accepted as an inventory filter. */
export type ListingStatusFilter =
  'All' | 'Deleted' | 'Draft' | 'Expired' | 'For Sale' | 'Sold' | 'Suspended' | 'Violation'

/** Every {@link ListingStatusFilter}, as enumerated by the API's own 422 error message. */
export const LISTING_STATUS_FILTERS: readonly ListingStatusFilter[] = [
  'All',
  'Deleted',
  'Draft',
  'Expired',
  'For Sale',
  'Sold',
  'Suspended',
  'Violation'
]

/** The release a listing refers to. */
export interface ListingRelease {
  id: number
  description: string
  resource_url: string
  thumbnail: string
  catalog_number: string
  year: number
  /** Present on some listings only. */
  artist?: string
  /** Present on some listings only. */
  title?: string
  /** Present on some listings only. */
  format?: string
  /** @remarks Undocumented; returned by the live API. */
  stats?: { community?: { in_collection: number; in_wantlist: number } }
}

/** Seller rating summary. */
export interface SellerStats {
  /** Percentage rating, returned as a string (e.g. `"100"`). */
  rating: string
  stars: number
  total: number
}

/** The seller of a listing. Richer on {@link Listing} than on inventory entries. */
export interface ListingSeller extends UserIdRef {
  avatar_url?: string
  url?: string
  /** Free-text shipping policy. */
  shipping?: string
  /** Free-text accepted payment methods. */
  payment?: string
  stats?: SellerStats
  /** @remarks Undocumented; returned by the live API. */
  html_url?: string
  /** @remarks Undocumented; returned by the live API. */
  uid?: number
  /** @remarks Undocumented; returned by the live API. */
  min_order_total?: number
}

/**
 * A Marketplace listing.
 *
 * Fields marked "owner only" are returned only when the request is authenticated as the
 * listing's seller.
 *
 * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-listing
 */
export interface Listing {
  id: number
  status: ListingStatusFilter
  resource_url: string
  uri: string
  condition: MediaCondition
  sleeve_condition?: SleeveCondition
  comments: string
  /** ISO 8601 timestamp of when the listing was posted. */
  posted: string
  ships_from: string
  allow_offers: boolean
  audio: boolean
  price: Price
  original_price?: OriginalPrice
  shipping_price?: Price
  original_shipping_price?: OriginalPrice
  seller: ListingSeller
  release: ListingRelease
  /** Owner only. Shipping weight in grams. */
  weight?: number
  /** Owner only. How many items this listing counts as for shipping purposes. */
  format_quantity?: number
  /** Owner only. Seller-private reference, shown as "Private Comments" on the website. */
  external_id?: string
  /** Owner only. Seller-private physical storage location. */
  location?: string
  /** Owner only. Always `1` for NearMint sellers, for whom it is read-only. */
  quantity?: number
  /** Only present for authenticated users. */
  in_cart?: boolean
  /** @remarks Undocumented; returned by the live API. */
  ships_from_country_code?: string
}

/** Response of {@link MarketplaceResource.getInventory}. */
export type InventoryResponse = Paginated<'listings', Listing>

/** Sort keys accepted by {@link MarketplaceResource.getInventory}. */
export type InventorySort =
  | 'listed'
  | 'price'
  /** Title of the release. */
  | 'item'
  | 'artist'
  | 'label'
  | 'catno'
  | 'audio'
  /** Owner-authenticated requests only. */
  | 'status'
  /** Owner-authenticated requests only. */
  | 'location'

/** Query parameters for {@link MarketplaceResource.getInventory}. */
export interface GetInventoryParams extends PaginationParams {
  /** Only return listings with this status. */
  status?: ListingStatusFilter
  sort?: InventorySort
  sort_order?: SortOrder
}

/** Query parameters for {@link MarketplaceResource.getListing}. */
export interface GetListingParams {
  /** Defaults to the authenticated user's currency. */
  curr_abbr?: Currency
}

/**
 * Body accepted when creating a listing.
 *
 * `weight` and `format_quantity` additionally accept the literal string `"auto"`, which asks
 * Discogs to estimate the value.
 */
export interface CreateListingParams {
  /** The release being listed. */
  release_id: number
  condition: MediaCondition
  sleeve_condition?: SleeveCondition
  /** Price in the seller's currency. */
  price: number
  /** Remarks displayed to buyers. */
  comments?: string
  /** Defaults to `false`. */
  allow_offers?: boolean
  /** Defaults to `"For Sale"`. */
  status?: ListingStatus
  /** Seller-private reference, shown as "Private Comments" on the website. */
  external_id?: string
  /** Seller-private physical storage location. */
  location?: string
  /** Shipping weight in grams, or `"auto"` to let Discogs estimate it. */
  weight?: number | 'auto'
  /** How many items this counts as for shipping, or `"auto"`. */
  format_quantity?: number | 'auto'
}

/**
 * Body accepted when editing a listing.
 *
 * Listings whose status is not `For Sale`, `Draft` or `Expired` can only be deleted, not
 * edited. A `Sold` listing cannot be re-listed — create a new listing instead.
 */
export type EditListingParams = CreateListingParams

/** Response of {@link MarketplaceResource.createListing}. */
export interface CreateListingResponse {
  listing_id: number
  resource_url: string
}

/* -------------------------------------------------------------------------- */
/* Order                                                                       */
/* -------------------------------------------------------------------------- */

/** Order statuses a seller may set. */
export type OrderStatus =
  | 'New Order'
  | 'Buyer Contacted'
  | 'Invoice Sent'
  | 'Payment Pending'
  | 'Payment Received'
  | 'In Progress'
  | 'Shipped'
  | 'Refund Sent'
  | 'Cancelled (Non-Paying Buyer)'
  | 'Cancelled (Item Unavailable)'
  | "Cancelled (Per Buyer's Request)"

/** Every {@link OrderStatus} a seller may set. */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'New Order',
  'Buyer Contacted',
  'Invoice Sent',
  'Payment Pending',
  'Payment Received',
  'In Progress',
  'Shipped',
  'Refund Sent',
  'Cancelled (Non-Paying Buyer)',
  'Cancelled (Item Unavailable)',
  "Cancelled (Per Buyer's Request)"
]

/** Order statuses accepted as a filter by {@link MarketplaceResource.listOrders}. */
export type OrderStatusFilter =
  OrderStatus | 'All' | 'Merged' | 'Order Changed' | 'Cancelled' | 'Cancelled (Refund Received)'

/** Every {@link OrderStatusFilter}. */
export const ORDER_STATUS_FILTERS: readonly OrderStatusFilter[] = [
  'All',
  ...ORDER_STATUSES,
  'Merged',
  'Order Changed',
  'Cancelled',
  'Cancelled (Refund Received)'
]

/** Carriers Discogs can generate a tracking URL for. */
export type TrackingCarrier =
  | 'UPS'
  | 'USPS'
  | 'DHL'
  | 'Deutsche Post'
  | 'La Poste'
  | 'Royal Mail'
  | 'PostNL'
  | 'DHL Germany'
  | 'Other'

/** Every {@link TrackingCarrier}. */
export const TRACKING_CARRIERS: readonly TrackingCarrier[] = [
  'UPS',
  'USPS',
  'DHL',
  'Deutsche Post',
  'La Poste',
  'Royal Mail',
  'PostNL',
  'DHL Germany',
  'Other'
]

/** Shipment tracking attached to an order. */
export interface OrderTracking {
  number: string
  carrier?: TrackingCarrier
  /** Auto-generated by Discogs from the carrier and tracking number. */
  url?: string
}

/** A single item within an order. */
export interface OrderItem {
  id: number
  release: {
    id: number
    description: string
    /** Present on {@link MarketplaceResource.listOrders} results. */
    resource_url?: string
    /** Present on {@link MarketplaceResource.listOrders} results. */
    thumbnail?: string
  }
  price: Price
  media_condition?: MediaCondition
  sleeve_condition?: SleeveCondition
}

/** Shipping cost on an order. Carries a `method` alongside the usual price fields. */
export interface OrderShipping extends Price {
  method: string
}

/**
 * A Marketplace order.
 *
 * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-order
 */
export interface Order {
  /** Order ids are strings of the form `"1-1"`, not numbers. */
  id: string
  resource_url: string
  messages_url: string
  uri: string
  status: OrderStatusFilter
  /**
   * The statuses this order may legally transition to. Discogs rejects any status not in this
   * list, and the set is computed per order — there is no static transition table.
   */
  next_status: OrderStatus[]
  items: OrderItem[]
  buyer: UserIdRef
  seller: UserIdRef
  total: Price
  fee: Price
  shipping: OrderShipping
  shipping_address: string
  additional_instructions?: string
  archived: boolean
  created: string
  last_activity: string
  tracking?: OrderTracking
}

/** Response of {@link MarketplaceResource.listOrders}. */
export type OrdersResponse = Paginated<'orders', Order>

/** Sort keys accepted by {@link MarketplaceResource.listOrders}. */
export type OrderSort = 'id' | 'buyer' | 'created' | 'status' | 'last_activity'

/** Query parameters for {@link MarketplaceResource.listOrders}. */
export interface ListOrdersParams extends PaginationParams {
  status?: OrderStatusFilter
  /** ISO 8601 timestamp, e.g. `"2019-06-24T20:58:58Z"`. */
  created_after?: string
  /** ISO 8601 timestamp. */
  created_before?: string
  /** When omitted, both archived and unarchived orders are returned. */
  archived?: boolean
  sort?: OrderSort
  sort_order?: SortOrder
}

/**
 * Body accepted when editing an order.
 *
 * `status` and `shipping` are mutually exclusive: changing the shipping price invoices the
 * buyer and forces the status to `Invoice Sent`, so Discogs rejects requests that set both.
 * Shipping can only be changed while the order is not cancelled, `Payment Received` or
 * `Shipped`.
 */
export interface EditOrderParams {
  /** Must appear in the order's current {@link Order.next_status} list. */
  status?: OrderStatus
  /** New shipping price. Sends an invoice and moves the order to `Invoice Sent`. */
  shipping?: number
  /** Seller only — buyers receive a 403. */
  tracking?: OrderTracking
}

/* -------------------------------------------------------------------------- */
/* Order messages                                                              */
/* -------------------------------------------------------------------------- */

/** Fields shared by every order message variant. */
export interface OrderMessageBase {
  timestamp: string
  message: string
  subject: string
  order: { id: string; resource_url: string }
}

/** A refund the buyer received. */
export interface OrderRefundReceivedMessage extends OrderMessageBase {
  type: 'refund_received'
  refund: { amount: number; order: { id: string; resource_url: string } }
}

/** A refund the seller sent. */
export interface OrderRefundSentMessage extends OrderMessageBase {
  type: 'refund_sent'
  refund: { amount: number; order: { id: string; resource_url: string } }
}

/** A free-text message from the buyer or seller. */
export interface OrderTextMessage extends OrderMessageBase {
  type: 'message'
  from: { id: number; username: string; avatar_url: string; resource_url: string }
}

/** An automatic message recording a status change. */
export interface OrderStatusMessage extends OrderMessageBase {
  type: 'status'
  /** Numeric status code, e.g. `1` order created, `3` invoice sent, `5` paid, `6` shipped. */
  status_id: number
  actor: { username: string; resource_url: string }
}

/** An automatic message recording a shipping price change. */
export interface OrderShippingMessage extends OrderMessageBase {
  type: 'shipping'
  original: number
  new: number
}

/** An entry in an order's message log, discriminated by `type`. */
export type OrderMessage =
  | OrderRefundReceivedMessage
  | OrderRefundSentMessage
  | OrderTextMessage
  | OrderStatusMessage
  | OrderShippingMessage

/** Response of {@link MarketplaceResource.getOrderMessages}. */
export type OrderMessagesResponse = Paginated<'messages', OrderMessage>

/**
 * Body accepted when adding an order message. At least one of `message` or `status` must be
 * supplied; supplying both prepends
 * `"Seller changed status from Old Status to New Status"` to the message.
 */
export interface AddOrderMessageParams {
  message?: string
  status?: OrderStatus
}

/** Response of {@link MarketplaceResource.addOrderMessage}. */
export interface AddOrderMessageResponse {
  /** Narrower than {@link OrderTextMessage.from} — only these two fields are returned. */
  from: { username: string; resource_url: string }
  message: string
  order: { id: string; resource_url: string }
  timestamp: string
  subject: string
}

/* -------------------------------------------------------------------------- */
/* Fees, price suggestions and stats                                           */
/* -------------------------------------------------------------------------- */

/** The Discogs commission on a sale. */
export type MarketplaceFee = Price

/**
 * Suggested prices keyed by media condition, denominated in the user's selling currency.
 *
 * An empty object is returned when Discogs has no suggestions for the release.
 */
export type PriceSuggestions = Partial<Record<MediaCondition, Price>>

/** Query parameters for {@link MarketplaceResource.getReleaseStats}. */
export interface GetMarketplaceStatsParams {
  /** Defaults to the authenticated user's buyer currency, or USD when unauthenticated. */
  curr_abbr?: Currency
}

/**
 * Marketplace statistics for a release.
 *
 * `lowest_price` and `num_for_sale` are `null` when nothing is for sale, or when the release
 * is blocked from sale.
 */
export interface MarketplaceStats {
  lowest_price: Price | null
  num_for_sale: number | null
  blocked_from_sale: boolean
}
