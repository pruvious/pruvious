import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: users field guards', async () => {
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
    expect(response2.email).toBe('non-admin@foo.bar')

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

  it('non-admins cannot deactivate admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'patch',
      body: { isActive: false },
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ isActive: 'You are not authorized to deactivate admin users' })
  })

  it('admins can deactivate other admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}?select=email,isActive`, {
      method: 'patch',
      body: { isActive: false },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      isActive: false,
      email: 'admin@foo.bar',
    })
  })

  it('deactivated admins cannot operate', async () => {
    const response = await $fetch('/api/renew-token', {
      method: 'post',
      headers: { Authorization: `Bearer ${adminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')

    await $fetch(`/api/collections/users/${adminId}`, {
      method: 'patch',
      body: { isActive: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
  })

  it('admins can demote other admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}?select=email,isAdmin`, {
      method: 'patch',
      body: { isAdmin: false },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      isAdmin: false,
      email: 'admin@foo.bar',
    })

    await $fetch(`/api/collections/users/${adminId}`, {
      method: 'patch',
      body: { isAdmin: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
  })

  it('non-admins cannot create admins', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-8@foo.bar', password: '12345678', isAdmin: true },
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ isAdmin: 'You are not authorized to create admin users' })
  })

  it('non-admins cannot demote admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'patch',
      body: { isAdmin: false },
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ isAdmin: 'You are not authorized to demote admin users' })
  })

  it('non-admins cannot promote other users to admins', async () => {
    const response = await $fetch(`/api/collections/users/${nonAdminId}`, {
      method: 'patch',
      body: { isAdmin: true },
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ isAdmin: 'You are not authorized to promote users to admin status' })
  })

  it('non-admins cannot change emails of admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'patch',
      body: { email: 'admin-updated@foo.bar' },
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ email: 'You are not authorized to modify the email addresses of admin users' })
  })

  it('non-admins cannot change passwords of admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'patch',
      body: { password: 87654321 },
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ password: 'You are not authorized to change passwords for admin users' })
  })

  it('non-admins cannot delete admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('You are not authorized to delete admin users')
  })

  it('users cannot delete themselves', async () => {
    const response = await $fetch(`/api/collections/users/${nonAdminId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('You cannot delete your own user account')
  })

  it('admins can delete admins', async () => {
    const response = await $fetch(`/api/collections/users/${adminId}?select=email`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(response).toEqual({ email: 'admin@foo.bar' })
  })

  it('deletes temp user', async () => {
    const response = await $fetch(`/api/collections/users/${nonAdminId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.email).toBe('non-admin@foo.bar')
  })
})
