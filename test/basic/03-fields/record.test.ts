import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('record field', () => {
  const create = '/api/fields/create-record-fields'
  const createRequired = '/api/fields/create-required-record-fields'

  let roleId = 0
  let userId = 0

  it('creates temp user and role', async () => {
    const response1 = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'record-field', capabilities: ['collection-roles-create'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1.name).toBe('record-field')
    roleId = response1.id

    const response2 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'record-field@foo.bar',
        password: 12345678,
        isActive: true,
        role: roleId,
        capabilities: ['collection-users-create'],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2.email).toBe('record-field@foo.bar')
    userId = response2.id
  })

  it('defaults to null', async () => {
    const response = await $fetch(create, { method: 'post' })
    expect(response.record.value).toBe(null)
  })

  it('accepts existing id', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: userId } })
    expect(response.record.value).toBe(userId)
  })

  it('accepts null', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: null } })
    expect(response.record.value).toBe(null)
  })

  it('does not accept negative id', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: -1 } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBe('Invalid input type')
  })

  it('does not accept nonexistent id', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 9001 } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBe('The user does not exist')
  })

  it('does not accept other values', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: true } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBe('Invalid input type')
  })

  it('passes required validation with existing id', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: userId } })
    expect(response.record.value).toEqual({
      id: userId,
      email: 'record-field@foo.bar',
      capabilities: ['collection-users-create'],
      role: {
        id: roleId,
        name: 'record-field',
        capabilities: ['collection-roles-create'],
      },
    })
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch(createRequired, { method: 'post' })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBe('This field is required')
  })

  it('fails required validation with null', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: null } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBe('This field is required')
  })

  it('deletes temp user and role', async () => {
    const response1 = await $fetch(`/api/collections/roles/${roleId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch(`/api/collections/users/${userId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1.name).toBe('record-field')
    expect(response2.email).toBe('record-field@foo.bar')
  })
})
