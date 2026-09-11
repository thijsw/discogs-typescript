# discogs-typescript

A modern, fully typed, zero-dependency TypeScript client for the [Discogs API v2](https://www.discogs.com/developers/).

Covers **every endpoint in the Discogs documentation** — all 60 of them, across Database,
Marketplace, Inventory Export, Inventory Upload, User Identity, User Collection, User Wantlist
and User Lists — plus all three authentication schemes.

- **Zero runtime dependencies.** Nothing but the platform.
- **Isomorphic.** Global `fetch` and Web Crypto only — Node 18+, Deno, Bun, browsers and edge
  runtimes. No Node built-ins are imported.
- **Fully typed.** Hand-written interfaces for every request and response, with string-literal
  unions for conditions, currencies, order statuses and sort keys.
- **ESM only**, with a single rolled-up `.d.ts`. There is no CommonJS build, though Node
  22.12+ can still `require()` it via `require(esm)` — the bundle has no top-level await.

## Install

```bash
pnpm add discogs-typescript
```

## Quick start

```ts
import { DiscogsClient } from 'discogs-typescript'

const client = new DiscogsClient({
  // Required — Discogs returns an empty response to requests without a User-Agent.
  userAgent: 'MyApp/1.0 +https://example.com',
  auth: { token: process.env.DISCOGS_TOKEN! }
})

const release = await client.database.getRelease(249504)
console.log(release.title, release.artists[0]?.name)

const results = await client.database.search({ artist: 'nirvana', type: 'release' })
```

The `userAgent` is not optional politeness — Discogs answers requests without one with an
empty body, and rejects strings that look like a browser or a generic HTTP library. Use
something like `MyDiscogsClient/1.0 +https://mydiscogsclient.org`.

## Authentication

All three schemes from the [authentication docs](https://www.discogs.com/developers/#page:authentication)
are supported. What you can do depends on which you pick:

| Credentials             | Rate limit | Image URLs | Acts as a user              |
| ----------------------- | ---------- | ---------- | --------------------------- |
| none                    | 25/min     | no         | no                          |
| consumer key + secret   | 60/min     | yes        | no                          |
| personal access token   | 60/min     | yes        | the token holder            |
| OAuth 1.0a access token | 60/min     | yes        | any user who granted access |

### Personal access token

The simplest option for scripts acting on your own account. Generate one under
[Developer Settings](https://www.discogs.com/settings/developers).

```ts
new DiscogsClient({ userAgent, auth: { token: 'abcxyz123456' } })
```

### Consumer key and secret

Raises your rate limit and unlocks image URLs, but authenticates you as nobody — endpoints
that touch a user's data still need a token or OAuth.

```ts
new DiscogsClient({ userAgent, auth: { consumerKey: 'foo123', consumerSecret: 'bar456' } })
```

### OAuth 1.0a

To act on behalf of other users, run the three-legged flow with `DiscogsOAuth`:

```ts
import { DiscogsClient, DiscogsOAuth } from 'discogs-typescript'

const oauth = new DiscogsOAuth({ consumerKey, consumerSecret, userAgent })

// 1. Temporary request token (valid 15 minutes). Pass 'oob' if you have no callback URL.
const request = await oauth.getRequestToken('https://example.com/callback')

// 2. Send the user here to approve your app.
console.log(oauth.getAuthorizeUrl(request.oauthToken))

// 3. Discogs redirects back with ?oauth_verifier=… — exchange it.
const access = await oauth.getAccessToken({
  oauthToken: request.oauthToken,
  oauthTokenSecret: request.oauthTokenSecret,
  verifier
})

// 4. Access tokens do not expire unless the user revokes them. Store and reuse.
const client = new DiscogsClient({
  userAgent,
  auth: {
    consumerKey,
    consumerSecret,
    accessToken: access.oauthToken,
    accessTokenSecret: access.oauthTokenSecret
  }
})

await client.user.getIdentity() // confirms who you are authenticated as
```

Requests are signed with `PLAINTEXT` by default, which is what the Discogs docs recommend —
everything runs over HTTPS anyway. Pass `signatureMethod: 'HMAC-SHA1'` in the auth object to
sign with HMAC-SHA1 instead (computed via Web Crypto).

You can also supply your own strategy:

```ts
const client = new DiscogsClient({
  userAgent,
  auth: { authorize: ({ headers }) => headers.set('Authorization', 'Discogs token=…') }
})
```

## Endpoints

Every resource mirrors a section of the Discogs documentation.

### `client.database`

`getRelease` · `getReleaseRating` · `updateReleaseRating` · `deleteReleaseRating` ·
`getCommunityReleaseRating` · `getReleaseStats` · `getMaster` · `getMasterVersions` ·
`getArtist` · `getArtistReleases` · `getLabel` · `getLabelReleases` · `search`

```ts
const versions = await client.database.getMasterVersions(1000, {
  country: 'Belgium',
  sort: 'released',
  sort_order: 'asc'
})

// Artist discographies mix masters and releases, discriminated by `type`.
const { releases } = await client.database.getArtistReleases(108713, { sort: 'year' })
for (const item of releases) {
  if (item.type === 'master') console.log(item.main_release)
  else console.log(item.format, item.label)
}
```

`search` requires authentication as any user — an unauthenticated search fails with a 401.

### `client.marketplace`

`getInventory` · `getListing` · `createListing` · `editListing` · `deleteListing` ·
`getOrder` · `editOrder` · `listOrders` · `getOrderMessages` · `addOrderMessage` · `getFee` ·
`getPriceSuggestions` · `getReleaseStats`

```ts
const { listing_id } = await client.marketplace.createListing({
  release_id: 249504,
  condition: 'Near Mint (NM or M-)',
  sleeve_condition: 'Very Good Plus (VG+)',
  price: 12.5,
  status: 'For Sale',
  weight: 'auto' // or a number of grams
})

const fee = await client.marketplace.getFee(20, 'EUR') // omit the currency for USD
```

Order ids are **strings** of the form `"1-1"`, not numbers. Which statuses an order can move
to is decided per order — read `order.next_status` rather than assuming a fixed table. Setting
`shipping` invoices the buyer and forces the status to `Invoice Sent`, so `shipping` and
`status` cannot be sent in the same `editOrder` call.

Order messages are a discriminated union on `type`:

```ts
const { messages } = await client.marketplace.getOrderMessages('1-1')
for (const message of messages) {
  if (message.type === 'shipping') console.log(message.original, '→', message.new)
  else if (message.type === 'status') console.log(message.status_id, message.actor.username)
}
```

### `client.user`

`getIdentity` · `getProfile` · `editProfile` · `getSubmissions` · `getContributions`

### `client.collection`

`getFolders` · `createFolder` · `getFolder` · `editFolder` · `deleteFolder` ·
`getItemsByRelease` · `getItemsByFolder` · `addReleaseToFolder` · `changeInstance` ·
`deleteInstance` · `getFields` · `editFieldInstance` · `getValue`

Folder `0` is the permanent "All" folder (nothing can be added to it) and folder `1` is
"Uncategorized"; both are exported as `FOLDER_ALL` and `FOLDER_UNCATEGORIZED`. Because a user
may own several copies of the same release, each copy in a folder is an _instance_ with its
own `instance_id`.

```ts
const { instance_id } = await client.collection.addReleaseToFolder(username, 1, 249504)
await client.collection.changeInstance(username, 1, 249504, instance_id, { rating: 5 })
// Move it elsewhere by passing the destination as folder_id in the body:
await client.collection.changeInstance(username, 1, 249504, instance_id, { folder_id: 4 })
```

### `client.wantlist`

`getWants` · `addToWantlist` · `editWantlistItem` · `removeFromWantlist`

Note that `notes` is a plain string on wantlist items, but an array of custom-field values on
collection items. That asymmetry is in the API, and the types reflect it.

### `client.lists`

`getUserLists` · `getList`

The index and detail endpoints name their fields differently — `date_added`/`date_changed`/
`id`/`uri` versus `created_ts`/`modified_ts`/`list_id`/`url`. Again, that is the API, not a
transcription slip.

### `client.inventoryExport` and `client.inventoryUpload`

`create` · `list` · `get` · `downloadCsv` · `downloadRaw`, and
`add` · `change` · `delete` · `list` · `get`.

Both are asynchronous job APIs: submit, then poll.

```ts
const { id } = await client.inventoryExport.create() // 409 if one is already running
const status = await client.inventoryExport.get(id!)
if (status?.finished_ts) {
  const csv = await client.inventoryExport.downloadCsv(id!)
}

await client.inventoryUpload.add(
  'release_id,price,media_condition\n249504,12.50,Near Mint (NM or M-)\n'
)
```

Upload CSVs must be comma-separated with a lower-case header row. `add` requires `release_id`,
`price` and `media_condition`; `change` requires `release_id` plus at least one field to
change; `delete` takes only `listing_id`.

Both `get` methods accept `ifModifiedSince` and resolve to `null` on a `304 Not Modified`.

## Pagination

Paginated endpoints take `page` and `per_page` (default 50, maximum 100) and return a
`pagination` object. Walking pages is left to you:

```ts
let page = 1
for (;;) {
  const result = await client.database.getLabelReleases(1, { page, per_page: 100 })
  for (const release of result.releases) console.log(release.title)
  if (page >= result.pagination.pages) break
  page++
}
```

Discogs also sends an RFC 5988 `Link` header, which `parseLinkHeader` will read if you are
working with a raw response.

## Rate limits

Discogs throttles by source IP over a rolling 60-second window: 60 requests per minute
authenticated, 25 unauthenticated. Exceeding it returns a 429, which this client raises as a
`DiscogsRateLimitError` carrying the headers that came with it.

This client does **not** queue or retry for you — it reports what the server said and lets
you decide. There are three ways to read that, in rough order of how often you will want them.

**`onResponse`** — fires after every request, before the body is read. This is the one to
reach for. It is the only accurate option while requests overlap, and it gives you the whole
response, so you always know which call the numbers belong to:

```ts
const client = new DiscogsClient({
  userAgent,
  onResponse: ({ response, rateLimit }) => {
    // response.url, .status and .headers are all available here
    if (rateLimit && rateLimit.remaining < 5) console.warn('Slow down —', response.url)
  }
})
```

**`client.rateLimit`** — the most recent response's values, for a quick check between batches.
Because it only ever reflects the last response, it is racy under concurrency: with several
requests in flight you cannot tell which one it came from. Fine for a sequential script,
wrong for anything parallel.

```ts
await client.database.getRelease(249504)
console.log(client.rateLimit) // { limit: 60, used: 13, remaining: 47 }
```

**[`client.request()`](#escape-hatch)** — returns `{ data, response, rateLimit }` for a single
call, when you want the metadata inline rather than in a hook.

Resource methods deliberately return the parsed body rather than that envelope: paying a
`.data` on all 60 of them to carry metadata most calls ignore is not a good trade, and
`onResponse` covers the case better anyway.

## Errors

Every non-2xx response throws a `DiscogsError` subclass carrying the status, the parsed body
and the raw `Response`. The message is taken from the API's `{ "message": … }` payload.

```ts
import { DiscogsError, DiscogsNotFoundError, DiscogsRateLimitError } from 'discogs-typescript'

try {
  await client.database.getRelease(1)
} catch (error) {
  if (error instanceof DiscogsNotFoundError)
    console.log(error.message) // "Release not found."
  else if (error instanceof DiscogsRateLimitError) console.log(error.rateLimit)
  else if (error instanceof DiscogsError) console.log(error.status, error.body)
  else throw error
}
```

`DiscogsAuthenticationError` (401), `DiscogsPermissionError` (403), `DiscogsNotFoundError`
(404), `DiscogsMethodNotAllowedError` (405), `DiscogsValidationError` (422),
`DiscogsRateLimitError` (429) and `DiscogsServerError` (5xx) all extend `DiscogsError`.

## Escape hatch

Anything the typed resources do not cover — and the response headers they discard — is
reachable through `request`:

```ts
const { data, response, rateLimit } = await client.request<Release>({
  method: 'GET',
  path: '/releases/249504',
  query: { curr_abbr: 'EUR' }
})
console.log(response.headers.get('Link'))
```

## Other options

```ts
new DiscogsClient({
  userAgent,
  auth,
  baseUrl: 'https://api.discogs.com', // point at a proxy or a mock server
  mediaType: 'plaintext', // 'discogs' (default) | 'html' | 'plaintext'
  fetch: myFetch, // inject a custom fetch
  onResponse
})
```

`mediaType` selects the `Accept` header, which controls how Discogs renders markup inside text
fields such as release notes and artist profiles.

## Development

```bash
pnpm install
pnpm test          # vitest, no network access
pnpm typecheck
pnpm lint
pnpm build         # vite library build → dist/
```

Runnable examples live in [`examples/`](./examples) — `pnpm tsx examples/search.ts` and
friends. They talk to the real API and need credentials in the environment.

TypeScript is deliberately held at 5.x while the rest of the toolchain tracks latest:
typescript-eslint refuses to load under TS 7 ([#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940))
and `@microsoft/api-extractor` cannot bundle declarations it emits, which would cost both
type-aware linting and the single rolled-up `.d.ts`. Worth revisiting once both support it.

## Releasing

Releases are cut from a git tag. `npm version` writes the new version to `package.json`,
commits it, and creates the matching tag:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

Pushing a `v*` tag runs [`.github/workflows/release.yml`](./.github/workflows/release.yml),
which checks the tag against `package.json`, runs lint, typecheck, tests and the build,
publishes to npm, and opens a GitHub Release with generated notes.

The workflow publishes over [npm trusted publishing](https://docs.npmjs.com/trusted-publishers),
so there is no npm token in the repository — CI exchanges a short-lived GitHub OIDC token for
publish rights, and every release carries a provenance attestation linking the tarball back to
the commit and workflow run that produced it.

## License

MIT
