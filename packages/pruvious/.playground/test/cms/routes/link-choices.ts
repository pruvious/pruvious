import { isNumber } from '@pruvious/utils'
import { describe, expect, test } from 'vitest'
import { $401, $deleteAsAdmin, $get, $getAsAdmin, $postAsAdmin } from '../utils'

describe('link-choices endpoint (GET /api/pruvious/link-choices)', () => {
  let cr: number // collection route → Articles
  let sr: number // singleton route → Options
  let pr: number // collection route → Public (no `labelField` configured)
  let mr: number // multi-language route (EN + DE paths)
  let dr: number // draft route (non-public)
  let aEn: number // Articles record
  let pub: number // Public record

  test('setup: routes and records', async () => {
    cr = (
      (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/lc-blog',
        referencedCollections: ['Articles'],
        isPublicEN: true,
      })) as [{ id: number }]
    )[0].id

    sr = (
      (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/lc-opt',
        referencedSingleton: 'Options',
        isPublicEN: true,
      })) as [{ id: number }]
    )[0].id

    pr = (
      (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/lc-pub',
        referencedCollections: ['Public'],
        isPublicEN: true,
      })) as [{ id: number }]
    )[0].id

    aEn = (
      (await $postAsAdmin('/api/collections/articles?returning=id', {
        name: 'LC Article',
        price: 1,
        subpath: 'lc-article',
        language: 'en',
      })) as [{ id: number }]
    )[0].id

    pub = (
      (await $postAsAdmin('/api/collections/public?returning=id', {
        foo: 'Pub Foo',
        subpath: 'lc-pub-item',
      })) as [{ id: number }]
    )[0].id

    mr = (
      (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/lc-multi',
        pathDE: '/lc-multi-de',
        isPublicEN: true,
        isPublicDE: true,
      })) as [{ id: number }]
    )[0].id

    dr = (
      (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/lc-draft',
        isPublicEN: false,
      })) as [{ id: number }]
    )[0].id

    expect([cr, sr, pr, mr, dr, aEn, pub].every(isNumber)).toBe(true)
  })

  test('rejects anonymous calls (access-dashboard required)', async () => {
    expect(await $get('/api/pruvious/link-choices')).toEqual($401(''))
  })

  test('admin: returns the expected row shape for a singleton route', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?language=en&perPage=100')

    expect(res).toMatchObject({
      data: expect.any(Array),
      currentPage: 1,
      perPage: 100,
      lastPage: expect.any(Number),
      total: expect.any(Number),
    })

    expect(res.data.find((r: any) => r.value === `rel://Routes:${sr}`)).toEqual({
      value: `rel://Routes:${sr}`,
      label: 'Options',
      detail: '/lc-opt',
      editUrl: `/dashboard/collections/routes/${sr}`,
      isPublic: true,
      languages: { en: '/lc-opt' },
    })
  })

  test('admin: returns the expected row shape for a collection record', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?language=en&perPage=100')

    expect(res.data.find((r: any) => r.value === `rel://Routes:${cr}/Articles:${aEn}`)).toEqual({
      value: `rel://Routes:${cr}/Articles:${aEn}`,
      label: 'LC Article #1',
      detail: '/lc-blog/lc-article',
      editUrl: `/dashboard/collections/articles/${aEn}`,
      isPublic: true,
      languages: { en: '/lc-blog/lc-article' },
    })
  })

  test('default labelField: a collection without `labelField` labels rows by `subpath`', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?language=en&perPage=100')

    expect(res.data.find((r: any) => r.value === `rel://Routes:${pr}/Public:${pub}`)).toEqual({
      value: `rel://Routes:${pr}/Public:${pub}`,
      label: 'lc-pub-item',
      detail: '/lc-pub/lc-pub-item',
      editUrl: `/dashboard/collections/public/${pub}`,
      isPublic: true,
      languages: { en: '/lc-pub/lc-pub-item' },
    })
  })

  test('collection routes are not offered as bare-route links', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?language=en&perPage=100')
    expect(res.data.find((r: any) => r.value === `rel://Routes:${cr}`)).toBeUndefined()
    expect(res.data.find((r: any) => r.value === `rel://Routes:${sr}`)).toBeTruthy()
  })

  test('rows are sorted by their resolved path', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?language=en&perPage=100')
    const details = res.data.map((r: any) => r.detail)
    expect(details).toEqual([...details].sort())
  })

  test('allowedReferences=Articles: excludes bare-route rows', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?allowedReferences=Articles&perPage=100')
    expect(res.data.find((r: any) => r.value === `rel://Routes:${sr}`)).toBeUndefined()
    expect(res.data.find((r: any) => r.value === `rel://Routes:${cr}`)).toBeUndefined()
    expect(res.data.find((r: any) => r.value === `rel://Routes:${cr}/Articles:${aEn}`)).toBeTruthy()
  })

  test('allowedReferences=Routes: excludes collection-record rows', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?allowedReferences=Routes&perPage=100')
    expect(res.data.find((r: any) => r.value === `rel://Routes:${sr}`)).toBeTruthy()
    expect(res.data.find((r: any) => r.value === `rel://Routes:${cr}/Articles:${aEn}`)).toBeUndefined()
  })

  test('search by label keyword filters to matching Articles records', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?q=LC+Article&perPage=100')
    expect(res.data.find((r: any) => r.value === `rel://Routes:${cr}/Articles:${aEn}`)).toBeTruthy()
  })

  test('languages=en,de: enumerates routes per language and pins non-primary languages', async () => {
    const res: any = await $getAsAdmin(
      '/api/pruvious/link-choices?languages=en,de&allowedReferences=Routes&perPage=100',
    )
    expect(res.data.find((r: any) => r.value === `rel://Routes:${mr}`)).toMatchObject({
      value: `rel://Routes:${mr}`,
      detail: '/lc-multi',
    })
    expect(res.data.find((r: any) => r.value === `rel://Routes:${mr}@de`)).toMatchObject({
      value: `rel://Routes:${mr}@de`,
      detail: '/de/lc-multi-de',
    })
  })

  test('languages=en: excludes rows for other languages', async () => {
    const res: any = await $getAsAdmin('/api/pruvious/link-choices?languages=en&allowedReferences=Routes&perPage=100')
    expect(res.data.find((r: any) => r.value === `rel://Routes:${mr}`)).toBeTruthy()
    expect(res.data.find((r: any) => r.value === `rel://Routes:${mr}@de`)).toBeUndefined()
  })

  test('allowDrafts=false: hides draft routes from the picker', async () => {
    const shown: any = await $getAsAdmin(
      '/api/pruvious/link-choices?languages=en&allowDrafts=true&allowedReferences=Routes&perPage=100',
    )
    expect(shown.data.find((r: any) => r.value === `rel://Routes:${dr}`)).toMatchObject({ isPublic: false })

    const hidden: any = await $getAsAdmin(
      '/api/pruvious/link-choices?languages=en&allowDrafts=false&allowedReferences=Routes&perPage=100',
    )
    expect(hidden.data.find((r: any) => r.value === `rel://Routes:${dr}`)).toBeUndefined()
  })

  test('value resolution: returns the single row for a bare-route value', async () => {
    const res: any = await $getAsAdmin(`/api/pruvious/link-choices?value=${encodeURIComponent(`rel://Routes:${sr}`)}`)
    expect(res).toMatchObject({ currentPage: 1, lastPage: 1, total: 1 })
    expect(res.data).toEqual([
      {
        value: `rel://Routes:${sr}`,
        label: 'Options',
        detail: '/lc-opt',
        editUrl: `/dashboard/collections/routes/${sr}`,
        isPublic: true,
        languages: { en: '/lc-opt' },
      },
    ])
  })

  test('value resolution: returns the single row for a collection-record value', async () => {
    const res: any = await $getAsAdmin(
      `/api/pruvious/link-choices?value=${encodeURIComponent(`rel://Routes:${cr}/Articles:${aEn}`)}`,
    )
    expect(res.data).toEqual([
      {
        value: `rel://Routes:${cr}/Articles:${aEn}`,
        label: 'LC Article #1',
        detail: '/lc-blog/lc-article',
        editUrl: `/dashboard/collections/articles/${aEn}`,
        isPublic: true,
        languages: { en: '/lc-blog/lc-article' },
      },
    ])
  })

  test('value resolution: unknown value yields an empty result set', async () => {
    const res: any = await $getAsAdmin(`/api/pruvious/link-choices?value=${encodeURIComponent('rel://Routes:999999')}`)
    expect(res).toEqual({ data: [], currentPage: 1, lastPage: 1, perPage: 50, total: 0 })
  })

  test('cleanup: delete routes and records', async () => {
    expect(await $deleteAsAdmin(`/api/collections/articles/${aEn}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/public/${pub}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${cr}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${sr}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${pr}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${mr}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${dr}`)).toEqual(1)
  })
})
