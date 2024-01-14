import { $fetch } from '@nuxt/test-utils'
import decode from 'jwt-decode'
import { describe, expect, it } from 'vitest'

describe('renew token', () => {
  let token = ''
  let longToken = ''
  let renewedToken = ''

  it('logs in', async () => {
    token = await $fetch('/api/login', { method: 'post', body: { email: 'admin@pruvious.com', password: 12345678 } })
    expect(token).toBeTypeOf('string')
    expect(token).toBeTruthy()

    longToken = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: 12345678, remember: true },
    })
    expect(longToken).toBeTypeOf('string')
    expect(longToken).toBeTruthy()
    expect(longToken).not.toBe(token)
  })

  it('renews token', async () => {
    const t1 = Math.floor(Date.now() / 1000)
    renewedToken = await $fetch('/api/renew-token', {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(renewedToken).toBeTypeOf('string')
    const { userId, iat, exp } = decode<any>(renewedToken)
    expect(userId).toBe(1)
    expect(iat).toBeGreaterThanOrEqual(t1)
    expect(iat).toBeLessThanOrEqual(Math.ceil(Date.now() / 1000))
    expect(exp).toBe(iat + 4 * 60 * 60)
  })

  it('renews long token', async () => {
    const t1 = Math.floor(Date.now() / 1000)
    const response = await $fetch('/api/renew-token', {
      method: 'post',
      headers: { Authorization: `Bearer ${longToken}` },
    })
    expect(response).toBeTypeOf('string')
    const { userId, iat, exp } = decode<any>(response)
    expect(userId).toBe(1)
    expect(iat).toBeGreaterThanOrEqual(t1)
    expect(iat).toBeLessThanOrEqual(Math.ceil(Date.now() / 1000))
    expect(exp).toBe(iat + 7 * 24 * 60 * 60)
  })

  it('invalidates old token', async () => {
    const response = await $fetch('/api/renew-token', {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('does not renew without authorization header', async () => {
    const response = await $fetch('/api/renew-token', { method: 'post', ignoreResponseError: true })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('renews renewed token', async () => {
    const response = await $fetch('/api/renew-token', {
      method: 'post',
      headers: { Authorization: `Bearer ${renewedToken}` },
    })
    expect(response).toBeTypeOf('string')
  })
})
