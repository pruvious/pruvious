import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('text-area field', () => {
  it('sets values', async () => {
    const response = await $fetch('/api/collections/text-area-fields?select=regular,default,required', {
      method: 'post',
      body: { regular: 1, required: ' foo ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: '1',
      default: ' ',
      required: 'foo',
    })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/text-area-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
