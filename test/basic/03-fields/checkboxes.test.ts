import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('checkboxes field', () => {
  const create = '/api/fields/create-checkboxes-fields'
  const createRequired = '/api/fields/create-required-checkboxes-fields'

  it("defaults to ['1']", async () => {
    const response = await $fetch(create, { method: 'post' })
    expect(response.record.value).toEqual(['1'])
  })

  it("accepts ['foo']", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ['foo'] } })
    expect(response.record.value).toEqual(['foo'])
  })

  it("accepts ['foo', 'bar', 1]", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ['foo', 'bar', '1'] } })
    expect(response.record.value).toEqual(['foo', 'bar', '1'])
  })

  it("accepts ['foo', 'foo']", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ['foo', 'foo'] } })
    expect(response.record.value).toEqual(['foo'])
  })

  it('does not accept null', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: null } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('Invalid input type')
  })

  it('does not accept other values', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: 'falsy' } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('Invalid input type')
  })

  it('validates types of array elements', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ['foo', true] } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('Selected values must be strings')
  })

  it('validates array elements', async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ['foo', 'baz', 'Bar'] } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe("Invalid value: 'baz'")
  })

  it("fails with ['Foo']", async () => {
    const response = await $fetch(create, { method: 'post', body: { value: ['Foo', true] } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe("Invalid value: 'Foo'")
  })

  it("passes required validation with ['foo']", async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: ['foo'] } })
    expect(response.record.value).toEqual(['foo'])
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch(createRequired, { method: 'post' })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('This field is required')
  })

  it('fails required validation with []', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: [] } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('This field is required')
  })

  it('fails required validation with null', async () => {
    const response = await $fetch(createRequired, { method: 'post', body: { value: null } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('This field is required')
  })
})
