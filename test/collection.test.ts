import { describe, expect, it } from 'vitest'
import { FOLDER_ALL, FOLDER_UNCATEGORIZED } from '../src/index.js'
import { createTestClient } from './helpers.js'

describe('CollectionResource', () => {
  it('exposes the two permanent folder ids', () => {
    expect(FOLDER_ALL).toBe(0)
    expect(FOLDER_UNCATEGORIZED).toBe(1)
  })

  it('getFolders lists the folders', async () => {
    const { client, fake } = createTestClient({
      body: { folders: [{ id: 0, name: 'All', count: 23 }] }
    })

    const { folders } = await client.collection.getFolders('rodneyfool')

    expect(folders[0]?.name).toBe('All')
    expect(fake.lastRequest().target).toBe('/users/rodneyfool/collection/folders')
  })

  it('createFolder POSTs the folder name', async () => {
    const { client, fake } = createTestClient({
      status: 201,
      body: { id: 232842, name: 'My Music', count: 0 }
    })

    await client.collection.createFolder('rodneyfool', 'My Music')

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/users/rodneyfool/collection/folders')
    expect(fake.lastJsonBody()).toEqual({ name: 'My Music' })
  })

  it('getFolder requests a single folder', async () => {
    const { client, fake } = createTestClient({ body: { id: 3 } })

    await client.collection.getFolder('rodneyfool', 3)

    expect(fake.lastRequest().target).toBe('/users/rodneyfool/collection/folders/3')
  })

  it('editFolder POSTs the new name', async () => {
    const { client, fake } = createTestClient({ body: { id: 392, name: 'An Example Folder' } })

    await client.collection.editFolder('rodneyfool', 392, 'An Example Folder')

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/users/rodneyfool/collection/folders/392')
    expect(fake.lastJsonBody()).toEqual({ name: 'An Example Folder' })
  })

  it('deleteFolder DELETEs the folder', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.collection.deleteFolder('rodneyfool', 3)

    const request = fake.lastRequest()
    expect(request.method).toBe('DELETE')
    expect(request.target).toBe('/users/rodneyfool/collection/folders/3')
  })

  it('getItemsByRelease uses the collection/releases path', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, releases: [] } })

    await client.collection.getItemsByRelease('susan.salkeld', 7781525)

    expect(fake.lastRequest().target).toBe('/users/susan.salkeld/collection/releases/7781525')
  })

  it('getItemsByFolder forwards sort parameters and parses array notes', async () => {
    const { client, fake } = createTestClient({
      body: {
        pagination: { page: 1, pages: 1, items: 1, per_page: 50, urls: {} },
        releases: [
          {
            id: 2464521,
            instance_id: 1,
            folder_id: 1,
            rating: 0,
            basic_information: {
              id: 2464521,
              title: 'x',
              year: 2012,
              artists: [],
              labels: [],
              formats: []
            },
            notes: [{ field_id: 3, value: 'bleep bloop blorp.' }]
          }
        ]
      }
    })

    const { releases } = await client.collection.getItemsByFolder('rodneyfool', 3, {
      sort: 'artist',
      sort_order: 'desc',
      per_page: 100
    })

    // Collection notes are an array of field values, unlike the wantlist's plain string.
    expect(releases[0]?.notes?.[0]).toEqual({ field_id: 3, value: 'bleep bloop blorp.' })

    const { url } = fake.lastRequest()
    expect(url.pathname).toBe('/users/rodneyfool/collection/folders/3/releases')
    expect(url.searchParams.get('sort')).toBe('artist')
    expect(url.searchParams.get('per_page')).toBe('100')
  })

  it('addReleaseToFolder POSTs to the nested release path without a body', async () => {
    const { client, fake } = createTestClient({
      status: 201,
      body: { instance_id: 3, resource_url: '' }
    })

    const added = await client.collection.addReleaseToFolder('rodneyfool', 1, 130076)

    expect(added.instance_id).toBe(3)
    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/users/rodneyfool/collection/folders/1/releases/130076')
    expect(request.body).toBeUndefined()
  })

  it('changeInstance POSTs the rating and target folder', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.collection.changeInstance('rodneyfool', 3, 130076, 1, { rating: 5, folder_id: 4 })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe(
      '/users/rodneyfool/collection/folders/3/releases/130076/instances/1'
    )
    expect(fake.lastJsonBody()).toEqual({ rating: 5, folder_id: 4 })
  })

  it('deleteInstance DELETEs the instance', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.collection.deleteInstance('rodneyfool', 3, 130076, 1)

    const request = fake.lastRequest()
    expect(request.method).toBe('DELETE')
    expect(request.target).toBe(
      '/users/rodneyfool/collection/folders/3/releases/130076/instances/1'
    )
  })

  it('getFields returns the dropdown/textarea union', async () => {
    const { client, fake } = createTestClient({
      body: {
        fields: [
          {
            id: 1,
            name: 'Media',
            position: 1,
            type: 'dropdown',
            public: true,
            options: ['Mint (M)']
          },
          { id: 3, name: 'Notes', position: 3, type: 'textarea', public: true, lines: 3 }
        ]
      }
    })

    const { fields } = await client.collection.getFields('rodneyfool')

    const [dropdown, textarea] = fields
    if (dropdown?.type === 'dropdown') expect(dropdown.options).toEqual(['Mint (M)'])
    else expect.fail('expected a dropdown field')
    if (textarea?.type === 'textarea') expect(textarea.lines).toBe(3)
    else expect.fail('expected a textarea field')

    expect(fake.lastRequest().target).toBe('/users/rodneyfool/collection/fields')
  })

  it('editFieldInstance sends the value as a query parameter', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.collection.editFieldInstance('rodneyfool', 3, 130076, 1, 8, 'Mint (M)')

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.url.pathname).toBe(
      '/users/rodneyfool/collection/folders/3/releases/130076/instances/1/fields/8'
    )
    expect(request.url.searchParams.get('value')).toBe('Mint (M)')
  })

  it('getValue returns currency-formatted strings', async () => {
    const { client, fake } = createTestClient({
      body: { maximum: '$250.00', median: '$100.25', minimum: '$75.50' }
    })

    const value = await client.collection.getValue('rodneyfool')

    expect(value.median).toBe('$100.25')
    expect(fake.lastRequest().target).toBe('/users/rodneyfool/collection/value')
  })
})
