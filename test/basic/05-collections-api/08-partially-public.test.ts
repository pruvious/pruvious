import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('partially public routes', () => {
  it('can create', async () => {
    const response = await $fetch('/api/collections/partially-public?select=name', {
      method: 'post',
      body: { name: 'foo' },
    })

    expect(response).toEqual({ name: 'foo' })
  })

  it('cannot create many', async () => {
    const response = await $fetch('/api/collections/partially-public?select=name', {
      method: 'post',
      body: [{ name: 'foo' }],
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('can read', async () => {
    const response = await $fetch('/api/collections/partially-public/1?select=name')
    expect(response).toEqual({ name: 'foo' })
  })

  it('cannot read many', async () => {
    const response = await $fetch('/api/collections/partially-public', { ignoreResponseError: true })
    expect(response).toBe('Resource not found')
  })

  it('cannot update', async () => {
    const response = await $fetch('/api/collections/partially-public/1', {
      method: 'patch',
      body: { name: 'bar' },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('cannot update many', async () => {
    const response = await $fetch('/api/collections/partially-public', {
      method: 'patch',
      body: { name: 'bar' },
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('cannot delete', async () => {
    const response = await $fetch('/api/collections/partially-public/1', {
      method: 'delete',
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })

  it('cannot delete many', async () => {
    const response = await $fetch('/api/collections/partially-public', {
      method: 'delete',
      ignoreResponseError: true,
    })

    expect(response).toBe('Resource not found')
  })
})
