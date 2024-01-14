import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('time-range field', () => {
  it('accepts timestamp', async () => {
    const response = await $fetch('/api/collections/time-range-fields?select=regular,required,min,max', {
      method: 'post',
      body: { required: [21600000, '21600000'], min: [32400000, null] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: [null, null],
      required: [21600000, 21600000],
      min: [32400000, null],
      max: [32400000, 32400000],
    })
  })

  it('does not accept decimal number', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { required: [21600000, 21600000.1] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept numbers less than 21600000', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { min: [21600000 - 1, 21600000], required: [21600000, 21600000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ min: 'The inputs must be greater than or equal to 21600000' })
  })

  it('does not accept numbers greater than 64800000', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { max: [64800000, 64800000 + 1], required: [21600000, 21600000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'The inputs must be less than or equal to 64800000' })
  })

  it('expects number tuple (1)', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { max: null, required: [21600000, 21600000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'Invalid input type' })
  })

  it('expects number tuple (2)', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { max: [64800000], required: [21600000, 21600000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'Invalid input type' })
  })

  it('expects number tuple (3)', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { max: [64800000, 64800000, 64800000], required: [21600000, 21600000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'Invalid input type' })
  })

  it('compares tuple', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { required: [21600001, 21600000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The second value cannot be less than the first value' })
  })

  it('validates required fields (1)', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('validates required fields (1)', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { required: [null, 21600001] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('validates required fields (2)', async () => {
    const response = await $fetch('/api/collections/time-range-fields', {
      method: 'post',
      body: { required: [21600001, null] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
