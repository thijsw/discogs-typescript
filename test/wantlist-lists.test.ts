import { describe, expect, it } from 'vitest'
import { createTestClient } from './helpers.js'

describe('WantlistResource', () => {
  it('getWants forwards pagination and exposes notes as a string', async () => {
    const { client, fake } = createTestClient({
      body: {
        pagination: { page: 1, pages: 1, items: 1, per_page: 50, urls: {} },
        wants: [
          {
            id: 1867708,
            rating: 4,
            notes: 'Sample notes.',
            resource_url: '',
            basic_information: {
              id: 1,
              title: 'x',
              year: 2000,
              artists: [],
              labels: [],
              formats: []
            }
          }
        ]
      }
    })

    const { wants } = await client.wantlist.getWants('rodneyfool', { page: 2, per_page: 10 })

    // Wantlist notes are a plain string, unlike the collection's array of field values.
    expect(wants[0]?.notes).toBe('Sample notes.')
    expect(fake.lastRequest().target).toBe('/users/rodneyfool/wants?page=2&per_page=10')
  })

  it('addToWantlist PUTs with notes and rating in the query string', async () => {
    const { client, fake } = createTestClient({ status: 201, body: { id: 130076, rating: 5 } })

    await client.wantlist.addToWantlist('rodneyfool', 130076, {
      notes: 'My favorite release',
      rating: 5
    })

    const request = fake.lastRequest()
    expect(request.method).toBe('PUT')
    expect(request.url.pathname).toBe('/users/rodneyfool/wants/130076')
    expect(request.url.searchParams.get('notes')).toBe('My favorite release')
    expect(request.url.searchParams.get('rating')).toBe('5')
  })

  it('editWantlistItem POSTs to the same path', async () => {
    const { client, fake } = createTestClient({ body: { id: 130076, rating: 3 } })

    await client.wantlist.editWantlistItem('rodneyfool', 130076, { rating: 3 })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/users/rodneyfool/wants/130076?rating=3')
  })

  it('removeFromWantlist DELETEs the entry', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await client.wantlist.removeFromWantlist('rodneyfool', 130076)

    const request = fake.lastRequest()
    expect(request.method).toBe('DELETE')
    expect(request.target).toBe('/users/rodneyfool/wants/130076')
  })
})

describe('ListsResource', () => {
  it('getUserLists forwards pagination', async () => {
    const { client, fake } = createTestClient({
      body: {
        pagination: { page: 1, pages: 1, items: 1, per_page: 50, urls: {} },
        lists: [{ id: 1, name: 'rodneyfool', public: false, date_added: '', date_changed: '' }]
      }
    })

    const { lists } = await client.lists.getUserLists('rodneyfool', { per_page: 5 })

    expect(lists[0]?.id).toBe(1)
    expect(fake.lastRequest().target).toBe('/users/rodneyfool/lists?per_page=5')
  })

  it('getList uses the differently-named detail fields', async () => {
    const { client, fake } = createTestClient({
      body: {
        list_id: 2,
        name: 'new list',
        created_ts: '2016-05-31T10:36:30-07:00',
        modified_ts: '2016-05-31T13:46:12-07:00',
        url: 'https://www.discogs.com/lists/new-list/2',
        items: [{ id: 4674, type: 'release', display_title: 'Silent Phase' }]
      }
    })

    const list = await client.lists.getList(2)

    expect(list.list_id).toBe(2)
    expect(list.created_ts).toBe('2016-05-31T10:36:30-07:00')
    expect(list.items[0]?.type).toBe('release')
    expect(fake.lastRequest().target).toBe('/lists/2')
  })
})
