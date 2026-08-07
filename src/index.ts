/**
 * discogs-typescript — a modern, fully typed, zero-dependency client for the Discogs API v2.
 *
 * @example
 * ```ts
 * import { DiscogsClient } from 'discogs-typescript';
 *
 * const client = new DiscogsClient({
 *   userAgent: 'MyApp/1.0 +https://example.com',
 *   auth: { token: process.env.DISCOGS_TOKEN! },
 * });
 *
 * const release = await client.database.getRelease(249504);
 * ```
 *
 * @see https://www.discogs.com/developers/
 * @module
 */

export { DiscogsClient, DEFAULT_BASE_URL, type DiscogsClientConfig } from './client.js'

export {
  DiscogsError,
  DiscogsAuthenticationError,
  DiscogsPermissionError,
  DiscogsNotFoundError,
  DiscogsMethodNotAllowedError,
  DiscogsValidationError,
  DiscogsRateLimitError,
  DiscogsServerError,
  type DiscogsErrorOptions
} from './errors.js'

export {
  parseRateLimit,
  RATE_LIMIT_HEADER,
  RATE_LIMIT_USED_HEADER,
  RATE_LIMIT_REMAINING_HEADER
} from './rate-limit.js'

export { parseLinkHeader, DEFAULT_PER_PAGE, MAX_PER_PAGE } from './pagination.js'

export type {
  DiscogsResponse,
  HttpMethod,
  MediaType,
  QueryParams,
  QueryValue,
  RequestOptions
} from './http.js'

export {
  DiscogsOAuth,
  KeySecretAuth,
  OAuth1Auth,
  TokenAuth,
  DEFAULT_WEBSITE_URL,
  type AccessToken,
  type AuthOption,
  type AuthStrategy,
  type AuthorizableRequest,
  type ConsumerCredentials,
  type DiscogsOAuthConfig,
  type GetAccessTokenParams,
  type OAuthCredentials,
  type OAuthNonceOptions,
  type OAuthSignatureMethod,
  type RequestToken,
  type TokenCredentials
} from './auth/index.js'

export { DatabaseResource } from './resources/database.js'
export { MarketplaceResource } from './resources/marketplace.js'
export {
  InventoryExportResource,
  type ConditionalRequestOptions,
  type CreateExportResult
} from './resources/inventory-export.js'
export { InventoryUploadResource, type CreateUploadResult } from './resources/inventory-upload.js'
export { UserResource } from './resources/user.js'
export { CollectionResource } from './resources/collection.js'
export { WantlistResource } from './resources/wantlist.js'
export { ListsResource } from './resources/lists.js'

export * from './types/index.js'
