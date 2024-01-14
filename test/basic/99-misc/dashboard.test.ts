import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('dashboard specific api routes', () => {
  it('returns correct values when logged in', async () => {
    const response = await $fetch('/api/dashboard', { headers: { Authorization: `Bearer ${process.env.TOKEN}` } })

    expect(response).toEqual({
      blocks: expect.any(Object),
      collections: expect.any(Object),
      isCacheActive: !!process.env.NUXT_PRUVIOUS_REDIS,
      legalLinks: [],
      menu: expect.any(Array),
    })
    expect(Object.keys(response.blocks).length).toBeGreaterThan(0)
    expect(Object.keys(response.collections).length).toBeGreaterThan(0)
    expect(response.menu.length).toBeGreaterThan(0)
  })

  it('returns correct values when logged out', async () => {
    const response = await $fetch('/api/dashboard')

    expect(response).toEqual({
      blocks: {},
      collections: {},
      isCacheActive: false,
      legalLinks: [],
      menu: [],
    })
  })
})
