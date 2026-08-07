/**
 * Read a seller's inventory, price suggestions and orders.
 *
 * Price suggestions require the authenticated user to have completed their seller settings;
 * orders require authentication as the seller.
 *
 * Run with:
 *   DISCOGS_TOKEN=… DISCOGS_USERNAME=… pnpm tsx examples/marketplace.ts
 */

import { DiscogsClient, DiscogsError, MEDIA_CONDITIONS } from '../src/index.js'

const token = process.env['DISCOGS_TOKEN']
const username = process.env['DISCOGS_USERNAME']
if (!token || !username) throw new Error('Set DISCOGS_TOKEN and DISCOGS_USERNAME.')

const client = new DiscogsClient({
  userAgent: 'DiscogsTsExample/0.1 +https://github.com/example/discogs-typescript',
  auth: { token }
})

const inventory = await client.marketplace.getInventory(username, {
  status: 'For Sale',
  sort: 'price',
  sort_order: 'desc',
  per_page: 5
})

console.log(`Inventory: ${String(inventory.pagination.items)} items for sale`)
for (const listing of inventory.listings) {
  const price = `${listing.price.currency} ${String(listing.price.value)}`
  console.log(`  ${String(listing.id)}  ${price.padEnd(12)} ${listing.release.description}`)
}

// Marketplace statistics and fees need no seller account.
const stats = await client.marketplace.getReleaseStats(249504, { curr_abbr: 'EUR' })
console.log(
  `\nRelease 249504: ${String(stats.num_for_sale ?? 0)} for sale, ` +
    `lowest ${stats.lowest_price ? String(stats.lowest_price.value) : 'n/a'}`
)

const fee = await client.marketplace.getFee(20, 'EUR')
console.log(`Discogs fee on a EUR 20 sale: ${String(fee.value)} ${fee.currency}`)

// Price suggestions come back keyed by condition, and are empty when Discogs has no data.
try {
  const suggestions = await client.marketplace.getPriceSuggestions(249504)
  console.log('\nSuggested prices:')
  for (const condition of MEDIA_CONDITIONS) {
    const price = suggestions[condition]
    if (price)
      console.log(`  ${condition.padEnd(22)} ${String(price.value.toFixed(2))} ${price.currency}`)
  }
} catch (error) {
  if (error instanceof DiscogsError)
    console.log(`\nPrice suggestions unavailable: ${error.message}`)
  else throw error
}

const orders = await client.marketplace.listOrders({
  status: 'All',
  sort: 'last_activity',
  per_page: 5
})
console.log(`\nOrders: ${String(orders.pagination.items)}`)
for (const order of orders.orders) {
  console.log(
    `  ${order.id}  ${order.status.padEnd(20)} ${order.total.currency} ${String(order.total.value)}`
  )
  // Discogs decides per order which statuses are reachable next — there is no static table.
  console.log(`    next: ${order.next_status.join(', ')}`)
}
