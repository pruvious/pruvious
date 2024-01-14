import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('page translation mirror', async () => {
  let originalId: number
  let translatedId: number
  let translations: string

  it('creates a page', async () => {
    const response = await $fetch('/api/collections/pages?select=id,translations', {
      method: 'post',
      body: { title: 'Foo', path: '/mirror/from', public: true, visible: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: expect.any(Number), translations: expect.any(String) })

    originalId = response.id
    translations = response.translations
  })

  it('requires language parameter', async () => {
    const response = await $fetch(`/api/collections/pages/${originalId}/mirror`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("Missing 'to' parameter")
  })

  it('requires valid language parameter', async () => {
    const response = await $fetch(`/api/collections/pages/${originalId}/mirror?to=foo`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The language code 'foo' is not supported")
  })

  it('requires distinct language parameter', async () => {
    const response = await $fetch(`/api/collections/pages/${originalId}/mirror?to=en`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Source and target language cannot be the same')
  })

  it('mirrors page (creates new translation)', async () => {
    const response = await $fetch(
      `/api/collections/pages/${originalId}/mirror?select=id,language,translations,public,path,title&to=de`,
      { method: 'post', headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'de',
      translations,
      public: false,
      path: '/mirror/from',
      title: 'Foo',
    })

    translatedId = response.id
  })

  it('updates original page', async () => {
    const response = await $fetch(`/api/collections/pages/${originalId}?select=title`, {
      method: 'patch',
      body: { title: 'Bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ title: 'Bar' })
  })

  it('updates translated page', async () => {
    const response = await $fetch(`/api/collections/pages/${translatedId}?select=title,public`, {
      method: 'patch',
      body: { title: 'Baz', public: false },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ title: 'Baz', public: false })
  })

  it('mirrors page (updates translation)', async () => {
    const response = await $fetch(
      `/api/collections/pages/${originalId}/mirror?select=language,translations,public,path,title&to=de`,
      { method: 'post', headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response).toEqual({
      language: 'de',
      translations,
      public: true,
      path: '/mirror/from',
      title: 'Bar',
    })
  })
})
