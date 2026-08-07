import { describe, expect, it } from 'vitest'
import { createTestClient } from './helpers.js'

describe('UserResource', () => {
  it('getIdentity requests the OAuth identity endpoint', async () => {
    const { client, fake } = createTestClient({
      body: { id: 1, username: 'example', resource_url: '', consumer_name: 'App' }
    })

    const identity = await client.user.getIdentity()

    expect(identity.username).toBe('example')
    expect(fake.lastRequest().target).toBe('/oauth/identity')
  })

  it('getProfile percent-encodes usernames containing reserved characters', async () => {
    const { client, fake } = createTestClient({ body: { id: 1, username: 'susan.salkeld' } })

    await client.user.getProfile('susan salkeld+1')

    expect(fake.lastRequest().url.pathname).toBe('/users/susan%20salkeld%2B1')
  })

  it('editProfile POSTs the editable fields', async () => {
    const { client, fake } = createTestClient({ body: { id: 1, username: 'vreon' } })

    await client.user.editProfile('vreon', {
      name: 'Nicolas Cage',
      home_page: 'www.discogs.com',
      location: 'Portland',
      profile: 'I am a Discogs user!',
      curr_abbr: 'USD'
    })

    const request = fake.lastRequest()
    expect(request.method).toBe('POST')
    expect(request.target).toBe('/users/vreon')
    expect(fake.lastJsonBody()).toEqual({
      name: 'Nicolas Cage',
      home_page: 'www.discogs.com',
      location: 'Portland',
      profile: 'I am a Discogs user!',
      curr_abbr: 'USD'
    })
  })

  it('getSubmissions forwards pagination and groups results by type', async () => {
    const { client, fake } = createTestClient({
      body: {
        pagination: { page: 1, pages: 1, items: 1, per_page: 50, urls: {} },
        submissions: { artists: [{ id: 1 }], labels: [], releases: [] }
      }
    })

    const { submissions } = await client.user.getSubmissions('shooezgirl', { per_page: 25 })

    expect(submissions.artists).toHaveLength(1)
    expect(fake.lastRequest().target).toBe('/users/shooezgirl/submissions?per_page=25')
  })

  it('getContributions forwards sort parameters', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, contributions: [] } })

    await client.user.getContributions('shooezgirl', { sort: 'artist', sort_order: 'desc' })

    const { url } = fake.lastRequest()
    expect(url.pathname).toBe('/users/shooezgirl/contributions')
    expect(url.searchParams.get('sort')).toBe('artist')
    expect(url.searchParams.get('sort_order')).toBe('desc')
  })
})
