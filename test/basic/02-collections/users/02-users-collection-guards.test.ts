import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: users collection guards', async () => {
  let adminId = 0
  let nonAdminId = 0
  let adminToken = ''
  let nonAdminToken = ''

  it('creates temp users', async () => {
    const response1 = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'admin@foo.bar', password: 12345678, isActive: true, isAdmin: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'non-admin@foo.bar',
        password: 12345678,
        isActive: true,
        isAdmin: false,
        capabilities: [
          'collection-users-create',
          'collection-users-read',
          'collection-users-update',
          'collection-users-delete',
        ],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1.email).toBe('admin@foo.bar')
    expect(response1.isAdmin).toBe(true)
    expect(response2.email).toBe('non-admin@foo.bar')
    expect(response2.isAdmin).toBe(false)

    adminId = response1.id
    nonAdminId = response2.id
  })

  it('logs in', async () => {
    adminToken = await $fetch('/api/login', { method: 'post', body: { email: 'admin@foo.bar', password: 12345678 } })
    nonAdminToken = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'non-admin@foo.bar', password: 12345678 },
    })
  })

  it('non-admins cannot delete admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('You are not authorized to delete admin users')
  })

  it('admins can delete admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.email).toBe('admin@foo.bar')
  })

  it('deletes temp users', async () => {
    const response = await $fetch(`/api/collections/users/${nonAdminId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.email).toBe('non-admin@foo.bar')
  })
})
