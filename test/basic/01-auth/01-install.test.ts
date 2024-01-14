import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('install', () => {
  it('responds with installed = false', async () => {
    const response = await $fetch('/api/installed')
    expect(response).toBe(false)
  })

  it('requires email', async () => {
    const response = await $fetch('/api/install', {
      method: 'post',
      body: { password: '12345678' },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: expect.any(String) })
  })

  it('requires password', async () => {
    const response = await $fetch('/api/install', {
      method: 'post',
      body: { email: 'admin@pruvious.com' },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ password: expect.any(String) })
  })

  it('successfully installs', async () => {
    const response = await $fetch('/api/install', {
      method: 'post',
      body: { id: 9001, isActive: false, isAdmin: false, email: ' admin@pruvious.com ', password: 12345678 },
    })

    expect(response).toBeTypeOf('string')
    process.env.TOKEN = response
  })

  it('does not install twice', async () => {
    const response = await $fetch('/api/install', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: '12345678' },
      ignoreResponseError: true,
    })

    expect(response).toBe('Pruvious is already installed')
  })

  it('responds with installed = true', async () => {
    const response = await $fetch('/api/installed')
    expect(response).toBe(true)
  })
})
