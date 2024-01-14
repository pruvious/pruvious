import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('checkbox field', () => {
  const create = '/api/fields/create-checkbox-fields'
  const createRequired = '/api/fields/create-required-checkbox-fields'

  it('defaults to true', async () => {
    const response = await $fetch(create, { method: 'post' })
    expect(response.record.value).toBe(true)
  })

  it('accepts true', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: true } })
    expect(response.record.value).toBe(true)
  })

  it('accepts false', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: false } })
    expect(response.record.value).toBe(false)
  })

  it('accepts 1', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 1 } })
    expect(response.record.value).toBe(true)
  })

  it('accepts 0', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 0 } })
    expect(response.record.value).toBe(false)
  })

  it("accepts 'true'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'true' } })
    expect(response.record.value).toBe(true)
  })

  it("accepts 'false'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'false' } })
    expect(response.record.value).toBe(false)
  })

  it("accepts 't'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 't' } })
    expect(response.record.value).toBe(true)
  })

  it("accepts 'f'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'f' } })
    expect(response.record.value).toBe(false)
  })

  it("accepts 'yes'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'yes' } })
    expect(response.record.value).toBe(true)
  })

  it("accepts 'no'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'no' } })
    expect(response.record.value).toBe(false)
  })

  it("accepts 'y'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'y' } })
    expect(response.record.value).toBe(true)
  })

  it("accepts 'n'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'n' } })
    expect(response.record.value).toBe(false)
  })

  it("accepts 'N'", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'N' } })
    expect(response.record.value).toBe(false)
  })

  it('does not accept null', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: null } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('does not accept other values', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'falsy' } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('passes required validation with true', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: true } })
    expect(response.record.value).toBe(true)
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch(createRequired, { method: 'post' })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('fails required validation with false', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: false } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })

  it('fails required validation with null', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: null } })
    expect(response.success).toBe(false)
    expect(response.errors.value).toBeTypeOf('string')
  })
})
