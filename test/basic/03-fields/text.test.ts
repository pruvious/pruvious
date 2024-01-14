import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('text field', () => {
  const create = '/api/fields/create-text-fields'
  const createRequired = '/api/fields/create-required-text-fields'

  it("defaults to 'foo'", async () => {
    const response = await $fetch(create, { method: 'post' })
    expect(response.record.value).toBe('foo')
  })

  it("accepts 'bar'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'bar' } })
    expect(response.record.value).toBe('bar')
  })

  it("accepts ''", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: '' } })
    expect(response.record.value).toBe('')
  })

  it("accepts ' '", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ' ' } })
    expect(response.record.value).toBe('')
  })

  it("accepts '  foo  '", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: '  foo  ' } })
    expect(response.record.value).toBe('foo')
  })

  it('accepts 1337', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 1337 } })
    expect(response.record.value).toBe('1337')
  })

  it('does not accept null', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: null } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept imaginary numbers', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: Infinity } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept other values', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: true } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it("passes required validation with 'foo'", async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: 'foo' } })
    expect(response.record.value).toBe('foo')
  })

  it("passes required validation with ' '", async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: ' ' } })
    expect(response.record.value).toBe(' ')
  })

  it("fails required validation with ''", async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: '' } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch(createRequired, { method: 'post' })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('fails required validation with null', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: null } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })
})
