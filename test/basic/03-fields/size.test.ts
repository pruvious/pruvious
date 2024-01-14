import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('size field', () => {
  it('sets values', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: {
        required: {
          top: { value: 1, unit: 'px' },
          bottom: { value: 2, unit: 'px' },
        },
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: { width: { value: 0 }, height: { value: 0 } },
      default: { width: { value: 1337 }, height: { value: 3.14 } },
      required: { top: { value: 1, unit: 'px' }, bottom: { value: 2, unit: 'px' } },
    })
  })

  it('accepts number as input type', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: {
        regular: 1,
        default: {
          width: 3,
          height: '4',
        },
        required: {
          top: { value: 1, unit: 'px' },
          bottom: { value: 2, unit: 'px' },
        },
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: { width: { value: 1 }, height: { value: 1 } },
      default: { width: { value: 3 }, height: { value: 4 } },
      required: { top: { value: 1, unit: 'px' }, bottom: { value: 2, unit: 'px' } },
    })
  })

  it('does not accept number when units are required', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 1 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: "Invalid 'Top' unit" })
  })

  it('validates input type', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('validates input names', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: {
        required: {
          top: { value: 1, unit: 'px' },
          bottom: { value: 2, unit: 'px' },
          foo: { value: 3, unit: 'px' },
        },
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('validates input values', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: {
        required: {
          top: { value: '1', unit: 'px' },
          bottom: { value: 2, unit: 'px' },
        },
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: "The 'Top' value must be numeric" })
  })

  it('validates minimum input values', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: {
        required: {
          top: { value: -1, unit: 'px' },
          bottom: { value: -1, unit: 'px' },
        },
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: "The 'Top' value must be greater than or equal to 0" })
  })

  it('validates maximum input values', async () => {
    const response = await $fetch('/api/collections/size-fields?select=regular,default,required', {
      method: 'post',
      body: {
        required: {
          top: { value: 65, unit: 'px' },
          bottom: { value: 65, unit: 'px' },
        },
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: "The 'Top' value must be less than or equal to 64" })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/size-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
