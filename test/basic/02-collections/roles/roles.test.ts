import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: roles', async () => {
  it('creates a role', async () => {
    const t1 = Date.now()
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: {
        name: ' role-1  ',
        capabilities: ['collection-roles-create'],
        translations: 'bar',
        createdAt: 1337,
        updatedAt: 1337,
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    const t2 = Date.now()

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: 'bar',
      name: 'role-1',
      capabilities: ['collection-roles-create'],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
    expect(response.createdAt).toBeGreaterThanOrEqual(t1)
    expect(response.createdAt).toBeLessThanOrEqual(t2)
    expect(response.updatedAt).toBeGreaterThanOrEqual(t1)
    expect(response.updatedAt).toBeLessThanOrEqual(t2)

    await $fetch('/api/collections/users', {
      method: 'patch',
      body: { role: 1 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
  })

  it('validates language input', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'role-2', language: 'de' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ language: 'This collection does not support translations' })
  })

  it('validates translations input', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'role-2', translations: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ translations: 'Invalid input type' })
  })

  it('validates name input type', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ name: expect.any(String) })
  })

  it('requires name', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ name: expect.any(String) })
  })

  it('validates name uniqueness', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'role-1' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ name: expect.any(String) })
  })

  it('validates capabilities', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'role-2', capabilities: ['test'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ capabilities: expect.any(String) })
  })

  it('creates many roles', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: [{ name: 'role-2' }, { name: 'role-3' }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([
      {
        id: expect.any(Number),
        language: 'en',
        translations: expect.any(String),
        name: 'role-2',
        capabilities: [],
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      },
      {
        id: expect.any(Number),
        language: 'en',
        translations: expect.any(String),
        name: 'role-3',
        capabilities: [],
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      },
    ])
  })

  it('validates when creating many roles', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: [{ name: 'role-2' }, { name: 'role-3' }, { name: 'role-4' }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual([{ name: expect.any(String) }, { name: expect.any(String) }, null])
  })

  it('does not create roles with the same name', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: [{ name: 'role-new-create' }, { name: 'role-new-create' }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual([{ name: expect.any(String) }, { name: expect.any(String) }])
  })

  it('reads a role', async () => {
    const response = await $fetch('/api/collections/roles/1', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      name: 'role-1',
      capabilities: ['collection-roles-create'],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('reads a nonexistent role', async () => {
    const response = await $fetch('/api/collections/roles/9001', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('reads name field only', async () => {
    const response = await $fetch('/api/collections/roles/1?select=name', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ name: 'role-1' })
  })

  it('reads nonexistent field', async () => {
    const response = await $fetch('/api/collections/roles/1?select=foo', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBeTypeOf('string')
  })

  it('reads many roles', async () => {
    const response = await $fetch('/api/collections/roles?limit=2', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      currentPage: 1,
      lastPage: 2,
      perPage: 2,
      total: 3,
      records: [
        {
          id: expect.any(Number),
          language: 'en',
          translations: expect.any(String),
          name: 'role-1',
          capabilities: ['collection-roles-create'],
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
        {
          id: expect.any(Number),
          language: 'en',
          translations: expect.any(String),
          name: 'role-2',
          capabilities: [],
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
      ],
    })
  })

  it('searches roles', async () => {
    const response = await $fetch(`/api/collections/roles?select=name&search=collection roles create&order=name`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      currentPage: 1,
      lastPage: 1,
      perPage: 1,
      total: 1,
      records: [{ name: 'role-1' }],
    })
  })

  it('does not accept nonexistent fields', async () => {
    const response = await $fetch('/api/collections/roles?select=foo', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBeTypeOf('string')
  })

  it('updates a role', async () => {
    const t1 = Date.now()
    const response = await $fetch('/api/collections/roles/3', {
      method: 'patch',
      body: { name: ' role-3-updated  ', createdAt: 1337, updatedAt: 1337 },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    const t2 = Date.now()

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      translations: expect.any(String),
      name: 'role-3-updated',
      capabilities: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })

    expect(response.createdAt).toBeLessThan(t1)
    expect(response.updatedAt).toBeGreaterThanOrEqual(t1)
    expect(response.updatedAt).toBeLessThanOrEqual(t2)
  })

  it('updates a nonexistent role', async () => {
    const response = await $fetch('/api/collections/roles/9001', {
      method: 'patch',
      body: { name: ' role-9001-updated  ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('updates a role with query parameters', async () => {
    const response = await $fetch('/api/collections/roles/3?select=id,capabilities&where=id[lt][2]&group=id&limit=0', {
      method: 'patch',
      body: { capabilities: ['collection-roles-delete'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: 3, capabilities: ['collection-roles-delete'] })
  })

  it('ignores translations input', async () => {
    const response = await $fetch('/api/collections/roles/1?select=translations', {
      method: 'patch',
      body: { translations: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ translations: expect.any(String) })
    expect(response.translations).not.toBe('foo')
  })

  it('updates many roles', async () => {
    const response = await $fetch('/api/collections/roles?select=name,capabilities&where=id[gt][1]&group=id&limit=0', {
      method: 'patch',
      body: { capabilities: ['collection-roles-update'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.sort((a: any, b: any) => a.name - b.name)).toEqual([
      { name: 'role-2', capabilities: ['collection-roles-update'] },
      { name: 'role-3-updated', capabilities: ['collection-roles-update'] },
    ])
  })

  it('does not update roles to the same name', async () => {
    const response = await $fetch('/api/collections/roles?where=id[lt][3]', {
      method: 'patch',
      body: { name: 'role-new' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ name: expect.any(String) })
  })

  it('updates no role', async () => {
    const response = await $fetch('/api/collections/roles?select=name&where=id[gt][9001]', {
      method: 'patch',
      body: { capabilities: [] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([])
  })

  it('does not update record language', async () => {
    const response = await $fetch('/api/collections/roles/1?select=language', {
      method: 'patch',
      body: { language: 'de' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ language: 'en' })
  })

  it('deletes a role with query parameters', async () => {
    const response = await $fetch('/api/collections/roles/2?select=id&where=id[gt][6]&group=id&limit=0', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: 2 })
  })

  it('deletes a nonexistent role', async () => {
    const response = await $fetch('/api/collections/roles/9001', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('deletes many roles', async () => {
    const response = await $fetch('/api/collections/roles?select=id,name&where=id[gt][2]&where=id[lt][4]&limit=0', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([{ id: 3, name: 'role-3-updated' }])
  })

  it('deletes no role', async () => {
    const response = await $fetch('/api/collections/roles?select=name&where=id[gt][9001]', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      method: 'delete',
    })

    expect(response).toEqual([])
  })

  it('creates a role with query parameters', async () => {
    const response = await $fetch('/api/collections/roles?select=name&where=id[gt][9001]&limit=0', {
      method: 'post',
      body: { name: 'role-4  ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ name: 'role-4' })
  })

  it('creates many roles with query parameters', async () => {
    const response = await $fetch('/api/collections/roles?select=name&where=id[gt][9001]&limit=0', {
      method: 'post',
      body: [{ name: 'role-5' }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([{ name: 'role-5' }])
  })

  it('requires authenticated user', async () => {
    const response = await $fetch('/api/collections/roles/1', {
      headers: { Authorization: 'Bearer foo' },
      ignoreResponseError: true,
    })

    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })
})
