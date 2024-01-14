import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('slider field', () => {
  it('sets values', async () => {
    const response = await $fetch('/api/collections/slider-fields?select=regular,default,required', {
      method: 'post',
      body: { regular: 1, required: '2000' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: 1,
      default: 64,
      required: 2000,
    })
  })

  it('validates min value', async () => {
    const response = await $fetch('/api/collections/slider-fields?select=regular,default,required', {
      method: 'post',
      body: { required: -9001 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The input must be greater than or equal to -9000' })
  })

  it('validates max value', async () => {
    const response = await $fetch('/api/collections/slider-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 9001 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The input must be less than or equal to 9000' })
  })

  it('validates interval', async () => {
    const response = await $fetch('/api/collections/slider-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 1337 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The input must be a multiple of 1000 between -9000 and 9000' })
  })

  it('does not accept other values than numeric', async () => {
    const response = await $fetch('/api/collections/slider-fields?select=regular,default,required', {
      method: 'post',
      body: { required: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/slider-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
