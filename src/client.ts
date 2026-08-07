/**
 * The Discogs API client.
 *
 * @module
 */

import { resolveAuth } from './auth/index.js'
import type { AuthOption, AuthStrategy } from './auth/types.js'
import {
  sendRequest,
  type DiscogsResponse,
  type HttpClientConfig,
  type MediaType,
  type RequestOptions
} from './http.js'
import { CollectionResource } from './resources/collection.js'
import { DatabaseResource } from './resources/database.js'
import { InventoryExportResource } from './resources/inventory-export.js'
import { InventoryUploadResource } from './resources/inventory-upload.js'
import { ListsResource } from './resources/lists.js'
import { MarketplaceResource } from './resources/marketplace.js'
import { UserResource } from './resources/user.js'
import { WantlistResource } from './resources/wantlist.js'
import type { RateLimit } from './types/common.js'

/** Default base URL of the Discogs API. */
export const DEFAULT_BASE_URL = 'https://api.discogs.com'

/** Configuration for {@link DiscogsClient}. */
export interface DiscogsClientConfig {
  /**
   * Identifies your application to Discogs. **Required** — Discogs returns an empty response
   * to requests without a User-Agent, and rejects strings that impersonate a browser or a
   * generic HTTP library.
   *
   * @example `'MyDiscogsClient/1.0 +https://mydiscogsclient.org'`
   */
  userAgent: string

  /**
   * Credentials. Omit to make unauthenticated requests, which are limited to 25 requests per
   * minute and receive no image URLs.
   *
   * - `{ token }` — a personal access token; authenticates as the token holder.
   * - `{ consumerKey, consumerSecret }` — raises the rate limit and unlocks image URLs, but
   *   authenticates as no one.
   * - `{ consumerKey, consumerSecret, accessToken, accessTokenSecret }` — full OAuth 1.0a;
   *   authenticates as the user who granted access. See {@link DiscogsOAuth}.
   */
  auth?: AuthOption

  /** Override the API base URL. Defaults to `https://api.discogs.com`. */
  baseUrl?: string

  /**
   * Which representation to request. Discogs offers `discogs` (raw markup in text fields),
   * `html`, and `plaintext`. Defaults to `discogs`, which is also the server-side default.
   */
  mediaType?: MediaType

  /** Custom `fetch` implementation. Defaults to the global one. */
  fetch?: typeof globalThis.fetch

  /**
   * Called after every response, before the body is read.
   *
   * This is the reliable way to observe rate-limit state per request —
   * {@link DiscogsClient.rateLimit} only holds the most recent value and is therefore racy
   * when requests overlap.
   */
  onResponse?: (info: { response: Response; rateLimit: RateLimit | null }) => void
}

/**
 * A client for the Discogs API v2.
 *
 * Endpoints are grouped into resources that mirror the sections of the Discogs documentation.
 *
 * @example
 * ```ts
 * const client = new DiscogsClient({
 *   userAgent: 'MyApp/1.0 +https://example.com',
 *   auth: { token: process.env.DISCOGS_TOKEN! },
 * });
 *
 * const release = await client.database.getRelease(249504);
 * const results = await client.database.search({ artist: 'nirvana', type: 'release' });
 * ```
 *
 * @see https://www.discogs.com/developers/
 */
export class DiscogsClient {
  /** Database: releases, masters, artists, labels and search. */
  readonly database: DatabaseResource
  /** Marketplace: inventory, listings, orders, fees, price suggestions and stats. */
  readonly marketplace: MarketplaceResource
  /** Inventory export: request and download CSV exports of your inventory. */
  readonly inventoryExport: InventoryExportResource
  /** Inventory upload: bulk add, change and delete listings from a CSV. */
  readonly inventoryUpload: InventoryUploadResource
  /** User identity: the authenticated user, profiles, submissions and contributions. */
  readonly user: UserResource
  /** User collection: folders, items, custom fields and collection value. */
  readonly collection: CollectionResource
  /** User wantlist. */
  readonly wantlist: WantlistResource
  /** User lists. */
  readonly lists: ListsResource

  readonly #config: HttpClientConfig
  #rateLimit: RateLimit | null = null

  constructor(config: DiscogsClientConfig) {
    if (!config.userAgent) {
      throw new TypeError(
        'DiscogsClient requires a userAgent identifying your application. ' +
          'Discogs returns an empty response to requests without one.'
      )
    }

    const auth: AuthStrategy | null = config.auth ? resolveAuth(config.auth) : null

    this.#config = {
      baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
      userAgent: config.userAgent,
      mediaType: config.mediaType ?? 'discogs',
      auth,
      fetch: config.fetch ?? globalThis.fetch.bind(globalThis),
      onResponse: (info) => {
        this.#rateLimit = info.rateLimit ?? this.#rateLimit
        config.onResponse?.(info)
      }
    }

    this.database = new DatabaseResource(this)
    this.marketplace = new MarketplaceResource(this)
    this.inventoryExport = new InventoryExportResource(this)
    this.inventoryUpload = new InventoryUploadResource(this)
    this.user = new UserResource(this)
    this.collection = new CollectionResource(this)
    this.wantlist = new WantlistResource(this)
    this.lists = new ListsResource(this)
  }

  /**
   * Rate-limit state from the most recent response, or `null` if no response has carried the
   * headers yet.
   *
   * Because this reflects only the latest response it is unreliable while requests overlap —
   * use the `onResponse` config option when you need per-request accuracy.
   */
  get rateLimit(): RateLimit | null {
    return this.#rateLimit
  }

  /**
   * Sends an arbitrary request to the API, returning the parsed body together with the raw
   * response and its rate-limit headers.
   *
   * Use this to reach anything the typed resources do not cover, or when you need response
   * headers such as `Location` or `Last-Modified`.
   *
   * @example
   * ```ts
   * const { data, rateLimit } = await client.request<Release>({ path: '/releases/249504' });
   * ```
   */
  request<T>(options: RequestOptions): Promise<DiscogsResponse<T>> {
    return sendRequest<T>(this.#config, options)
  }

  /**
   * Sends a request and returns just the parsed body — what every resource method uses.
   *
   * @internal
   */
  async requestData<T>(options: RequestOptions): Promise<T> {
    const { data } = await sendRequest<T>(this.#config, options)
    return data
  }
}
