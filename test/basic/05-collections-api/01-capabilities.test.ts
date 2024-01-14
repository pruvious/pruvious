import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('capabilities', () => {
  let c = 0
  let r = 0
  let u = 0
  let d = 0
  let roleId = 0
  let cToken = ''
  let rToken = ''
  let uToken = ''
  let dToken = ''

  it('creates temp users', async () => {
    const response1 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'c@foo.bar',
        password: 12345678,
        isActive: true,
        isAdmin: false,
        capabilities: ['collection-roles-create'],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1.email).toBe('c@foo.bar')
    c = response1.id

    const response2 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'r@foo.bar',
        password: 12345678,
        isActive: true,
        isAdmin: false,
        capabilities: ['collection-roles-read'],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2.email).toBe('r@foo.bar')
    r = response2.id

    const response3 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'u@foo.bar',
        password: 12345678,
        isActive: true,
        isAdmin: false,
        capabilities: ['collection-roles-update'],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3.email).toBe('u@foo.bar')
    u = response3.id

    const response4 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'd@foo.bar',
        password: 12345678,
        isActive: true,
        isAdmin: false,
        capabilities: ['collection-roles-delete'],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response4.email).toBe('d@foo.bar')
    d = response4.id
  })

  it('logs in', async () => {
    cToken = await $fetch('/api/login', { method: 'post', body: { email: 'c@foo.bar', password: 12345678 } })
    rToken = await $fetch('/api/login', { method: 'post', body: { email: 'r@foo.bar', password: 12345678 } })
    uToken = await $fetch('/api/login', { method: 'post', body: { email: 'u@foo.bar', password: 12345678 } })
    dToken = await $fetch('/api/login', { method: 'post', body: { email: 'd@foo.bar', password: 12345678 } })
  })

  /*
  |--------------------------------------------------------------------------
  | create
  |--------------------------------------------------------------------------
  |
  */
  it('user c can create roles', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'c-role' },
      headers: { Authorization: `Bearer ${cToken}` },
    })

    expect(response.name).toBe('c-role')
    roleId = response.id
  })

  it('user r cannot create roles', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'r-role' },
      headers: { Authorization: `Bearer ${rToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to create roles")
  })

  it('user u cannot create roles', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'u-role' },
      headers: { Authorization: `Bearer ${uToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to create roles")
  })

  it('user u cannot create roles', async () => {
    const response = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'd-role' },
      headers: { Authorization: `Bearer ${dToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to create roles")
  })

  /*
  |--------------------------------------------------------------------------
  | read
  |--------------------------------------------------------------------------
  |
  */
  it('user c cannot read roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${cToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to read roles")
  })

  it('user r can read roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${rToken}` },
    })

    expect(response.name).toBe('c-role')
  })

  it('user u cannot read roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${uToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to read roles")
  })

  it('user u cannot read roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${dToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to read roles")
  })

  /*
  |--------------------------------------------------------------------------
  | update
  |--------------------------------------------------------------------------
  |
  */
  it('user c cannot update roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'patch',
      body: { name: 'c-role' },
      headers: { Authorization: `Bearer ${cToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to update roles")
  })

  it('user r cannot update roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'patch',
      body: { name: 'r-role' },
      headers: { Authorization: `Bearer ${rToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to update roles")
  })

  it('user u can update roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'patch',
      body: { name: 'u-role' },
      headers: { Authorization: `Bearer ${uToken}` },
    })

    expect(response.name).toBe('u-role')
  })

  it('user d cannot update roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'patch',
      body: { name: 'd-role' },
      headers: { Authorization: `Bearer ${dToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to update roles")
  })

  /*
  |--------------------------------------------------------------------------
  | delete
  |--------------------------------------------------------------------------
  |
  */
  it('user c cannot delete roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${cToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to delete roles")
  })

  it('user r cannot delete roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${rToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to delete roles")
  })

  it('user u cannot delete roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${uToken}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("You don't have the necessary permissions to delete roles")
  })

  it('user d can delete roles', async () => {
    const response = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${dToken}` },
    })

    expect(response.name).toBe('u-role')
  })

  /*
  |--------------------------------------------------------------------------
  | other
  |--------------------------------------------------------------------------
  |
  */
  it('inherits role capabilities', async () => {
    const response1 = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'd-temp', capabilities: ['collection-roles-delete', 'test-capability'] },
      headers: { Authorization: `Bearer ${cToken}` },
    })

    expect(response1.name).toBe('d-temp')

    const response2 = await $fetch(`/api/collections/users/${c}`, {
      method: 'patch',
      body: { role: response1.id },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2.role).toBe(response1.id)

    const response3 = await $fetch(`/api/collections/roles/${response1.id}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${cToken}` },
    })

    expect(response3.name).toBe('d-temp')

    const response4 = await $fetch(`/api/collections/users/${c}`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response4.role).toBe(null)
  })

  it('deletes temp users', async () => {
    const response1 = await $fetch(`/api/collections/users/${c}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1.email).toBe('c@foo.bar')

    const response2 = await $fetch(`/api/collections/users/${r}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2.email).toBe('r@foo.bar')

    const response3 = await $fetch(`/api/collections/users/${u}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3.email).toBe('u@foo.bar')

    const response4 = await $fetch(`/api/collections/users/${d}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response4.email).toBe('d@foo.bar')
  })
})
