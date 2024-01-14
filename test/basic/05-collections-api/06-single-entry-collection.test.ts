import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('search', () => {
  it('reads settings', async () => {
    const response = await $fetch('/api/collections/settings', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      normal: '',
      required: 'required',
      immutable: '',
      populated: '',
    })
  })

  it('reads settings with select', async () => {
    const response = await $fetch('/api/collections/settings?select=normal,populated', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      normal: '',
      populated: '',
    })
  })

  it('reads settings in another language', async () => {
    const response = await $fetch('/api/collections/settings?language=de', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'de',
      normal: '',
      required: 'required',
      immutable: '',
      populated: '',
    })
  })

  it('validates language', async () => {
    const response = await $fetch('/api/collections/settings?language=foo', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBeTypeOf('string')
  })

  it('reads populated settings', async () => {
    const response = await $fetch('/api/collections/settings?populate=true', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      normal: '',
      required: 'required',
      immutable: '',
      populated: '!',
    })
  })

  it('cannot read settings without authentication', async () => {
    const response = await $fetch('/api/collections/settings', {
      ignoreResponseError: true,
    })

    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('updates settings', async () => {
    const response = await $fetch('/api/collections/settings?populate=true', {
      method: 'patch',
      body: { normal: 'normal', required: 'required-updated', populated: 'populated' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: 'en',
      normal: 'normal',
      required: 'required-updated',
      immutable: '',
      populated: 'populated!',
    })
  })

  it('updates settings in another language with select', async () => {
    const response = await $fetch('/api/collections/settings?language=de&select=normal,required,immutable', {
      method: 'patch',
      body: { required: 'erforderlich', immutable: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      normal: '',
      required: 'erforderlich',
      immutable: '',
    })
  })

  it('validates inputs', async () => {
    const response = await $fetch('/api/collections/settings', {
      method: 'patch',
      body: { normal: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ normal: expect.any(String) })
  })

  it('does not update settings without authentication', async () => {
    const response = await $fetch('/api/collections/settings', {
      method: 'patch',
      body: { normal: '' },
      ignoreResponseError: true,
    })

    expect(response).toBe('Unauthorized due to either invalid credentials or missing authentication')
  })

  it('guards single-entry collections', async () => {
    await $fetch('/api/collections/users', {
      method: 'post',
      body: { email: 'user-single-colletion@foo.bar', password: 12345678, isActive: true },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const token = await $fetch('/api/login', {
      method: 'post',
      body: { email: 'user-single-colletion@foo.bar', password: 12345678 },
    })

    const response1 = await $fetch('/api/collections/settings?select=required&language=en', {
      headers: { Authorization: `Bearer ${token}` },
      ignoreResponseError: true,
    })

    expect(response1).toBe("You don't have the necessary permissions to read Theme Options")

    await $fetch('/api/collections/users', {
      method: 'patch',
      body: { capabilities: ['collection-settings-read'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch('/api/collections/settings?select=required&language=en', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response2).toEqual({ required: 'required-updated' })
  })
})
