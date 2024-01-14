import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('date-time field', () => {
  it('accepts timestamp', async () => {
    const response = await $fetch('/api/collections/date-time-fields?select=regular,required,min,max', {
      method: 'post',
      body: { required: 1678060800000 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: null,
      required: 1678060800000,
      min: 1686009601000,
      max: 1686009601000,
    })
  })

  it('does not accept decimal number', async () => {
    const response = await $fetch('/api/collections/date-time-fields', {
      method: 'post',
      body: { required: 1678060800000.1 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept numbers less than 1672531200000', async () => {
    const response = await $fetch('/api/collections/date-time-fields', {
      method: 'post',
      body: { min: 1672531200000 - 1, required: 1678060800000 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ min: 'The input must be greater than or equal to 1672531200000' })
  })

  it('does not accept numbers greater than 1704067199999', async () => {
    const response = await $fetch('/api/collections/date-time-fields', {
      method: 'post',
      body: { max: 1704067199999 + 1, required: 1678060800000 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'The input must be less than or equal to 1704067199999' })
  })
})
