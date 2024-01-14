import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('disabled api routes', () => {
  it('disables create', async () => {
    const response = await $fetch('/api/collections/disabled', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('disables read', async () => {
    const response = await $fetch('/api/collections/disabled', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('disables update', async () => {
    const response = await $fetch('/api/collections/disabled', {
      method: 'patch',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('disables delete', async () => {
    const response = await $fetch('/api/collections/disabled', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })
})
