import { describe, expect, it } from 'vitest'
import { createTestClient } from './helpers.js'

describe('MarketplaceResource', () => {
  it('getInventory forwards status, sort and pagination', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, listings: [] } })

    await client.marketplace.getInventory('360vinyl', {
      status: 'For Sale',
      sort: 'listed',
      sort_order: 'desc',
      page: 2,
      per_page: 10
    })

    const { url } = fake.lastRequest()
    expect(url.pathname).toBe('/users/360vinyl/inventory')
    expect(url.searchParams.get('status')).toBe('For Sale')
    expect(url.searchParams.get('sort')).toBe('listed')
    expect(url.searchParams.get('sort_order')).toBe('desc')
    expect(url.searchParams.get('per_page')).toBe('10')
  })

  it('getListing forwards curr_abbr', async () => {
    const { client, fake } = createTestClient({ body: { id: 172723812 } })

    await client.marketplace.getListing(172723812, { curr_abbr: 'GBP' })

    expect(fake.lastRequest().target).toBe('/marketplace/listings/172723812?curr_abbr=GBP')
  })

  it('createListing POSTs the listing body as JSON', async () => {
    const { client, fake } = createTestClient({
      status: 201,
      body: {
        listing_id: 41578241,
        resource_url: 'https://api.discogs.com/marketplace/listings/41578241'
      }
    })

    const created = await client.marketplace.createListing({
      release_id: 1,
      condition: 'Mint (M)',
      sleeve_condition: 'Generic',
      price: 42,
      status: 'For Sale',
      allow_offers: true,
      comments: 'Sealed',
      external_id: 'SKU-1',
      location: 'Shelf A',
      weight: 'auto',
      format_quantity: 'auto'
    })

    expect(created.listing_id).toBe(41578241)
    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/marketplace/listings')
    expect(fake.lastJsonBody()).toEqual({
      release_id: 1,
      condition: 'Mint (M)',
      sleeve_condition: 'Generic',
      price: 42,
      status: 'For Sale',
      allow_offers: true,
      comments: 'Sealed',
      external_id: 'SKU-1',
      location: 'Shelf A',
      weight: 'auto',
      format_quantity: 'auto'
    })
  })

  it('editListing POSTs to the listing path and accepts a 204', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.marketplace.editListing(172723812, {
      release_id: 1,
      condition: 'Very Good (VG)',
      price: 10,
      status: 'Draft'
    })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/marketplace/listings/172723812')
    expect(fake.lastJsonBody()).toMatchObject({ status: 'Draft' })
  })

  it('deleteListing DELETEs the listing', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.marketplace.deleteListing(172723812)

    const request = fake.lastRequest()
    expect(request.method).toBe('DELETE')
    expect(request.target).toBe('/marketplace/listings/172723812')
  })

  it('getOrder handles the hyphenated string order id', async () => {
    const { client, fake } = createTestClient({ body: { id: '1-1' } })

    await client.marketplace.getOrder('1-1')

    expect(fake.lastRequest().target).toBe('/marketplace/orders/1-1')
  })

  it('editOrder POSTs status and tracking', async () => {
    const { client, fake } = createTestClient({ body: { id: '1-1', status: 'Shipped' } })

    await client.marketplace.editOrder('1-1', {
      status: 'Shipped',
      tracking: { number: '1Z999', carrier: 'UPS' }
    })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/marketplace/orders/1-1')
    expect(fake.lastJsonBody()).toEqual({
      status: 'Shipped',
      tracking: { number: '1Z999', carrier: 'UPS' }
    })
  })

  it('listOrders forwards status, date filters, archived and sort', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, orders: [] } })

    await client.marketplace.listOrders({
      status: 'Cancelled (Refund Received)',
      created_after: '2019-06-24T20:58:58Z',
      created_before: '2020-06-24T20:58:58Z',
      archived: false,
      sort: 'last_activity',
      sort_order: 'desc'
    })

    const { url } = fake.lastRequest()
    expect(url.pathname).toBe('/marketplace/orders')
    expect(url.searchParams.get('status')).toBe('Cancelled (Refund Received)')
    expect(url.searchParams.get('created_after')).toBe('2019-06-24T20:58:58Z')
    expect(url.searchParams.get('created_before')).toBe('2020-06-24T20:58:58Z')
    // `false` must survive serialization rather than being dropped as falsy.
    expect(url.searchParams.get('archived')).toBe('false')
    expect(url.searchParams.get('sort')).toBe('last_activity')
  })

  it('getOrderMessages forwards pagination and types the union', async () => {
    const { client, fake } = createTestClient({
      body: {
        pagination: { page: 1, pages: 1, items: 2, per_page: 50, urls: {} },
        messages: [
          {
            type: 'shipping',
            original: 0,
            new: 5,
            timestamp: '',
            message: '',
            subject: '',
            order: { id: '1-1', resource_url: '' }
          },
          {
            type: 'status',
            status_id: 6,
            actor: { username: 'a', resource_url: '' },
            timestamp: '',
            message: '',
            subject: '',
            order: { id: '1-1', resource_url: '' }
          }
        ]
      }
    })

    const { messages } = await client.marketplace.getOrderMessages('1-1', { page: 2 })

    const [shipping] = messages
    if (shipping?.type === 'shipping') expect(shipping.new).toBe(5)
    else expect.fail('expected a shipping message')

    expect(fake.lastRequest().target).toBe('/marketplace/orders/1-1/messages?page=2')
  })

  it('addOrderMessage POSTs the message and status together', async () => {
    const { client, fake } = createTestClient({ status: 201, body: { message: 'ok' } })

    await client.marketplace.addOrderMessage('1-1', { message: 'hello world', status: 'Shipped' })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/marketplace/orders/1-1/messages')
    expect(fake.lastJsonBody()).toEqual({ message: 'hello world', status: 'Shipped' })
  })

  it('addOrderMessage rejects a request with neither message nor status', async () => {
    const { client, fake } = createTestClient({ status: 201, body: {} })

    await expect(client.marketplace.addOrderMessage('1-1', {})).rejects.toThrow(TypeError)
    expect(fake.requests).toHaveLength(0)
  })

  // The endpoint 404s unless the price carries exactly two decimals: /marketplace/fee/20 is
  // not found, /marketplace/fee/20.00 is. The Discogs docs never say so.
  it('getFee formats the price to two decimals when no currency is given', async () => {
    const { client, fake } = createTestClient({ body: { value: 0.42, currency: 'USD' } })

    await client.marketplace.getFee(10)

    expect(fake.lastRequest().target).toBe('/marketplace/fee/10.00')
  })

  it('getFee appends the currency segment when one is given', async () => {
    const { client, fake } = createTestClient({ body: { value: 0.42, currency: 'EUR' } })

    await client.marketplace.getFee(10.5, 'EUR')

    expect(fake.lastRequest().target).toBe('/marketplace/fee/10.50/EUR')
  })

  it.each([
    [20, '/marketplace/fee/20.00'],
    [10.5, '/marketplace/fee/10.50'],
    [0, '/marketplace/fee/0.00'],
    [1.005, '/marketplace/fee/1.00'],
    [1234.567, '/marketplace/fee/1234.57']
  ])('getFee renders %p as %s', async (price, expected) => {
    const { client, fake } = createTestClient({ body: { value: 0, currency: 'USD' } })

    await client.marketplace.getFee(price)

    expect(fake.lastRequest().target).toBe(expected)
  })

  it('getPriceSuggestions returns a map keyed by condition', async () => {
    const { client, fake } = createTestClient({
      body: { 'Mint (M)': { currency: 'USD', value: 14.32 } }
    })

    const suggestions = await client.marketplace.getPriceSuggestions(1)

    expect(suggestions['Mint (M)']?.value).toBe(14.32)
    expect(fake.lastRequest().target).toBe('/marketplace/price_suggestions/1')
  })

  it('getReleaseStats forwards curr_abbr and tolerates null fields', async () => {
    const { client, fake } = createTestClient({
      body: { lowest_price: null, num_for_sale: null, blocked_from_sale: true }
    })

    const stats = await client.marketplace.getReleaseStats(1, { curr_abbr: 'JPY' })

    expect(stats.lowest_price).toBeNull()
    expect(stats.blocked_from_sale).toBe(true)
    expect(fake.lastRequest().target).toBe('/marketplace/stats/1?curr_abbr=JPY')
  })
})
