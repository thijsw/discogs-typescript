/**
 * The User Identity section: the authenticated user, profiles, submissions and contributions.
 *
 * @see https://www.discogs.com/developers/#page:user-identity
 * @module
 */

import type { DiscogsClient } from '../client.js'
import { encodePathSegment, type QueryParams } from '../http.js'
import type { PaginationParams } from '../types/common.js'
import type {
  ContributionsResponse,
  EditProfileParams,
  GetContributionsParams,
  Identity,
  SubmissionsResponse,
  UserProfile
} from '../types/user.js'

/**
 * User identity endpoints.
 *
 * Reachable as `client.user`.
 */
export class UserResource {
  readonly #client: DiscogsClient

  constructor(client: DiscogsClient) {
    this.#client = client
  }

  /**
   * Gets basic information about the authenticated user — useful as a credentials check at
   * the end of the OAuth flow.
   *
   * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-identity
   */
  getIdentity(): Promise<Identity> {
    return this.#client.requestData<Identity>({ path: '/oauth/identity' })
  }

  /**
   * Gets a user's profile.
   *
   * `email` is only returned when authenticated as this user; `num_collection` and
   * `num_wantlist` only when authenticated as this user or when the list in question is
   * public.
   *
   * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-profile
   */
  getProfile(username: string): Promise<UserProfile> {
    return this.#client.requestData<UserProfile>({
      path: `/users/${encodePathSegment(username)}`
    })
  }

  /**
   * Edits a user's profile. Requires authentication as that user.
   *
   * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-profile-post
   */
  editProfile(username: string, params: EditProfileParams): Promise<UserProfile> {
    return this.#client.requestData<UserProfile>({
      method: 'POST',
      path: `/users/${encodePathSegment(username)}`,
      body: params
    })
  }

  /**
   * Lists the database entries a user has submitted, grouped into artists, labels and
   * releases.
   *
   * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-user-submissions
   */
  getSubmissions(username: string, params: PaginationParams = {}): Promise<SubmissionsResponse> {
    return this.#client.requestData<SubmissionsResponse>({
      path: `/users/${encodePathSegment(username)}/submissions`,
      query: params as QueryParams
    })
  }

  /**
   * Lists a user's contributions — the releases they have edited or added to.
   *
   * @see https://www.discogs.com/developers/#page:user-identity,header:user-identity-user-contributions
   */
  getContributions(
    username: string,
    params: GetContributionsParams = {}
  ): Promise<ContributionsResponse> {
    return this.#client.requestData<ContributionsResponse>({
      path: `/users/${encodePathSegment(username)}/contributions`,
      query: params as QueryParams
    })
  }
}
