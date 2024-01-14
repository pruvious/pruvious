import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: pages', async () => {
  it('creates a page', async () => {
    const response = await $fetch('/api/collections/pages', {
      method: 'post',
      body: { path: ' ', public: true, draftToken: 'foo', visible: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      path: '/',
      public: true,
      draftToken: expect.any(String),
      title: '',
      baseTitle: true,
      description: '',
      visible: true,
      sharingImage: null,
      metaTags: [],
      layout: 'default',
      publishDate: null,
      blocks: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
    expect(response.draftToken).not.toBe('foo')
  })

  it('ensures that paths are unique', async () => {
    const response = await $fetch('/api/collections/pages', {
      method: 'post',
      body: { path: '/', language: 'en' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ path: 'A page with this path already exists' })
  })

  it('validates page path', async () => {
    const response = await $fetch('/api/collections/pages', {
      method: 'post',
      body: { path: 'invalid path' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ path: 'The page path must be a URL-safe string' })
  })

  it('duplicates a page', async () => {
    const response1 = await $fetch('/api/collections/pages/1/duplicate', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      path: '/-1',
      public: false,
      draftToken: expect.any(String),
      title: '(1)',
      baseTitle: true,
      description: '',
      visible: true,
      sharingImage: null,
      metaTags: [],
      layout: 'default',
      publishDate: null,
      blocks: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })

    const response2 = await $fetch(`/api/collections/pages/${response1.id}/duplicate`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      path: '/-2',
      public: false,
      draftToken: expect.any(String),
      title: '(2)',
      baseTitle: true,
      description: '',
      visible: true,
      sharingImage: null,
      metaTags: [],
      layout: 'default',
      publishDate: null,
      blocks: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })
})
