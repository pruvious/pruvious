import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('query builder: create', () => {
  it('creates a product', async () => {
    const response = await $fetch('/api/query-builder/create-products', {
      method: 'post',
      body: { name: 'foo-1', isActive: true, price: 10, translations: 'bar' },
    })

    expect(response).toEqual({
      success: true,
      record: {
        id: 1,
        name: 'foo-1',
        isActive: true,
        price: 10,
        language: 'en',
        translations: { en: 1, de: null },
      },
    })
  })

  it('creates many products', async () => {
    const response = await $fetch('/api/query-builder/create-many-products', {
      method: 'post',
      body: [
        { name: 'foo-2', price: 10 },
        { name: 'foo-3', price: 10 },
        { name: 'foo-4', price: 10 },
        { name: 'foo-5', price: 10 },
        { name: 'foo-6', price: 10 },
        { name: 'foo-7', price: 10 },
        { name: 'foo-8', price: 10 },
        { name: 'foo-9', price: 10 },
        { name: 'foo-10', price: 10 },
      ],
    })

    expect(response).toEqual({ success: true, records: expect.any(Array) })
    expect(response.records[0]).toEqual({
      id: expect.any(Number),
      name: 'foo-2',
      isActive: false,
      price: 10,
      language: 'en',
      translations: { en: expect.any(Number), de: null },
    })
  })

  it('validates input when creating', async () => {
    const response = await $fetch('/api/query-builder/create-products', {
      method: 'post',
      body: { language: 'foo', name: null },
    })

    expect(response).toEqual({
      success: false,
      errors: {
        language: expect.any(String),
        name: expect.any(String),
        price: expect.any(String),
      },
    })
  })

  it('validates input when creating many', async () => {
    const response = await $fetch('/api/query-builder/create-many-products', {
      method: 'post',
      body: [
        { language: 'foo', name: {} },
        { language: 'foo', name: {} },
      ],
    })

    expect(response).toEqual({ success: false, errors: expect.any(Array) })
    expect(response.errors).toHaveLength(2)
    expect(response.errors[0]).toEqual({
      language: expect.any(String),
      name: expect.any(String),
      price: expect.any(String),
    })
  })

  it('ignores the id input', async () => {
    const response = await $fetch('/api/query-builder/create-products', {
      method: 'post',
      body: { id: 1337, name: 'foo-11', price: 10 },
    })

    expect(response).toEqual({
      success: true,
      record: {
        id: 11,
        name: 'foo-11',
        isActive: false,
        price: 10,
        language: 'en',
        translations: { en: expect.any(Number), de: null },
      },
    })
  })

  it('ignores nonexistent fields', async () => {
    const response = await $fetch('/api/query-builder/create-products', {
      method: 'post',
      body: { foo: 'bar', name: 'foo-12', price: 10 },
    })

    expect(response).toEqual({
      success: true,
      record: {
        id: 12,
        name: 'foo-12',
        isActive: false,
        price: 10,
        language: 'en',
        translations: { en: expect.any(Number), de: null },
      },
    })
  })

  it('creates a translation', async () => {
    const response = await $fetch('/api/query-builder/create-products', {
      method: 'post',
      body: { name: 'foo-1-translation', isActive: true, price: 10, language: 'de', translations: 'bar' },
    })

    expect(response).toEqual({
      success: true,
      record: {
        id: expect.any(Number),
        name: 'foo-1-translation',
        isActive: true,
        price: 10,
        language: 'de',
        translations: { en: 1, de: response.record.id },
      },
    })
  })

  it('prevents creating same translation', async () => {
    const response = await $fetch('/api/query-builder/create-products', {
      method: 'post',
      body: { name: 'foo-1-translation', isActive: true, price: 10, language: 'de', translations: 'bar' },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ success: false, errors: { translations: 'The translation already exists' } })
  })
})
