import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('button group field', () => {
  it("defaults to '1'", async () => {
    const response = await $fetch('/api/collections/button-group-fields?select=default,required', {
      method: 'post',
      body: { required: 1 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response).toEqual({ default: '1', required: '1' })
  })

  it("accepts 'foo'", async () => {
    const response = await $fetch('/api/collections/button-group-fields?select=required', {
      method: 'post',
      body: { required: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response).toEqual({ required: 'foo' })
  })

  it('accepts null', async () => {
    const response = await $fetch('/api/collections/button-group-fields?select=default', {
      method: 'post',
      body: { default: null, required: '1' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response).toEqual({ default: null })
  })

  it('does not accept null when required', async () => {
    const response = await $fetch('/api/collections/button-group-fields', {
      method: 'post',
      body: { required: null },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })
    expect(response).toEqual({ required: 'This field is required' })
  })

  it('does not accept other values', async () => {
    const response = await $fetch('/api/collections/button-group-fields', {
      method: 'post',
      body: { required: 'falsy' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })
    expect(response).toEqual({ required: "Invalid value: 'falsy'" })
  })
})
