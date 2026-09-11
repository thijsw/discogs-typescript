/**
 * Find highly rated releases with an affordable copy on the marketplace.
 *
 * This composes three endpoints, because Discogs has no single one that does the job:
 *
 *   1. `database.search` finds candidate releases by genre, style and format.
 *   2. `database.getCommunityReleaseRating` supplies the rating — search results carry
 *      `community.want`/`have` but no rating, so this costs one call per candidate.
 *   3. `marketplace.getReleaseStats` reports how many copies are for sale and the lowest
 *      asking price.
 *
 * **On filtering by where a seller ships:** you cannot, and this script does not try. The
 * Discogs API has no marketplace search — listings are only reachable by id
 * (`marketplace.getListing`) or by seller (`marketplace.getInventory`), and no endpoint
 * exposes a seller's ships-to countries. A listing carries `ships_from` /
 * `ships_from_country_code` and a free-text `seller.shipping` policy, nothing more. So this
 * gets you as far as "a cheap copy of this exists"; which seller has it, and whether they
 * post to you, is a question for the website.
 *
 * Run with:
 *   DISCOGS_TOKEN=… pnpm tsx examples/crate-digging.ts
 *
 * Tune it with:
 *   GENRE=Electronic STYLE=Techno FORMAT=CD MAX_PRICE=15 MIN_RATING=4.2 MIN_VOTES=25 \
 *   CURRENCY=EUR PAGES=2 DISCOGS_TOKEN=… pnpm tsx examples/crate-digging.ts
 */

import {
  DiscogsClient,
  DiscogsNotFoundError,
  DiscogsRateLimitError,
  type Currency,
  type SearchParams,
  type SearchResult
} from '../src/index.js'

const token = process.env['DISCOGS_TOKEN']
if (!token) throw new Error('Set DISCOGS_TOKEN to a personal access token.')

const GENRE = process.env['GENRE'] ?? 'Electronic'
const STYLE = process.env['STYLE'] ?? ''
const FORMAT = process.env['FORMAT'] ?? 'CD'
const MAX_PRICE = Number(process.env['MAX_PRICE'] ?? '15')
const MIN_RATING = Number(process.env['MIN_RATING'] ?? '4.2')
const MIN_VOTES = Number(process.env['MIN_VOTES'] ?? '25')
const CURRENCY = (process.env['CURRENCY'] ?? 'EUR') as Currency
const PAGES = Number(process.env['PAGES'] ?? '2')

/** Pause once the remaining allowance drops this low, rather than earning a 429. */
const THROTTLE_FLOOR = 4
/** Discogs measures its limit over a 60-second moving average, so that is the wait. */
const WINDOW_MS = 60_000

const client = new DiscogsClient({
  userAgent: 'DiscogsTsExample/0.1 +https://github.com/example/discogs-typescript',
  auth: { token }
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Waits out the window when the allowance is nearly spent. */
async function throttle(): Promise<void> {
  const limit = client.rateLimit
  if (limit && limit.remaining <= THROTTLE_FLOOR) {
    console.log(`  … ${String(limit.remaining)} requests left, waiting out the window`)
    await sleep(WINDOW_MS)
  }
}

/**
 * Runs a call, waiting out a 429 and treating a 404 as "no data". Everything else is a real
 * failure and propagates.
 */
async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
  for (let tries = 0; tries < 2; tries++) {
    await throttle()
    try {
      return await fn()
    } catch (error) {
      if (error instanceof DiscogsNotFoundError) return null
      if (error instanceof DiscogsRateLimitError) {
        console.log('  … rate limited, waiting out the window')
        await sleep(WINDOW_MS)
        continue
      }
      throw error
    }
  }
  return null
}

// A popular album has a dozen pressings, each its own release. Key by master where there is
// one so the same record is only priced once.
const candidates = new Map<number, SearchResult>()

for (let page = 1; page <= PAGES; page++) {
  const params: SearchParams = {
    type: 'release',
    genre: GENRE,
    format: FORMAT,
    per_page: 100,
    page
  }
  if (STYLE) params.style = STYLE

  const response = await attempt(() => client.database.search(params))
  if (!response) break

  for (const result of response.results) {
    // Results come back roughly by relevance, so the first pressing of a master is the one
    // worth keeping — later ones are reissues and repressings of the same record.
    const key = result.master_id ?? result.id
    if (!candidates.has(key)) candidates.set(key, result)
  }

  if (page >= response.pagination.pages) break
}

console.log(
  `Scanned ${String(PAGES)} page(s) of ${GENRE}${STYLE ? ` / ${STYLE}` : ''} on ${FORMAT} — ` +
    `${String(candidates.size)} distinct releases.`
)
console.log(
  `Keeping those rated ≥ ${String(MIN_RATING)} by ≥ ${String(MIN_VOTES)} people with a copy ` +
    `at ≤ ${String(MAX_PRICE)} ${CURRENCY}.\n`
)

interface Hit {
  title: string
  year: string
  rating: number
  votes: number
  price: number
  forSale: number
  uri: string
}

const hits: Hit[] = []
let checked = 0

/** Overwrites a single progress line, but only where that renders — not when piped. */
function progress(line: string): void {
  if (process.stdout.isTTY) process.stdout.write(`\r${line.padEnd(40, ' ')}`)
}

for (const release of candidates.values()) {
  checked++
  progress(`  checking ${String(checked)}/${String(candidates.size)}…`)

  const community = await attempt(() => client.database.getCommunityReleaseRating(release.id))
  if (!community) continue
  const { average, count } = community.rating
  if (average < MIN_RATING || count < MIN_VOTES) continue

  const stats = await attempt(() =>
    client.marketplace.getReleaseStats(release.id, { curr_abbr: CURRENCY })
  )
  if (!stats?.lowest_price || stats.num_for_sale === null) continue
  if (stats.lowest_price.value > MAX_PRICE) continue

  hits.push({
    title: release.title,
    year: release.year ?? '????',
    rating: average,
    votes: count,
    price: stats.lowest_price.value,
    forSale: stats.num_for_sale,
    uri: release.uri
  })
}

progress('')

hits.sort((a, b) => b.rating - a.rating || a.price - b.price)

if (hits.length === 0) {
  console.log('Nothing matched. Loosen MIN_RATING or raise MAX_PRICE.')
} else {
  console.log(`${String(hits.length)} match(es):\n`)
  for (const hit of hits) {
    const price = `${hit.price.toFixed(2)} ${CURRENCY}`
    console.log(`  ${hit.title} (${hit.year})`)
    console.log(
      `    ${hit.rating.toFixed(2)}★ from ${String(hit.votes)} · ` +
        `${price} · ${String(hit.forSale)} for sale`
    )
    console.log(`    https://www.discogs.com${hit.uri}`)
  }
}

console.log('\nRate limit:', client.rateLimit)
