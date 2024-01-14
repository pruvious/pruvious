import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: users', async () => {
  let u3 = 0
  let u4 = 0
  let u5 = 0

  it('creates a user', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { id: 9001, email: ' user-3@foo.bar  ', password: 12345678, capabilities: ['collection-roles-create'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      isActive: false,
      isAdmin: false,
      firstName: '',
      lastName: '',
      email: 'user-3@foo.bar',
      role: null,
      capabilities: ['collection-roles-create'],
      dashboardLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
    u3 = response.id
  })

  it('validates language input', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { language: 'de', email: 'user-4@foo.bar', password: '12345678' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ language: 'This collection does not support translations' })
  })

  it('validates email input type', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: true, password: '12345678' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: expect.any(String) })
  })

  it('requires email', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { password: '12345678' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: expect.any(String) })
  })

  it('validates email format', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-4', password: '12345678' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: expect.any(String) })
  })

  it('validates email uniqueness', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-3@foo.bar', password: '12345678' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: expect.any(String) })
  })

  it('requires password', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-4@foo.bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ password: expect.any(String) })
  })

  it('does not accept empty password', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-4@foo.bar', password: '' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ password: expect.any(String) })
  })

  it('does not accept password shorter than 8 characters', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-4@foo.bar', password: '1234567' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ password: 'The password must be at least 8 characters long' })
  })

  it('validates dashboard language input type', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-4@foo.bar', password: '12345678', dashboardLanguage: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ dashboardLanguage: expect.any(String) })
  })

  it('validates dashboard language support', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-4@foo.bar', password: '12345678', dashboardLanguage: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ dashboardLanguage: expect.any(String) })
  })

  it('creates many users', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: [
        { email: 'user-4@foo.bar', password: '12345678' },
        { email: 'user-5@foo.bar', password: '12345678' },
      ],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([
      {
        id: expect.any(Number),
        language: 'en',
        translations: expect.any(String),
        isActive: false,
        isAdmin: false,
        firstName: '',
        lastName: '',
        email: 'user-4@foo.bar',
        role: null,
        capabilities: [],
        dashboardLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      },
      {
        id: expect.any(Number),
        language: 'en',
        translations: expect.any(String),
        isActive: false,
        isAdmin: false,
        firstName: '',
        lastName: '',
        email: 'user-5@foo.bar',
        role: null,
        capabilities: [],
        dashboardLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      },
    ])
    u4 = response[0].id
    u5 = response[1].id
  })

  it('validates when creating many users', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: [
        { email: 'user-4@foo.bar', password: '12345678' },
        { email: 'user-5@foo.bar', password: '12345678' },
        { email: 'user-6@foo.bar', password: '12345678' },
      ],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual([{ email: expect.any(String) }, { email: expect.any(String) }, null])
  })

  it('does not create users with the same email', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: [
        { email: 'user-same-email@foo.bar', password: 12346578 },
        { email: 'user-same-email@foo.bar', password: 12346578 },
      ],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual([{ email: expect.any(String) }, { email: expect.any(String) }])
  })

  it('reads a user', async () => {
    const response = await $fetch(`/api/collections/users/${u3}`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: u3,
      language: 'en',
      translations: expect.any(String),
      isActive: false,
      isAdmin: false,
      firstName: '',
      lastName: '',
      email: 'user-3@foo.bar',
      role: null,
      capabilities: ['collection-roles-create'],
      dashboardLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('reads a nonexistent user', async () => {
    const response = await $fetch('/api/collections/users/9001', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('reads email field only', async () => {
    const response = await $fetch(`/api/collections/users/${u3}?select=email`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ email: 'user-3@foo.bar' })
  })

  it('reads nonexistent field', async () => {
    const response = await $fetch(`/api/collections/users/${u3}?select=foo`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBeTypeOf('string')
  })

  it('reads many users', async () => {
    const response = await $fetch(`/api/collections/users?where=id[>][${u3}]&limit=2&order=id`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      currentPage: 1,
      lastPage: 1,
      perPage: 2,
      total: 2,
      records: [
        {
          id: u4,
          language: 'en',
          translations: expect.any(String),
          isActive: false,
          isAdmin: false,
          firstName: '',
          lastName: '',
          email: 'user-4@foo.bar',
          role: null,
          capabilities: [],
          dashboardLanguage: 'en',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
        {
          id: u5,
          language: 'en',
          translations: expect.any(String),
          isActive: false,
          isAdmin: false,
          firstName: '',
          lastName: '',
          email: 'user-5@foo.bar',
          role: null,
          capabilities: [],
          dashboardLanguage: 'en',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
      ],
    })
  })

  it('reads many users with various query string parameters', async () => {
    const response = await $fetch(
      `/api/collections/users?select=email&where=id[>=][${u3}]&order=id:desc&offset=2&limit=2`,
      { headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response).toEqual({
      currentPage: 2,
      lastPage: 2,
      perPage: 2,
      total: 3,
      records: [{ email: 'user-3@foo.bar' }],
    })
  })

  it('searches users', async () => {
    const response = await $fetch(`/api/collections/users?select=email&search=@foo.bar&order=email`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      currentPage: 1,
      lastPage: 1,
      perPage: 3,
      total: 3,
      records: [{ email: 'user-3@foo.bar' }, { email: 'user-4@foo.bar' }, { email: 'user-5@foo.bar' }],
    })
  })

  it('does not accept nonexistent fields', async () => {
    const response = await $fetch('/api/collections/users?select=foo', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBeTypeOf('string')
  })

  it('does not read password field', async () => {
    const response = await $fetch('/api/collections/users?select=password&limit=1', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The field 'password' cannot be queried")
  })

  it('does not query password field', async () => {
    const response = await $fetch('/api/collections/users?where=password[gt][i]', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The field 'password' cannot be queried")
  })

  it('updates a user', async () => {
    const response = await $fetch(`/api/collections/users/${u3}`, {
      method: 'patch',
      body: { email: ' user-3-updated@foo.bar  ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: u3,
      language: 'en',
      translations: expect.any(String),
      isActive: false,
      isAdmin: false,
      firstName: '',
      lastName: '',
      email: 'user-3-updated@foo.bar',
      role: null,
      capabilities: ['collection-roles-create'],
      dashboardLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('updates a nonexistent user', async () => {
    const response = await $fetch('/api/collections/users/9001', {
      method: 'patch',
      body: { email: ' user-9001-updated@foo.bar  ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('updates a user with query parameters', async () => {
    const response = await $fetch(
      `/api/collections/users/${u3}?select=id,isActive&where=id[gt][${u3}]&group=id&limit=0`,
      {
        method: 'patch',
        body: { isActive: true },
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({ id: u3, isActive: true })
  })

  it('updates many users', async () => {
    const response = await $fetch(`/api/collections/users?select=id,isActive&where=id[gt][${u3}]&group=id&limit=0`, {
      method: 'patch',
      body: { isActive: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.sort((a: any, b: any) => a.id - b.id)).toEqual([
      { id: u4, isActive: true },
      { id: u5, isActive: true },
    ])
  })

  it('does not update users to the same email', async () => {
    const response = await $fetch(`/api/collections/users?where=id[gt][${u3}]`, {
      method: 'patch',
      body: { email: 'user-new@foo.bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: expect.any(String) })
  })

  it('updates no user', async () => {
    const response = await $fetch('/api/collections/users?select=id,isActive&where=id[gt][9001]', {
      method: 'patch',
      body: { isActive: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([])
  })

  it('does not update record language', async () => {
    const response = await $fetch(`/api/collections/users/${u3}?select=language`, {
      method: 'patch',
      body: { language: 'de' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ language: 'en' })
  })

  it('deletes a user with query parameters', async () => {
    const response = await $fetch(`/api/collections/users/${u5}?select=id&where=id[gt][9001]&group=id&limit=0`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: u5 })
  })

  it('deletes a nonexistent user', async () => {
    const response = await $fetch('/api/collections/users/9001', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('deletes many users', async () => {
    const response = await $fetch(
      `/api/collections/users?select=id,isActive&where=id[gt][${u3}]&where=id[lt][${u5}]&limit=0`,
      {
        method: 'delete',
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual([{ id: u4, isActive: true }])
  })

  it('deletes no user', async () => {
    const response = await $fetch('/api/collections/users?select=id,isActive&where=id[gt][9001]', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      method: 'delete',
    })

    expect(response).toEqual([])
  })

  it('creates a user with query parameters', async () => {
    const response = await $fetch('/api/collections/users?select=email&where=id[gt][9001]&limit=0', {
      method: 'post',
      body: { email: 'user-6@foo.bar  ', password: 12345678 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ email: 'user-6@foo.bar' })
  })

  it('creates many users with query parameters', async () => {
    const response = await $fetch('/api/collections/users?select=email&where=id[gt][9001]&limit=0', {
      method: 'post',
      body: [{ email: 'user-7@foo.bar  ', password: 12345678 }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([{ email: 'user-7@foo.bar' }])
  })

  it('requires authenticated user', async () => {
    const response = await $fetch('/api/collections/users/1', {
      headers: { Authorization: 'Bearer foo' },
      ignoreResponseError: true,
    })

    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('validates role', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-8@foo.bar', password: '12345678', role: 9001 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ role: expect.any(String) })
  })

  it('nullifies role', async () => {
    const response1 = await $fetch('/api/collections/roles?select=id', {
      method: 'post',
      body: { name: 'temp-role', capabilities: ['test-capability'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response1).toEqual({ id: expect.any(Number) })

    const response2 = await $fetch('/api/collections/users?select=id,role,translations&populate=yes', {
      method: 'post',
      body: { email: 'user-8@foo.bar', password: '12345678', role: response1.id },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response2).toEqual({
      id: expect.any(Number),
      role: { id: response1.id, name: 'temp-role', capabilities: ['test-capability'] },
      translations: null,
    })

    const response3 = await $fetch(`/api/collections/roles/${response1.id}?select=id`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response3).toEqual({ id: response1.id })

    const response4 = await $fetch(`/api/collections/users/${response2.id}?select=role&populate=yes`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response4).toEqual({ role: null })
  })
})
