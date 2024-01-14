import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('file field', () => {
  let uploadId = 0

  it('creates temp upload', async () => {
    const body = new FormData()
    body.append('$file', new File(['test'], 'test.txt', { type: 'text/plain' }))
    const response = await $fetch('/api/collections/uploads?select=id', {
      method: 'post',
      body,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: expect.any(Number) })
    uploadId = response.id
  })

  it('creates record', async () => {
    const response = await $fetch('/api/fields/create-file-fields', {
      method: 'post',
      body: { required: uploadId, jpg: null },
    })

    expect(response.record).toEqual({
      id: expect.any(Number),
      language: expect.any(String),
      translations: expect.any(String),
      regular: null,
      required: uploadId,
      jpg: null,
      b1: null,
    })
  })

  it('does not accept negative id', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post', body: { required: -1 } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept nonexistent id', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post', body: { required: 9001 } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'The upload does not exist' })
  })

  it('does not accept other values', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post', body: { required: true } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'Invalid input type' })
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post' })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'This field is required' })
  })

  it('fails required validation with null', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post', body: { required: null } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'This field is required' })
  })

  it('fails maxSize validation', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post', body: { b1: uploadId } })
    expect(response.success).toBe(false)
    expect(response.errors.b1).toBe('The maximum allowable file size is 1 B')
  })

  it('fails allowedTypes validation', async () => {
    const response = await $fetch('/api/fields/create-file-fields', { method: 'post', body: { jpg: uploadId } })
    expect(response.success).toBe(false)
    expect(response.errors.jpg).toBe('The file type must be one of the following: image/jpeg')
  })

  it('deletes temp upload', async () => {
    const response = await $fetch(`/api/collections/uploads/${uploadId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.id).toBe(uploadId)
  })
})
