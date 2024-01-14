import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('translatable strings', () => {
  it('returns pruvious dashboard strings (en)', async () => {
    const response = await $fetch('/api/translatable-strings/pruvious-dashboard')
    expect(response).toBeTypeOf('object')
    expect(response['Sign in']).toBe('Sign in')
  })

  it('does not return pruvious server strings', async () => {
    const response = await $fetch('/api/translatable-strings/pruvious-server', { ignoreResponseError: true })
    expect(response).toBe('Resource not found')
  })

  it('returns default domain (en)', async () => {
    const response = await $fetch('/api/translatable-strings')
    expect(response).toBeTypeOf('object')
    expect(response.foo).toBe('bar')
  })

  it('returns default domain (de)', async () => {
    const response = await $fetch('/api/translatable-strings', { query: { language: 'de' } })
    expect(response).toBeTypeOf('object')
    expect(response.foo).toBe('baz')
  })

  it('returns primary language for not supported languages', async () => {
    const response = await $fetch('/api/translatable-strings', { query: { language: 'fr' } })
    expect(response).toBeTypeOf('object')
    expect(response.foo).toBe('bar')
  })

  it('returns primary language for nonexistent languages', async () => {
    const response = await $fetch('/api/translatable-strings', { query: { language: 'it' } })
    expect(response).toBeTypeOf('object')
    expect(response.foo).toBe('bar')
  })

  it('parses language query parameter with fallbacks', async () => {
    const response = await $fetch('/api/translatable-strings', { query: { language: 'it,de,en' } })
    expect(response).toBeTypeOf('object')
    expect(response.foo).toBe('baz')
  })

  it('parses language query parameter with region', async () => {
    const response = await $fetch('/api/translatable-strings', { query: { language: 'de-DE' } })
    expect(response).toBeTypeOf('object')
    expect(response.foo).toBe('baz')
  })

  it('returns 404 error for nonexistent domain', async () => {
    const response = await $fetch('/api/translatable-strings/foo', { ignoreResponseError: true })
    expect(response).toBe('Resource not found')
  })

  it('returns 404 error for private domain', async () => {
    const response = await $fetch('/api/translatable-strings/private', { ignoreResponseError: true })
    expect(response).toBe('Resource not found')
  })

  it('requires authentication for guarded domain', async () => {
    const response = await $fetch('/api/translatable-strings/guarded', { ignoreResponseError: true })
    expect(response).toBe('Access denied')
  })

  it('requires capability for guarded domain', async () => {
    const response1 = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'user-3-updated@foo.bar', password: 12345678 },
    })
    expect(response1).toBeTypeOf('string')

    const response2 = await $fetch('/api/translatable-strings/guarded', {
      headers: { Authorization: `Bearer ${response1}` },
      ignoreResponseError: true,
    })
    expect(response2).toBe('No permission')
  })

  it('skips guards for admins', async () => {
    const response = await $fetch('/api/translatable-strings/guarded', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })
    expect(response.foo).toBe('bar')
  })
})
