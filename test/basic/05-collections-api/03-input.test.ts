import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('input', () => {
  it('validates undefined body', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      email: expect.any(String),
      password: expect.any(String),
    })
  })

  it('validates null body', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: null,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      email: expect.any(String),
      password: expect.any(String),
    })
  })

  it('validates array body when creating', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: [null],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe(
      'The request body must be either an object with key-value pairs or an array containing key-value objects',
    )
  })

  it('validates array body when updating', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'patch',
      body: [null],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('The request body must be an object with key-value pairs')
  })

  it('validates nonexistent field when creating', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'post',
      body: [{ foo: 'bar' }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The field 'foo' does not exist")
  })

  it('validates nonexistent field when updating', async () => {
    const response = await $fetch('/api/collections/users', {
      method: 'patch',
      body: { foo: 'bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The field 'foo' does not exist")
  })
})
