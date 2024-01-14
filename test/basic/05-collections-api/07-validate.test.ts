import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('validate api', () => {
  it('validates multi-entry collection (post)', async () => {
    const response = await $fetch('/api/collections/users/validate', {
      method: 'post',
      body: { dashboardLanguage: 'fr' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      capabilities: 'Invalid input type',
      dashboardLanguage: "Invalid value: 'fr'",
      firstName: 'Invalid input type',
      lastName: 'Invalid input type',
      email: 'This field is required',
      isActive: 'Invalid input type',
      isAdmin: 'Invalid input type',
      language: 'Invalid input type',
      password: 'This field is required',
      role: 'Invalid input type',
      translations: 'Invalid input type',
      dateFormat: 'This field is required',
      timeFormat: 'This field is required',
    })
  })

  it('validates multi-entry collection (patch)', async () => {
    const response = await $fetch('/api/collections/users/validate', {
      method: 'patch',
      body: { dashboardLanguage: 'fr' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      dashboardLanguage: "Invalid value: 'fr'",
    })
  })

  it('validates single-entry collection (patch)', async () => {
    const response = await $fetch('/api/collections/seo/validate', {
      method: 'patch',
      body: { baseTitle: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      baseTitle: 'Invalid input type',
    })
  })

  it('does not accept invalid routes', async () => {
    const response1 = await $fetch('/api/collections/users/1/validate', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    const response2 = await $fetch('/api/collections/users/1/validate', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    const response3 = await $fetch('/api/collections/users/validate/1', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    const response4 = await $fetch('/api/collections/users/validate/1', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    const response5 = await $fetch('/api/collections/seo/validate/1', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toBeTypeOf('string')
    expect(response2).toBeTypeOf('string')
    expect(response3).toBeTypeOf('string')
    expect(response4).toBeTypeOf('string')
    expect(response5).toBeTypeOf('string')
  })
})
