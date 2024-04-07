import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('records field', () => {
  let roleId = 0
  let userId = 0
  let recordsId = 0

  it('creates temp user and role', async () => {
    const response1 = await $fetch('/api/collections/roles', {
      method: 'post',
      body: { name: 'records-field', capabilities: ['collection-roles-create'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1.name).toBe('records-field')
    roleId = response1.id

    const response2 = await $fetch('/api/collections/users', {
      method: 'post',
      body: {
        email: 'records-field@foo.bar',
        password: 12345678,
        isActive: true,
        role: roleId,
        capabilities: ['collection-users-create'],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2.email).toBe('records-field@foo.bar')
    userId = response2.id
  })

  it('accepts values', async () => {
    const response = await $fetch(
      '/api/collections/records-fields?select=id,users,roles,populatedUsers,populatedRoles,requiredUsers',
      {
        method: 'post',
        body: {
          users: [1, userId, userId],
          populatedUsers: [userId.toString()],
          populatedRoles: [roleId],
          requiredUsers: [userId],
        },
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({
      id: expect.any(Number),
      users: [1, userId],
      roles: [],
      populatedUsers: [userId],
      populatedRoles: [roleId],
      requiredUsers: [userId],
    })

    recordsId = response.id
  })

  it('populates values', async () => {
    const response = await $fetch(
      `/api/collections/records-fields/${recordsId}?select=users,roles,populatedUsers,populatedRoles,requiredUsers&populate=true`,
      { headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response).toEqual({
      users: [{ id: 1 }, { id: userId }],
      roles: [],
      populatedUsers: [
        { id: userId, role: { id: roleId, name: 'records-field', capabilities: ['collection-roles-create'] } },
      ],
      populatedRoles: [{ id: roleId }],
      requiredUsers: [{ id: userId }],
    })
  })

  it('does not accept negative ids', async () => {
    const response = await $fetch('/api/collections/records-fields', {
      method: 'post',
      body: { requiredUsers: [-1] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ requiredUsers: 'Invalid input type' })
  })

  it('does not accept nonexistent ids', async () => {
    const response = await $fetch('/api/collections/records-fields', {
      method: 'post',
      body: { roles: [9001], requiredUsers: [9001] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'roles.0': 'The role does not exist', 'requiredUsers.0': 'The user does not exist' })
  })

  it('does not accept other values', async () => {
    const response = await $fetch('/api/collections/records-fields', {
      method: 'post',
      body: { requiredUsers: [null] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ requiredUsers: 'Invalid input type' })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/records-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ requiredUsers: 'This field is required' })
  })

  it('filters with records field specific where clauses', async () => {
    const response = await $fetch(`/api/fields/where-records?userId=${userId}`)

    expect(response).toEqual({
      whereRecordsIn1: true,
      whereRecordsIn2: false,
      whereRecordsNotIn1: false,
      whereRecordsNotIn2: true,

      whereRecordsInUserIdOr1: true,
      whereRecordsInUserIdAnd1: true,

      whereRecordsInUserIdOr2: true,
      whereRecordsInUserIdAnd2: false,

      whereRecordsNotInUserIdOr1: false,
      whereRecordsNotInUserIdAnd1: false,

      whereRecordsNotInUserIdOr2: true,
      whereRecordsNotInUserIdAnd2: false,
    })
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

    expect(response1.name).toBe('records-field')
    expect(response2.email).toBe('records-field@foo.bar')
  })

  it('fallbacks populated values', async () => {
    const response = await $fetch(
      `/api/collections/records-fields/${recordsId}?select=users,roles,populatedUsers,populatedRoles,requiredUsers&populate=true`,
      { headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response).toEqual({
      users: [{ id: 1 }],
      roles: [],
      populatedUsers: [],
      populatedRoles: [],
      requiredUsers: [],
    })
  })
})
