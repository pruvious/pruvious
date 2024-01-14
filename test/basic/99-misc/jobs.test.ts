import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('jobs', () => {
  it('create 5 junk records', async () => {
    const response = await $fetch('/api/collections/junk', {
      method: 'post',
      body: [{}, {}, {}, {}, {}],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toHaveLength(5)
  })

  it('cleans up 5 records', async () => {
    const response = await $fetch('/api/process-job-queue', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toBe(true)
  })

  it('1 junk record created after cleaning remains', async () => {
    const response = await $fetch('/api/collections/junk', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.total).toBe(1)
  })
})
