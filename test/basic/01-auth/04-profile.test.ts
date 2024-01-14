import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('profile', () => {
  it('reads profile', async () => {
    const response = await $fetch('/api/profile', { headers: { Authorization: `Bearer ${process.env.TOKEN}` } })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: null,
      isActive: true,
      isAdmin: true,
      firstName: '',
      lastName: '',
      email: 'admin@pruvious.com',
      role: null,
      capabilities: [],
      dashboardLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('does not read profile when logged out', async () => {
    const response = await $fetch('/api/profile', { ignoreResponseError: true })
    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('updates profile', async () => {
    const response = await $fetch('/api/profile', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      body: {
        id: 9001,
        language: 'de',
        translations: 'foo',
        isActive: false,
        isAdmin: false,
        firstName: 'Foo',
        lastName: 'Bar',
        email: 'administrator@pruvious.com',
        password: 87654321,
        role: null,
        capabilities: [],
        dashboardLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss',
        createdAt: 1337,
        updatedAt: 1337,
      },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: null,
      isActive: true,
      isAdmin: true,
      firstName: 'Foo',
      lastName: 'Bar',
      email: 'admin@pruvious.com',
      role: null,
      capabilities: [],
      dashboardLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
    expect(response.createdAt).not.toBe(1337)
    expect(response.updatedAt).not.toBe(1337)
  })

  it('logs in with new password', async () => {
    const response = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'admin@pruvious.com', password: 87654321 },
    })
    expect(response).toBeTypeOf('string')
  })

  it('validates when updating profile', async () => {
    const response = await $fetch('/api/profile', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      body: {
        id: 9001,
        language: 'foo',
        translations: null,
        isActive: 'foo',
        isAdmin: 'foo',
        email: true,
        password: true,
        role: null,
        capabilities: [],
        dashboardLanguage: 'foo',
      },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      password: expect.any(String),
      dashboardLanguage: expect.any(String),
    })
  })

  it('reverts profile', async () => {
    const response = await $fetch('/api/profile', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      body: { firstName: '', lastName: '', password: 12345678, dashboardLanguage: 'en' },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: null,
      isActive: true,
      isAdmin: true,
      firstName: '',
      lastName: '',
      email: 'admin@pruvious.com',
      role: null,
      capabilities: [],
      dashboardLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })
})
