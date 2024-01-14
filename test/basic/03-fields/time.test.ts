import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('time field', () => {
  it('accepts timestamp', async () => {
    const response = await $fetch('/api/collections/time-fields?select=regular,required,min,max', {
      method: 'post',
      body: { required: 21600000 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: null,
      required: 21600000,
      min: 32400000,
      max: 32400000,
    })
  })

  it('does not accept decimal number', async () => {
    const response = await $fetch('/api/collections/time-fields', {
      method: 'post',
      body: { required: 21600000.1 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept numbers less than 21600000', async () => {
    const response = await $fetch('/api/collections/time-fields', {
      method: 'post',
      body: { min: 21600000 - 1, required: 21600000 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ min: 'The input must be greater than or equal to 21600000' })
  })

  it('does not accept numbers greater than 64800000', async () => {
    const response = await $fetch('/api/collections/time-fields', {
      method: 'post',
      body: { max: 64800000 + 1, required: 21600000 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ max: 'The input must be less than or equal to 64800000' })
  })
})
