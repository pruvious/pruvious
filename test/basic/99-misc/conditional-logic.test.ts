import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('conditional logic in multi-entry collections', () => {
  it('sets foo to default value when creating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'post',
      body: { foo: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: '' })
  })

  it('sets foo to default value when creating many', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'post',
      body: [{ foo: 'foo' }, { foo: 'foo' }],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([
      { foo: '', bar: '' },
      { foo: '', bar: '' },
    ])
  })

  it('sets bar when creating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'post',
      body: { bar: 'bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: 'bar' })
  })

  it('sets foo value when creating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'post',
      body: { foo: 'foo', bar: 'bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: 'foo', bar: 'bar' })
  })

  it('foo can have invalid type when creating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'post',
      body: { foo: ['bar'], bar: 'qux' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: 'qux' })
  })

  it('requires bar when updating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi/1?select=foo,bar', {
      method: 'patch',
      body: { foo: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ foo: "The field 'bar' is required in the input" })
  })

  it('requires bar when updating many', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'patch',
      body: { foo: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ foo: "The field 'bar' is required in the input" })
  })

  it('does not require foo when updating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi/1?select=foo,bar', {
      method: 'patch',
      body: { bar: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: 'baz' })
  })

  it('updates foo value', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi/1?select=foo,bar', {
      method: 'patch',
      body: { foo: 'foo', bar: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: 'foo', bar: 'baz' })
  })

  it('updates all foo values', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi?select=foo,bar', {
      method: 'patch',
      body: { foo: 'foo-updated', bar: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([
      { foo: 'foo-updated', bar: 'baz' },
      { foo: 'foo-updated', bar: 'baz' },
      { foo: 'foo-updated', bar: 'baz' },
      { foo: 'foo-updated', bar: 'baz' },
      { foo: 'foo-updated', bar: 'baz' },
      { foo: 'foo-updated', bar: 'baz' },
    ])
  })

  it('foo can have invalid type when updating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-multi/1?select=foo,bar', {
      method: 'patch',
      body: { foo: ['bar'], bar: 'qux' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: 'qux' })
  })
})

describe('conditional logic in single-entry collections', () => {
  it('requires bar when updating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-single?select=foo,bar', {
      method: 'patch',
      body: { foo: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ foo: "The field 'bar' is required in the input" })
  })

  it('does not require foo when updating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-single?select=foo,bar', {
      method: 'patch',
      body: { bar: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: 'baz' })
  })

  it('updates foo value', async () => {
    const response = await $fetch('/api/collections/conditional-logic-single?select=foo,bar', {
      method: 'patch',
      body: { foo: 'foo', bar: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: 'foo', bar: 'baz' })
  })

  it('foo can have invalid type when updating', async () => {
    const response = await $fetch('/api/collections/conditional-logic-single?select=foo,bar', {
      method: 'patch',
      body: { foo: ['bar'], bar: 'qux' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ foo: '', bar: 'qux' })
  })
})
