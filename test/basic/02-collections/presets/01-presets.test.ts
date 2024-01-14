import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: presets', async () => {
  it('creates a preset', async () => {
    const response = await $fetch('/api/collections/presets', {
      method: 'post',
      body: { name: ' foo ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      name: 'foo',
      blocks: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('ensures that names are unique', async () => {
    const response = await $fetch('/api/collections/presets', {
      method: 'post',
      body: { name: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ name: 'A preset with this name already exists' })
  })
})
