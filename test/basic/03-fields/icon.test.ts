import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('icon field', () => {
  it('sets values', async () => {
    const response = await $fetch('/api/collections/icon-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'Test' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: null,
      default: 'Test',
      required: 'Test',
    })
  })

  it('validates icon', async () => {
    const response = await $fetch('/api/collections/icon-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'Baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The icon does not exist' })
  })

  it('validates allowed icon', async () => {
    const response = await $fetch('/api/collections/icon-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'Foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The icon is not allowed for this field' })
  })

  it('validates excluded icon', async () => {
    const response = await $fetch('/api/collections/icon-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'Bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The icon is not allowed for this field' })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/icon-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
