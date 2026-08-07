/**
 * Walk a user's collection and wantlist.
 *
 * Reading a public collection needs no authentication beyond a token for the image URLs, but
 * folders other than 0 ("All"), private notes fields and the collection value all require
 * authentication as the collection owner.
 *
 * Run with:
 *   DISCOGS_TOKEN=… DISCOGS_USERNAME=… pnpm tsx examples/collection.ts
 */

import { DiscogsClient, FOLDER_ALL } from '../src/index.js'

const token = process.env['DISCOGS_TOKEN']
const username = process.env['DISCOGS_USERNAME']
if (!token || !username) throw new Error('Set DISCOGS_TOKEN and DISCOGS_USERNAME.')

const client = new DiscogsClient({
  userAgent: 'DiscogsTsExample/0.1 +https://github.com/example/discogs-typescript',
  auth: { token }
})

const { folders } = await client.collection.getFolders(username)
console.log('Folders:')
for (const folder of folders) {
  console.log(`  ${String(folder.id).padStart(3)}  ${folder.name} (${String(folder.count)})`)
}

// Folder 0 is the permanent "All" folder. Pagination is manual — read `pagination` to walk.
const page = await client.collection.getItemsByFolder(username, FOLDER_ALL, {
  sort: 'added',
  sort_order: 'desc',
  per_page: 5
})

console.log(`\nMost recently added (page 1 of ${String(page.pagination.pages)}):`)
for (const item of page.releases) {
  const artists = item.basic_information.artists.map((a) => a.name).join(', ')
  console.log(`  ${artists} — ${item.basic_information.title} (rating ${String(item.rating)})`)
}

// Custom notes fields are created on the website; the API can list them and set their values.
const { fields } = await client.collection.getFields(username)
console.log('\nCustom fields:')
for (const field of fields) {
  const detail =
    field.type === 'dropdown'
      ? `${String(field.options.length)} options`
      : `${String(field.lines)} lines`
  console.log(`  ${field.name} (${field.type}, ${detail})`)
}

// Requires authentication as the collection owner.
const value = await client.collection.getValue(username)
console.log(`\nCollection value: ${value.minimum} – ${value.median} – ${value.maximum}`)

const wantlist = await client.wantlist.getWants(username, { per_page: 5 })
console.log(`\nWantlist (${String(wantlist.pagination.items)} items):`)
for (const want of wantlist.wants) {
  console.log(`  ${want.basic_information.title}${want.notes ? ` — ${want.notes}` : ''}`)
}
