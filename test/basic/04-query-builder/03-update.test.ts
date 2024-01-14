import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('query builder: update', () => {
  it('updates a product', async () => {
    const response = await $fetch('/api/query-builder/update-products/1', {
      method: 'patch',
      body: { id: 9001, language: 'de', translations: 'foo', name: 'foo-1-updated', price: 100 },
      // `id`, `language`, `translations`, and `name` are immutable
    })

    const expectedResponse = {
      id: 1,
      name: 'foo-1',
      isActive: true,
      price: 100,
      language: 'en',
      translations: { en: 1, de: expect.any(Number) },
    }
    expect(response).toEqual({ success: true, records: [expectedResponse] })
    expect(response.translations).not.toBe('foo')

    const verifyResponse = await $fetch('/api/query-builder/get-product/1')
    expect(verifyResponse).toEqual(expectedResponse)
  })

  it('updates many products', async () => {
    const response = await $fetch('/api/query-builder/update-many-products', {
      method: 'patch',
      body: { price: 99 },
      query: { ids: [2, 3] },
    })

    expect(response).toEqual({
      success: true,
      records: [
        {
          id: 2,
          name: 'foo-2',
          isActive: false,
          price: 99,
          language: 'en',
          translations: { en: expect.any(Number), de: null },
        },
        {
          id: 3,
          name: 'foo-3',
          isActive: false,
          price: 99,
          language: 'en',
          translations: { en: expect.any(Number), de: null },
        },
      ],
    })

    const verifyResponse = await $fetch('/api/query-builder/get-product/4')
    expect(verifyResponse.price).not.toBe(99)
  })

  it('updates nothing', async () => {
    const response = await $fetch('/api/query-builder/update-products/1', { method: 'patch', body: { name: '' } })

    expect(response).toEqual({
      success: true,
      records: [
        {
          id: 1,
          name: 'foo-1',
          isActive: true,
          price: 100,
          language: 'en',
          translations: { en: 1, de: expect.any(Number) },
        },
      ],
    })
  })

  it('validates input when updating', async () => {
    const response = await $fetch('/api/query-builder/update-products/1', {
      method: 'patch',
      body: { name: null, price: null },
    })

    expect(response).toEqual({ success: false, errors: { price: expect.any(String) } })
  })

  it('ignores language updates', async () => {
    const response = await $fetch('/api/query-builder/update-products/1', {
      method: 'patch',
      body: { language: 'de' },
      ignoreResponseError: true,
    })

    expect(response.success).toBe(true)
    expect(response.records[0].language).toBe('en')
  })

  it('ignores translations updates', async () => {
    const response = await $fetch('/api/query-builder/update-products/1', {
      method: 'patch',
      body: { translations: 'foo' },
      ignoreResponseError: true,
    })

    expect(response.success).toBe(true)
    expect(response.records[0].translations).toEqual({ en: 1, de: expect.any(Number) })
  })

  it('updates existing fields while ignoring nonexistent fields', async () => {
    const response = await $fetch('/api/query-builder/update-products/1', {
      method: 'patch',
      body: { foo: 'bar', price: 101 },
    })

    expect(response).toEqual({
      success: true,
      records: [
        {
          id: 1,
          name: 'foo-1',
          isActive: true,
          price: 101,
          language: 'en',
          translations: { en: 1, de: expect.any(Number) },
        },
      ],
    })
  })
})
