import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('operation specific guards', () => {
  let id = 0
  let token = ''

  it('creates temp user', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'temp@foo.bar',
        password: 12345678,
        isActive: true,
        isAdmin: false,
        capabilities: [
          'collection-operation-specific-guards-create',
          'collection-operation-specific-guards-create-many',
          'collection-operation-specific-guards-read',
          'collection-operation-specific-guards-read-many',
          'collection-operation-specific-guards-update',
          'collection-operation-specific-guards-update-many',
          'collection-operation-specific-guards-delete',
          'collection-operation-specific-guards-delete-many',
        ],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.email).toBe('temp@foo.bar')
    id = response.id
  })

  it('logs in', async () => {
    token = await $fetch('/api/login', { method: 'post', body: { email: 'temp@foo.bar', password: 12345678 } })
  })

  /*
  |--------------------------------------------------------------------------
  | create
  |--------------------------------------------------------------------------
  |
  */
  it('creates foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?select=value', {
      method: 'post',
      body: { value: 'foo' },
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual({ value: 'foo' })
  })

  it('creates many foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?select=value', {
      method: 'post',
      body: [{ value: 'foo' }, { value: 'foo' }],
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual([{ value: 'foo' }, { value: 'foo' }])
  })

  it('cannot create cc-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards', {
      method: 'post',
      body: { value: 'cc-bar' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot create cc-bar')
  })

  it('cannot create many cc-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards', {
      method: 'post',
      body: [{ value: 'foo' }, { value: 'cc-bar' }],
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot create cc-bar')
  })

  it('cannot create fc-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards', {
      method: 'post',
      body: { value: 'fc-bar' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ value: 'Cannot create fc-bar' })
  })

  it('cannot create many fc-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards', {
      method: 'post',
      body: [{ value: 'foo' }, { value: 'fc-bar' }],
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual([null, { value: 'Cannot create fc-bar' }])
  })

  /*
  |--------------------------------------------------------------------------
  | read
  |--------------------------------------------------------------------------
  |
  */
  it('reads foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards/1?select=value', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual({ value: 'foo' })
  })

  it('reads many foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?select=value&limit=1', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.records).toEqual([{ value: 'foo' }])
  })

  it('cannot read cr-bar', async () => {
    const { id } = await $fetch('/api/collections/operation-specific-guards', {
      method: 'post',
      body: { value: 'cr-bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response = await $fetch(`/api/collections/operation-specific-guards/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot read cr-bar')
  })

  it('cannot read many cr-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?where=value[=][cr-bar]', {
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot read cr-bar')
  })

  /*
  |--------------------------------------------------------------------------
  | update
  |--------------------------------------------------------------------------
  |
  */
  it('updates foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards/1?select=value', {
      method: 'patch',
      body: { value: 'baz' },
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual({ value: 'baz' })
  })

  it('updates many foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?select=value&where=id[<=][3]', {
      method: 'patch',
      body: { value: 'baz' },
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual([{ value: 'baz' }, { value: 'baz' }, { value: 'baz' }])
  })

  it('cannot update cu-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards/1', {
      method: 'patch',
      body: { value: 'cu-bar' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot update cu-bar')
  })

  it('cannot update many cu-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards', {
      method: 'patch',
      body: { value: 'cu-bar' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot update cu-bar')
  })

  it('cannot update fu-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards/1', {
      method: 'patch',
      body: { value: 'fu-bar' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ value: 'Cannot update fu-bar' })
  })

  it('cannot update many fu-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?where=id[<=][2]', {
      method: 'patch',
      body: { value: 'fu-bar' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ value: 'Cannot update fu-bar' })
  })

  /*
  |--------------------------------------------------------------------------
  | delete
  |--------------------------------------------------------------------------
  |
  */
  it('deletes foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards/1?select=value', {
      method: 'delete',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual({ value: 'baz' })
  })

  it('deletes many foo', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?select=value&where=id[<=][3]', {
      method: 'delete',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response).toEqual([{ value: 'baz' }, { value: 'baz' }])
  })

  it('cannot delete cd-bar', async () => {
    const { id } = await $fetch('/api/collections/operation-specific-guards', {
      method: 'post',
      body: { value: 'cd-bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response = await $fetch(`/api/collections/operation-specific-guards/${id}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot delete cd-bar')
  })

  it('cannot delete many cd-bar', async () => {
    const response = await $fetch('/api/collections/operation-specific-guards?where=value[=][cd-bar]', {
      method: 'delete',
      body: { value: 'foo' },
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Cannot delete cd-bar')
  })

  it('deletes temp user', async () => {
    const response = await $fetch(`/api/collections/users/${id}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.email).toBe('temp@foo.bar')
  })
})
