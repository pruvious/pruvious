import { $fetch } from '@nuxt/test-utils'
import decode from 'jwt-decode'
import { describe, expect, it } from 'vitest'

describe('login', () => {
  it('fails with missing credentials', async () => {
    const response = await $fetch('/api/login', { method: 'post', ignoreResponseError: true })
    expect(response).toEqual({ email: expect.any(String), password: expect.any(String) })
  })

  it('fails with invalid email', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: ' admin@pruvious.com', password: '12345678' },
      ignoreResponseError: true,
    })
    expect(response).toEqual({ email: expect.any(String) })
  })

  it('fails with invalid password', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: true },
      ignoreResponseError: true,
    })
    expect(response).toEqual({ password: expect.any(String) })
  })

  it('fails with invalid remember', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: '12345678', remember: 'foo' },
      ignoreResponseError: true,
    })
    expect(response).toEqual({ remember: expect.any(String) })
  })

  it('fails with incorrect email', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'foo@pruvious.com', password: 12345678 },
      ignoreResponseError: true,
    })
    expect(response).toBe('Incorrect credentials')
  })

  it('fails with incorrect password', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: '012345678' },
      ignoreResponseError: true,
    })
    expect(response).toBe('Incorrect credentials')
  })

  it('responds with jwt', async () => {
    const t1 = Math.floor(Date.now() / 1000)
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: 12345678 },
    })
    expect(response).toBeTypeOf('string')
    const { userId, iat, exp } = decode<any>(response)
    expect(userId).toBe(1)
    expect(iat).toBeGreaterThanOrEqual(t1)
    expect(iat).toBeLessThanOrEqual(Math.ceil(Date.now() / 1000))
    expect(exp).toBe(iat + 4 * 60 * 60)
  })

  it('responds with long jwt', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: '12345678', remember: 'y' },
    })
    expect(response).toBeTypeOf('string')
    const { iat, exp } = decode<any>(response)
    expect(exp).toBe(iat + 7 * 24 * 60 * 60)
  })
})
