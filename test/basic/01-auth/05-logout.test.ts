import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('logout', () => {
  let token1 = ''
  let token2 = ''
  let token3 = ''
  let token4 = ''

  /*
  |--------------------------------------------------------------------------
  | Create temp user
  |--------------------------------------------------------------------------
  |
  */
  it('creates temp user', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'logout-user@foo.bar', password: 12345678, isActive: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response.email).toBe('logout-user@foo.bar')
  })

  it('logs in', async () => {
    token1 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
    token2 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
    token3 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
    token4 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
  })

  /*
  |--------------------------------------------------------------------------
  | /api/logout
  |--------------------------------------------------------------------------
  |
  */
  it('logs out', async () => {
    const response = await $fetch('/api/logout', {
      method: 'post',
      headers: { Authorization: `Bearer ${token1}` },
    })
    expect(response).toBe(true)
  })

  it('does not log out without token', async () => {
    const response = await $fetch('/api/logout', { method: 'post', ignoreResponseError: true })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('does not log out with invalid token', async () => {
    const response = await $fetch('/api/logout', {
      method: 'post',
      headers: { Authorization: `Bearer ${token1}` },
      ignoreResponseError: true,
    })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  /*
  |--------------------------------------------------------------------------
  | /api/logout-others
  |--------------------------------------------------------------------------
  |
  */
  it('logs out others', async () => {
    const response = await $fetch('/api/logout-others', {
      method: 'post',
      headers: { Authorization: `Bearer ${token2}` },
    })
    expect(response).toBe(2)
  })

  it('logs out nonexistent others', async () => {
    const response = await $fetch('/api/logout-others', {
      method: 'post',
      headers: { Authorization: `Bearer ${token2}` },
    })
    expect(response).toBe(0)
  })

  it('does not log out others without token', async () => {
    const response = await $fetch('/api/logout-others', { method: 'post', ignoreResponseError: true })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('does not log out others with invalid token', async () => {
    const response = await $fetch('/api/logout-others', {
      method: 'post',
      headers: { Authorization: `Bearer ${token3}` },
      ignoreResponseError: true,
    })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  /*
  |--------------------------------------------------------------------------
  | /api/logout-all
  |--------------------------------------------------------------------------
  |
  */
  it('logs out all (1 session)', async () => {
    const response = await $fetch('/api/logout-all', { method: 'post', headers: { Authorization: `Bearer ${token2}` } })
    expect(response).toBe(1)
  })

  it('logs in again', async () => {
    token1 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
    token2 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
    token3 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
    token4 = await $fetch('/api/login', { method: 'post', body: { email: 'logout-user@foo.bar', password: 12345678 } })
  })

  it('logs out all (4 sessions)', async () => {
    const response = await $fetch('/api/logout-all', { method: 'post', headers: { Authorization: `Bearer ${token1}` } })
    expect(response).toBe(4)
  })

  it('does not log out all without token', async () => {
    const response = await $fetch('/api/logout-all', { method: 'post', ignoreResponseError: true })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('does not log out all with invalid token', async () => {
    const response1 = await $fetch('/api/logout-all', {
      method: 'post',
      headers: { Authorization: `Bearer ${token1}` },
      ignoreResponseError: true,
    })

    const response2 = await $fetch('/api/logout-all', {
      method: 'post',
      headers: { Authorization: `Bearer ${token2}` },
      ignoreResponseError: true,
    })

    expect(response1).toBe('Unauthorized due to either invalid credentials or missing authentication')
    expect(response2).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  /*
  |--------------------------------------------------------------------------
  | Delete temp user
  |--------------------------------------------------------------------------
  |
  */
  it('deletes temp user', async () => {
    const response = await $fetch('/api/collections/users/2', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response.email).toBe('logout-user@foo.bar')
  })
})
