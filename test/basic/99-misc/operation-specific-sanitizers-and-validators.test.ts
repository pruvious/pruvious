import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('operation specific sanitizers and validators', () => {
  const api = '/api/operation-specific-sanitizers-and-validators'
  const standardFields = { id: expect.any(Number), language: expect.any(String), translations: expect.any(String) }

  it("create: sanitizes 'foo' to 'bar'", async () => {
    const response = await $fetch(api, { method: 'post', body: { value: 'foo', test: '1' } })
    expect(response.record).toEqual({ value: 'qux', test: '1', ...standardFields })

    const responseMany = await $fetch(api, {
      method: 'post',
      body: [
        { value: 'foo', test: '2' },
        { value: 'baz', test: '3' },
      ],
    })
    expect(responseMany.records).toEqual([
      { value: 'qux', test: '2', ...standardFields },
      { value: 'baz', test: '3', ...standardFields },
    ])
  })

  it("create: does not sanitize 'baz'", async () => {
    const response = await $fetch(api, { method: 'post', body: { value: 'baz', test: '4' } })
    expect(response.record).toEqual({ value: 'baz', test: '4', ...standardFields })
  })

  it("create: fails validation for 'Foo'", async () => {
    const response = await $fetch(api, { method: 'post', body: { value: 'Foo', test: '5' } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('uppercase letters are not allowed')
  })

  it("read: fails validation for 'bar' and returns default value", async () => {
    const response = await $fetch(api, { query: { test: '1' } })
    expect(response).toEqual({ value: 'qux', test: '1', ...standardFields })
  })

  it("read: returns 'baz'", async () => {
    const response = await $fetch(api, { query: { test: '4' } })
    expect(response).toEqual({ value: 'baz', test: '4', ...standardFields })
  })

  it('read: returns falsy value', async () => {
    const response = await $fetch(api, { query: { test: '5' } })
    expect(response).toBeFalsy()
  })

  it("update: does not sanitize 'foo'", async () => {
    const response = await $fetch(api, { method: 'patch', body: { value: 'foo', test: '1' } })
    expect(response.records).toEqual([{ value: 'foo', test: '1', ...standardFields }])
  })

  it("update: sanitizes 'bar' to 'foo'", async () => {
    const response = await $fetch(api, { method: 'patch', body: { value: 'bar', test: '4' } })
    expect(response.records).toEqual([{ value: 'foo', test: '4', ...standardFields }])
  })

  it("update: passes validation for 'Foo'", async () => {
    const response = await $fetch(api, { method: 'patch', body: { value: 'Foo', test: '1' } })
    expect(response.records).toEqual([{ value: 'Foo', test: '1', ...standardFields }])
  })

  it("update: fails validation for 'baz'", async () => {
    const response = await $fetch(api, { method: 'patch', body: { value: 'baz', test: '4' } })
    expect(response.success).toEqual(false)
    expect(response.errors.value).toBe('baz is not allowed')
  })
})
