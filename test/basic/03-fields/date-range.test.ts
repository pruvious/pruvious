import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('date-range field', () => {
  it('accepts timestamp', async () => {
    const response = await $fetch('/api/collections/date-range-fields?select=regular,required,min,max', {
      method: 'post',
      body: { required: [1678060800001, '1678060800002'], min: [1686009600000, null] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: [null, null],
      required: [1678060800000, 1678060800000],
      min: [1686009600000, null],
      max: [1686009600000, 1686009600000],
    })
  })

  it('does not accept decimal number', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { required: [1678060800000, 1678060800000.1] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept numbers less than 1672531200000', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { min: [1672531200000 - 1, 1672531200000], required: [1678060800000, 1678060800000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ min: 'The inputs must be greater than or equal to 1672531200000' })
  })

  it('does not accept numbers greater than 1704067199999', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { max: [1704067199999, 1704067199999 + 1], required: [1678060800000, 1678060800000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'The inputs must be less than or equal to 1704067199999' })
  })

  it('expects number tuple (1)', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { max: null, required: [1678060800000, 1678060800000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'Invalid input type' })
  })

  it('expects number tuple (2)', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { max: [1704067199999], required: [1678060800000, 1678060800000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'Invalid input type' })
  })

  it('expects number tuple (3)', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { max: [1704067199999, 1704067199999, 1704067199999], required: [1678060800000, 1678060800000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'Invalid input type' })
  })

  it('compares tuple', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { required: [1678147200000, 1678060800000] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'The second value cannot be less than the first value' })
  })

  it('validates required fields (1)', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('validates required fields (1)', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { required: [null, 1678060800001] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('validates required fields (2)', async () => {
    const response = await $fetch('/api/collections/date-range-fields', {
      method: 'post',
      body: { required: [1678060800001, null] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
