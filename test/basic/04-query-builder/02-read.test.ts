import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('query builder: read', () => {
  it('reads a product', async () => {
    const response = await $fetch('/api/query-builder/get-product/1')

    expect(response).toEqual({
      id: 1,
      name: 'foo-1',
      isActive: true,
      price: 10,
      language: 'en',
      translations: { en: 1, de: expect.any(Number) },
    })
  })

  it('reads the name and price of a product', async () => {
    const response = await $fetch('/api/query-builder/get-product/1?select=name,price')
    expect(response).toEqual({ name: 'foo-1', price: 10 })
  })

  it('ignores reading nonexistent fields', async () => {
    const response = await $fetch('/api/query-builder/get-product/1?select=name,foo')
    expect(response).toEqual({ name: 'foo-1' })
  })
})
