/**
 * Request a CSV export of your inventory, wait for it, and download it — then show how a bulk
 * upload would be submitted.
 *
 * Requires authentication as the inventory owner.
 *
 * Run with:
 *   DISCOGS_TOKEN=… pnpm tsx examples/inventory.ts
 */

import { setTimeout as sleep } from 'node:timers/promises'
import { DiscogsClient, DiscogsError } from '../src/index.js'

const token = process.env['DISCOGS_TOKEN']
if (!token) throw new Error('Set DISCOGS_TOKEN to a personal access token.')

const client = new DiscogsClient({
  userAgent: 'DiscogsTsExample/0.1 +https://github.com/example/discogs-typescript',
  auth: { token }
})

// Exports are asynchronous. A 409 means one is already running.
let exportId: number | null
try {
  const created = await client.inventoryExport.create()
  exportId = created.id
  console.log(`Requested export ${String(exportId)}`)
} catch (error) {
  if (error instanceof DiscogsError && error.status === 409) {
    console.log('An export is already in progress; using the most recent one.')
    const recent = await client.inventoryExport.list({ per_page: 1 })
    exportId = recent.items[0]?.id ?? null
  } else {
    throw error
  }
}

if (exportId === null) throw new Error('No export id available.')

// Poll until it finishes.
for (let attempt = 0; attempt < 20; attempt++) {
  const status = await client.inventoryExport.get(exportId)
  console.log(`  status: ${status?.status ?? 'unknown'}`)
  if (status?.finished_ts) break
  await sleep(3000)
}

const csv = await client.inventoryExport.downloadCsv(exportId)
console.log(`\nDownloaded ${String(csv.split('\n').length - 1)} rows.`)
console.log(csv.split('\n').slice(0, 3).join('\n'))

// Bulk changes go the other way, as a multipart CSV upload. Uncomment to actually run it —
// this modifies your live inventory.
//
// const upload = await client.inventoryUpload.change(
//   'release_id,price,comments\n249504,12.50,Price drop\n',
// );
// console.log(`Submitted upload ${String(upload.id)}`);
// const result = await client.inventoryUpload.get(upload.id!);
// console.log(result?.results);

const uploads = await client.inventoryUpload.list({ per_page: 3 })
console.log(`\nRecent uploads: ${String(uploads.pagination.items)}`)
for (const item of uploads.items) {
  console.log(`  ${String(item.id)}  ${item.type.padEnd(6)} ${item.status}  ${item.filename}`)
}
