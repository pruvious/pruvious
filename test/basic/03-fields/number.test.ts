import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('number field', () => {
  const create = '/api/fields/create-number-fields'
  const createRequired = '/api/fields/create-required-number-fields'

  it('defaults to 1337', async () => {
    const response = await $fetch(create, { method: 'post' })
    expect(response.record.value).toBe(1337)
  })

  it('accepts 0', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 0 } })
    expect(response.record.value).toBe(0)
  })

  it('accepts -0', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: -0 } })
    expect(response.record.value).toBe(0)
  })

  it('accepts 9000', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 9000 } })
    expect(response.record.value).toBe(9000)
  })

  it('accepts 1.5', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 1.5 } })
    expect(response.record.value).toBe(1.5)
  })

  it("accepts '01.250'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: '01.250' } })
    expect(response.record.value).toBe(1.25)
  })

  it('does not accept null', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: null } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept other values', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: true } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept negative numbers', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: -1 } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept numbers greater than 9000', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 9000.1 } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept more than 2 decimals', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 0.123 } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('passes required validation with 0', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: 0 } })
    expect(response.record.value).toBe(0)
  })

  it('passes required validation with MIN_SAFE_INTEGER', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: Number.MIN_SAFE_INTEGER } })
    expect(response.record.value).toBe(Number.MIN_SAFE_INTEGER)
  })

  it('passes required validation with MAX_SAFE_INTEGER', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: Number.MAX_SAFE_INTEGER } })
    expect(response.record.value).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('fails required validation with too large number', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: '9999999999999999' } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('fails required validation with 1 decimal', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: 0.1 } })
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
