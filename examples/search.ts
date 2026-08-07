/**
 * Search the Discogs database and read a release.
 *
 * Search requires authentication as any user, so a personal access token is the simplest way
 * to run this. Generate one at https://www.discogs.com/settings/developers.
 *
 * Run with:
 *   DISCOGS_TOKEN=… pnpm tsx examples/search.ts
 */

import { DiscogsClient } from '../src/index.js'

const token = process.env['DISCOGS_TOKEN']
if (!token) throw new Error('Set DISCOGS_TOKEN to a personal access token.')

const client = new DiscogsClient({
  userAgent: 'DiscogsTsExample/0.1 +https://github.com/example/discogs-typescript',
  auth: { token }
})

const results = await client.database.search({
  artist: 'nirvana',
  release_title: 'nevermind',
  type: 'release',
  per_page: 5
})

console.log(
  `${String(results.pagination.items)} results, showing ${String(results.results.length)}:`
)
for (const result of results.results) {
  console.log(`  ${String(result.id)}  ${result.title} (${result.year ?? '????'})`)
}

// Every response carries the rate-limit headers.
console.log('Rate limit:', client.rateLimit)

const first = results.results[0]
if (first) {
  const release = await client.database.getRelease(first.id, { curr_abbr: 'EUR' })
  console.log(`\n${release.title} — ${release.artists.map((a) => a.name).join(', ')}`)
  console.log(
    `  ${String(release.tracklist.length)} tracks, lowest price ${String(release.lowest_price)}`
  )

  const stats = await client.database.getReleaseStats(release.id)
  console.log(`  ${String(stats.num_have)} have, ${String(stats.num_want)} want`)
}
