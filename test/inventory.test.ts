import { describe, expect, it } from 'vitest'
import { buildUploadFormData } from '../src/resources/inventory-upload.js'
import { createTestClient } from './helpers.js'

describe('InventoryExportResource', () => {
  it('create POSTs and parses the export id out of the Location header', async () => {
    const { client, fake } = createTestClient({
      headers: { Location: 'https://api.discogs.com/inventory/export/599632' }
    })

    const result = await client.inventoryExport.create()

    expect(result.id).toBe(599632)
    expect(result.location).toBe('https://api.discogs.com/inventory/export/599632')
    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/inventory/export')
  })

  it('create reports a null id when Discogs sends no Location header', async () => {
    const { client } = createTestClient({})

    const result = await client.inventoryExport.create()

    expect(result).toEqual({ id: null, location: null })
  })

  it('list uses `items` as the collection key', async () => {
    const { client, fake } = createTestClient({
      body: {
        items: [{ id: 599632, status: 'success', filename: 'inventory.csv' }],
        pagination: { page: 1, pages: 1, items: 15, per_page: 50, urls: {} }
      }
    })

    const exports = await client.inventoryExport.list({ per_page: 10 })

    expect(exports.items[0]?.id).toBe(599632)
    // pagination.items is a count; the collection lives in the top-level `items` key.
    expect(exports.pagination.items).toBe(15)
    expect(fake.lastRequest().target).toBe('/inventory/export?per_page=10')
  })

  it('get sends If-Modified-Since when given a Date', async () => {
    const since = new Date(Date.UTC(2018, 8, 27, 12, 50, 39))
    const { client, fake } = createTestClient({ body: { id: 599632, status: 'success' } })

    await client.inventoryExport.get(599632, { ifModifiedSince: since })

    const request = fake.lastRequest()
    expect(request.target).toBe('/inventory/export/599632')
    expect(request.headers.get('If-Modified-Since')).toBe(since.toUTCString())
  })

  it('get resolves to null on 304 Not Modified', async () => {
    const { client } = createTestClient({ status: 304 })

    await expect(
      client.inventoryExport.get(599632, { ifModifiedSince: 'Thu, 27 Sep 2018 12:50:39 GMT' })
    ).resolves.toBeNull()
  })

  it('downloadCsv returns the raw CSV text', async () => {
    const csv = 'release_id,price\n1,2.50\n'
    const { client, fake } = createTestClient({
      text: csv,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' }
    })

    await expect(client.inventoryExport.downloadCsv(599632)).resolves.toBe(csv)
    expect(fake.lastRequest().target).toBe('/inventory/export/599632/download')
  })

  it('downloadRaw hands back the untouched Response', async () => {
    const { client } = createTestClient({
      text: 'a,b\n1,2\n',
      headers: { 'Content-Disposition': 'attachment; filename=inventory.csv' }
    })

    const response = await client.inventoryExport.downloadRaw(599632)

    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename=inventory.csv')
    await expect(response.text()).resolves.toBe('a,b\n1,2\n')
  })
})

describe('InventoryUploadResource', () => {
  it('buildUploadFormData wraps CSV text in a text/csv part named "upload"', async () => {
    const form = buildUploadFormData('listing_id\n1\n', 'delete.csv')

    const file = form.get('upload')
    expect(file).toBeInstanceOf(Blob)
    expect((file as File).name).toBe('delete.csv')
    expect((file as Blob).type).toBe('text/csv')
    await expect((file as Blob).text()).resolves.toBe('listing_id\n1\n')
  })

  it.each([
    [
      'add',
      (c: ReturnType<typeof createTestClient>['client']) =>
        c.inventoryUpload.add('release_id,price,media_condition\n1,2.50,Mint (M)\n')
    ],
    [
      'change',
      (c: ReturnType<typeof createTestClient>['client']) =>
        c.inventoryUpload.change('release_id,price\n1,3.50\n')
    ],
    [
      'delete',
      (c: ReturnType<typeof createTestClient>['client']) =>
        c.inventoryUpload.delete('listing_id\n12345678\n')
    ]
  ])('%s POSTs multipart form data and parses the upload id', async (kind, call) => {
    const { client, fake } = createTestClient({
      headers: { Location: 'https://api.discogs.com/inventory/upload/119615' }
    })

    const result = await call(client)

    expect(result.id).toBe(119615)
    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe(`/inventory/upload/${kind}`)
    expect(request.body).toBeInstanceOf(FormData)
    // fetch must set the multipart boundary itself, so we must not set Content-Type.
    expect(request.headers.get('Content-Type')).toBeNull()
  })

  it('accepts a Blob directly', async () => {
    const { client, fake } = createTestClient({})

    await client.inventoryUpload.add(new Blob(['listing_id\n1\n'], { type: 'text/csv' }))

    const body = fake.lastRequest().body as FormData
    await expect((body.get('upload') as Blob).text()).resolves.toBe('listing_id\n1\n')
  })

  it('list uses `items` as the collection key', async () => {
    const { client, fake } = createTestClient({
      body: {
        items: [{ id: 119615, status: 'success', type: 'change' }],
        pagination: { page: 1, pages: 1, items: 1, per_page: 50, urls: {} }
      }
    })

    const uploads = await client.inventoryUpload.list()

    expect(uploads.items[0]?.type).toBe('change')
    expect(fake.lastRequest().target).toBe('/inventory/upload')
  })

  it('get reads an upload status', async () => {
    const { client, fake } = createTestClient({ body: { id: 119615, status: 'success' } })

    const upload = await client.inventoryUpload.get(119615)

    expect(upload?.id).toBe(119615)
    expect(fake.lastRequest().target).toBe('/inventory/upload/119615')
  })
})
