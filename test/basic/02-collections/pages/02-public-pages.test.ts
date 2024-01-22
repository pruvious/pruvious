import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('public pages', async () => {
  let pageId = 0
  let draftToken = ''

  it('creates a page', async () => {
    const response = await $fetch('/api/collections/pages?select=id,path,draftToken', {
      method: 'post',
      body: { path: '//Foo//', public: false },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: expect.any(Number), path: '/foo', draftToken: expect.any(String) })
    pageId = response.id
    draftToken = response.draftToken
  })

  it('does not return draft page', async () => {
    const response = await $fetch('/api/pages/foo', { ignoreResponseError: true })
    expect(response).toBe('Resource not found')
  })

  it('returns draft page only with token', async () => {
    const response = await $fetch(`/api/pages/foo?__d=${draftToken}`)
    expect(response).toEqual({
      id: expect.any(Number),
      path: '/foo',
      url: '/foo',
      collection: 'pages',
      title: 'DRAFT | My Pruvious Site',
      description: '',
      language: 'en',
      blocks: [],
      htmlAttrs: { lang: 'en' },
      meta: expect.any(Array),
      link: expect.any(Array),
      script: expect.any(Array),
      layout: 'default',
      publishDate: null,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
      translations: expect.any(Object),
      fields: expect.any(Object),
    })
  })

  it('returns public page', async () => {
    const response1 = await $fetch(`/api/collections/pages/${pageId}?select=id`, {
      method: 'patch',
      body: { public: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: pageId })

    const response2 = await $fetch('/api/pages/foo')
    const response3 = await $fetch('/api/pages/foo/')
    const expected = {
      id: expect.any(Number),
      path: '/foo',
      url: '/foo',
      title: 'foo | My Pruvious Site',
      collection: 'pages',
      description: '',
      language: 'en',
      blocks: [],
      htmlAttrs: { lang: 'en' },
      meta: expect.any(Array),
      link: expect.any(Array),
      script: expect.any(Array),
      layout: 'default',
      publishDate: null,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
      translations: expect.any(Object),
      fields: expect.any(Object),
    }

    expect(response2).toEqual(expected)
    expect(response3).toEqual(expected)
  })

  it('return title when specified', async () => {
    const response1 = await $fetch(`/api/collections/pages/${pageId}?select=id`, {
      method: 'patch',
      body: { title: 'Bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: pageId })
    const response2 = await $fetch('/api/pages/foo')
    expect(response2.title).toBe('Bar | My Pruvious Site')
  })

  it('skips base title', async () => {
    const response1 = await $fetch(`/api/collections/pages/${pageId}?select=id`, {
      method: 'patch',
      body: { baseTitle: false },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: pageId })
    const response2 = await $fetch('/api/pages/foo')
    expect(response2.title).toBe('Bar')
  })

  it('skips base title if empty', async () => {
    const response1 = await $fetch(`/api/collections/pages/${pageId}?select=id`, {
      method: 'patch',
      body: { baseTitle: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: pageId })
    const response2 = await $fetch('/api/pages/foo')
    expect(response2.title).toBe('Bar | My Pruvious Site')

    const response3 = await $fetch(`/api/collections/seo`, {
      method: 'patch',
      body: { baseTitle: ' ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3.baseTitle).toBe('')
    const response4 = await $fetch('/api/pages/foo')
    expect(response4.title).toBe('Bar')
  })

  it('works with different titleSeparator and baseTitlePosition', async () => {
    const response1 = await $fetch('/api/collections/seo?select=baseTitle,titleSeparator,baseTitlePosition', {
      method: 'patch',
      body: { baseTitle: 'My Pruvious Site', titleSeparator: ' - ', baseTitlePosition: 'before' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ baseTitle: 'My Pruvious Site', titleSeparator: ' - ', baseTitlePosition: 'before' })
    const response2 = await $fetch('/api/pages/foo')
    expect(response2.title).toBe('My Pruvious Site - Bar')

    await $fetch('/api/collections/seo', {
      method: 'patch',
      body: { titleSeparator: ' | ', baseTitlePosition: 'after' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
  })

  it('returns homepage', async () => {
    const response1 = await $fetch('/api/pages')
    const response2 = await $fetch('/api/pages/')

    expect(response1).toBeTypeOf('object')
    expect(response2).toBeTypeOf('object')
  })
})
