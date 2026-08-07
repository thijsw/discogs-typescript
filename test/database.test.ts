import { describe, expect, it } from 'vitest'
import { createTestClient } from './helpers.js'

describe('DatabaseResource', () => {
  it('getRelease requests the release and forwards curr_abbr', async () => {
    const { client, fake } = createTestClient({
      body: { id: 249504, title: 'Never Gonna Give You Up' }
    })

    const release = await client.database.getRelease(249504, { curr_abbr: 'EUR' })

    expect(release.id).toBe(249504)
    const request = fake.lastRequest()
    expect(request.method).toBe('GET')
    expect(request.target).toBe('/releases/249504?curr_abbr=EUR')
  })

  it('getRelease omits the query string when no params are given', async () => {
    const { client, fake } = createTestClient({ body: {} })

    await client.database.getRelease(249504)

    expect(fake.lastRequest().target).toBe('/releases/249504')
  })

  it('getReleaseRating reads one user rating', async () => {
    const { client, fake } = createTestClient({
      body: { username: 'memory', release_id: 249504, rating: 5 }
    })

    await client.database.getReleaseRating(249504, 'memory')

    expect(fake.lastRequest().target).toBe('/releases/249504/rating/memory')
  })

  it('updateReleaseRating PUTs the new rating as JSON', async () => {
    const { client, fake } = createTestClient({
      body: { username: 'memory', release_id: 249504, rating: 4 }
    })

    await client.database.updateReleaseRating(249504, 'memory', 4)

    const request = fake.lastRequest()
    expect(request.method).toBe('PUT')
    expect(request.target).toBe('/releases/249504/rating/memory')
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(fake.lastJsonBody()).toEqual({ rating: 4 })
  })

  it('deleteReleaseRating DELETEs and tolerates an empty 204', async () => {
    const { client, fake } = createTestClient({ status: 204 })

    await expect(client.database.deleteReleaseRating(249504, 'memory')).resolves.toBeNull()

    const request = fake.lastRequest()
    expect(request.method).toBe('DELETE')
    expect(request.target).toBe('/releases/249504/rating/memory')
  })

  it('getCommunityReleaseRating hits the un-suffixed rating path', async () => {
    const { client, fake } = createTestClient({
      body: { release_id: 249504, rating: { count: 47, average: 4.19 } }
    })

    const rating = await client.database.getCommunityReleaseRating(249504)

    expect(rating.rating.average).toBe(4.19)
    expect(fake.lastRequest().target).toBe('/releases/249504/rating')
  })

  it('getReleaseStats reads have/want counts', async () => {
    const { client, fake } = createTestClient({ body: { num_have: 2315, num_want: 467 } })

    const stats = await client.database.getReleaseStats(249504)

    expect(stats).toEqual({ num_have: 2315, num_want: 467 })
    expect(fake.lastRequest().target).toBe('/releases/249504/stats')
  })

  it('getMaster requests a master release', async () => {
    const { client, fake } = createTestClient({ body: { id: 1000 } })

    await client.database.getMaster(1000)

    expect(fake.lastRequest().target).toBe('/masters/1000')
  })

  it('getMasterVersions forwards every documented filter and sort parameter', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, versions: [] } })

    await client.database.getMasterVersions(1000, {
      page: 3,
      per_page: 25,
      format: 'Vinyl',
      label: 'Scorpio Music',
      released: '1992',
      country: 'Belgium',
      sort: 'released',
      sort_order: 'asc'
    })

    const { url, target } = fake.lastRequest()
    expect(url.pathname).toBe('/masters/1000/versions')
    expect(target).toContain('page=3')
    expect(target).toContain('per_page=25')
    expect(target).toContain('format=Vinyl')
    expect(url.searchParams.get('label')).toBe('Scorpio Music')
    expect(url.searchParams.get('released')).toBe('1992')
    expect(url.searchParams.get('country')).toBe('Belgium')
    expect(url.searchParams.get('sort')).toBe('released')
    expect(url.searchParams.get('sort_order')).toBe('asc')
  })

  it('getArtist requests an artist', async () => {
    const { client, fake } = createTestClient({ body: { id: 108713 } })

    await client.database.getArtist(108713)

    expect(fake.lastRequest().target).toBe('/artists/108713')
  })

  it('getArtistReleases forwards sort parameters and returns the discriminated union', async () => {
    const { client, fake } = createTestClient({
      body: {
        pagination: { page: 1, pages: 1, items: 2, per_page: 50, urls: {} },
        releases: [
          { id: 173765, type: 'master', main_release: 3128432, title: 'Curb' },
          { id: 4299404, type: 'release', status: 'Accepted', title: 'Hesher' }
        ]
      }
    })

    const { releases } = await client.database.getArtistReleases(108713, {
      sort: 'year',
      sort_order: 'desc',
      page: 2
    })

    const [first] = releases
    expect(first?.type).toBe('master')
    if (first?.type === 'master') expect(first.main_release).toBe(3128432)

    const { url } = fake.lastRequest()
    expect(url.pathname).toBe('/artists/108713/releases')
    expect(url.searchParams.get('sort')).toBe('year')
    expect(url.searchParams.get('sort_order')).toBe('desc')
    expect(url.searchParams.get('page')).toBe('2')
  })

  it('getLabel requests a label', async () => {
    const { client, fake } = createTestClient({ body: { id: 1 } })

    await client.database.getLabel(1)

    expect(fake.lastRequest().target).toBe('/labels/1')
  })

  it('getLabelReleases forwards pagination', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, releases: [] } })

    await client.database.getLabelReleases(1, { page: 1, per_page: 5 })

    expect(fake.lastRequest().target).toBe('/labels/1/releases?page=1&per_page=5')
  })

  it('search forwards every documented search field', async () => {
    const { client, fake } = createTestClient({ body: { pagination: {}, results: [] } })

    await client.database.search({
      q: 'nirvana',
      type: 'release',
      title: 'nirvana - nevermind',
      release_title: 'nevermind',
      credit: 'kurt',
      artist: 'nirvana',
      anv: 'nirvana',
      label: 'dgc',
      genre: 'rock',
      style: 'grunge',
      country: 'canada',
      year: '1991',
      format: 'album',
      catno: 'DGCD-24425',
      barcode: '7 2064-24425-2 4',
      track: 'smells like teen spirit',
      submitter: 'milKt',
      contributor: 'jerome99',
      page: 1,
      per_page: 3
    })

    const { url } = fake.lastRequest()
    expect(url.pathname).toBe('/database/search')
    // The free-text query goes out as `q`, not `query`.
    expect(url.searchParams.get('q')).toBe('nirvana')
    expect(url.searchParams.get('type')).toBe('release')
    expect(url.searchParams.get('release_title')).toBe('nevermind')
    expect(url.searchParams.get('barcode')).toBe('7 2064-24425-2 4')
    expect(url.searchParams.get('contributor')).toBe('jerome99')
    expect(url.searchParams.get('per_page')).toBe('3')
  })
})
