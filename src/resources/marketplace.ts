/**
 * The Marketplace section: inventory, listings, orders, messages, fees, price suggestions and
 * release statistics.
 *
 * @see https://www.discogs.com/developers/#page:marketplace
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { Currency } from '../types/common.js'
import type {
  AddOrderMessageParams,
  AddOrderMessageResponse,
  CreateListingParams,
  CreateListingResponse,
  EditListingParams,
  EditOrderParams,
  GetInventoryParams,
  GetListingParams,
  GetMarketplaceStatsParams,
  InventoryResponse,
  Listing,
  MarketplaceFee,
  MarketplaceStats,
  Order,
  OrderMessagesResponse,
  OrdersResponse,
  ListOrdersParams,
  PriceSuggestions
} from '../types/marketplace.js'
import type { PaginationParams } from '../types/common.js'

/**
 * Marketplace endpoints.
 *
 * Reachable as `client.marketplace`.
 */
export class MarketplaceResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Lists the listings in a user's inventory.
   *
   * Unless authenticated as the inventory's owner, only `For Sale` items are returned and the
   * seller-private fields (`weight`, `format_quantity`, `external_id`, `location`,
   * `quantity`) are omitted.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-inventory
   */
  getInventory(username: string, params: GetInventoryParams = {}): Promise<InventoryResponse> {
    return this.#client.requestData<InventoryResponse>({
      path: `/users/${encodePathSegment(username)}/inventory`,
      query: params as QueryParams
    })
  }

  /**
   * Gets a listing.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-listing
   */
  getListing(listingId: number, params: GetListingParams = {}): Promise<Listing> {
    return this.#client.requestData<Listing>({
      path: `/marketplace/listings/${encodePathSegment(listingId)}`,
      query: params as QueryParams
    })
  }

  /**
   * Creates a listing in the authenticated user's inventory.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-new-listing
   */
  createListing(params: CreateListingParams): Promise<CreateListingResponse> {
    return this.#client.requestData<CreateListingResponse>({
      method: 'POST',
      path: '/marketplace/listings',
      body: params
    })
  }

  /**
   * Edits a listing. Requires authentication as the listing's owner.
   *
   * Listings whose status is not `For Sale`, `Draft` or `Expired` cannot be edited, only
   * deleted; a `Sold` listing has to be replaced with a new one.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-listing-post
   */
  editListing(listingId: number, params: EditListingParams): Promise<void> {
    return this.#client.requestData<void>({
      method: 'POST',
      path: `/marketplace/listings/${encodePathSegment(listingId)}`,
      body: params,
      responseType: 'none'
    })
  }

  /**
   * Permanently removes a listing. Requires authentication as the listing's owner.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-listing-delete
   */
  deleteListing(listingId: number): Promise<void> {
    return this.#client.requestData<void>({
      method: 'DELETE',
      path: `/marketplace/listings/${encodePathSegment(listingId)}`,
      responseType: 'none'
    })
  }

  /**
   * Gets an order. Requires authentication as the seller.
   *
   * @param orderId - Order ids are strings of the form `"1-1"`.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-order
   */
  getOrder(orderId: string): Promise<Order> {
    return this.#client.requestData<Order>({
      path: `/marketplace/orders/${encodePathSegment(orderId)}`
    })
  }

  /**
   * Edits an order. Requires authentication as the seller.
   *
   * The new `status` must appear in the order's current `next_status` array. Setting
   * `shipping` invoices the buyer and forces the status to `Invoice Sent`, so `shipping` and
   * `status` cannot be sent together. Changing the status through this endpoint always
   * messages the buyer with a fixed "Seller changed status from … to …" note — use
   * {@link MarketplaceResource.addOrderMessage} to combine a status change with your own text.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-order-post
   */
  editOrder(orderId: string, params: EditOrderParams): Promise<Order> {
    return this.#client.requestData<Order>({
      method: 'POST',
      path: `/marketplace/orders/${encodePathSegment(orderId)}`,
      body: params
    })
  }

  /**
   * Lists the authenticated user's orders.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-list-orders
   */
  listOrders(params: ListOrdersParams = {}): Promise<OrdersResponse> {
    return this.#client.requestData<OrdersResponse>({
      path: '/marketplace/orders',
      query: params as QueryParams
    })
  }

  /**
   * Lists an order's messages, most recent first. Requires authentication as the seller.
   *
   * Entries are discriminated by their `type` field.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-list-orders-get
   */
  getOrderMessages(orderId: string, params: PaginationParams = {}): Promise<OrderMessagesResponse> {
    return this.#client.requestData<OrderMessagesResponse>({
      path: `/marketplace/orders/${encodePathSegment(orderId)}/messages`,
      query: params as QueryParams
    })
  }

  /**
   * Adds a message to an order's message log, optionally changing the order status at the
   * same time. At least one of `message` or `status` must be supplied.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-list-orders-post
   */
  async addOrderMessage(
    orderId: string,
    params: AddOrderMessageParams
  ): Promise<AddOrderMessageResponse> {
    if (params.message === undefined && params.status === undefined) {
      throw new TypeError('addOrderMessage requires at least one of "message" or "status".')
    }
    return this.#client.requestData<AddOrderMessageResponse>({
      method: 'POST',
      path: `/marketplace/orders/${encodePathSegment(orderId)}/messages`,
      body: params
    })
  }

  /**
   * Calculates the Discogs commission on a sale price, in the given currency (USD by default).
   *
   * @remarks The price is formatted to exactly two decimal places, because the endpoint
   * requires it: `/marketplace/fee/20` returns a 404 while `/marketplace/fee/20.00` succeeds.
   * The Discogs docs only ever show `10.00` and never state this, so passing a bare integer
   * is an easy mistake to make.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-fee
   */
  getFee(price: number, currency?: Currency): Promise<MarketplaceFee> {
    const amount = price.toFixed(2)
    const path =
      currency === undefined
        ? `/marketplace/fee/${amount}`
        : `/marketplace/fee/${amount}/${encodePathSegment(currency)}`

    return this.#client.requestData<MarketplaceFee>({ path })
  }

  /**
   * Gets suggested prices per media condition for a release, in the user's selling currency.
   *
   * Requires authentication, and the user must have completed their seller settings. Returns
   * an empty object when Discogs has no suggestions for the release.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-price-suggestions
   */
  getPriceSuggestions(releaseId: number): Promise<PriceSuggestions> {
    return this.#client.requestData<PriceSuggestions>({
      path: `/marketplace/price_suggestions/${encodePathSegment(releaseId)}`
    })
  }

  /**
   * Gets marketplace statistics for a release: how many copies are for sale and the lowest
   * listed price.
   *
   * `lowest_price` and `num_for_sale` are `null` when nothing is for sale or the release is
   * blocked from sale.
   *
   * @see https://www.discogs.com/developers/#page:marketplace,header:marketplace-release-statistics
   */
  getReleaseStats(
    releaseId: number,
    params: GetMarketplaceStatsParams = {}
  ): Promise<MarketplaceStats> {
    return this.#client.requestData<MarketplaceStats>({
      path: `/marketplace/stats/${encodePathSegment(releaseId)}`,
      query: params as QueryParams
    })
  }
}
