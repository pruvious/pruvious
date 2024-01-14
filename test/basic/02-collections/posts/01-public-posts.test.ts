import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('public posts', async () => {
  let pageId = 0
  let draftToken = ''

  it('creates a post', async () => {
    const response = await $fetch('/api/collections/posts?select=id,path', {
      method: 'post',
      body: { path: '//Foo//', public: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: expect.any(Number), path: '/foo' })
    pageId = response.id
    draftToken = response.draftToken
  })

  it('returns public page', async () => {
    const response1 = await $fetch('/api/pages/posts/foo')
    const response2 = await $fetch('/api/pages/posts/foo/')
    const expected = {
      id: expect.any(Number),
      path: '/posts/foo',
      collection: 'posts',
      title: 'foo | My Pruvious Site',
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

    expect(response1).toEqual(expected)
    expect(response2).toEqual(expected)
  })
})
