import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('query builder: raw', () => {
  it('retrieves initial user', async () => {
    const response = await $fetch('/api/query-builder/raw', {
      method: 'post',
      body: { query: "SELECT * FROM users WHERE email = 'admin@pruvious.com'" },
    })

    expect(+response.results[0].id).toBe(1)
    expect(response.results[0].email).toBe('admin@pruvious.com')
  })

  it('counts initial users', async () => {
    const response = await $fetch('/api/query-builder/raw', {
      method: 'post',
      body: { query: "SELECT COUNT(*) as count FROM users WHERE email = 'admin@pruvious.com'" },
    })

    expect(+response.results[0].count).toBe(1)
  })
})
