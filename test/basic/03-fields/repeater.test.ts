import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('repeater field', () => {
  it('sets default values', async () => {
    const response = await $fetch('/api/collections/repeater-fields?select=empty,normal,nested', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      empty: [],
      normal: [{ foo: 'foo', bar: true }],
      nested: [],
    })
  })

  it('sets custom values', async () => {
    const response = await $fetch('/api/collections/repeater-fields?select=empty,normal,nested', {
      method: 'post',
      body: {
        empty: [{}],
        normal: [{ foo: 'foo', bar: false }],
        nested: [{ user: 1, sub: [{ user: 1 }] }],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      empty: [{}],
      normal: [{ foo: '', bar: false }],
      nested: [{ user: 1, sub: [{ user: 1 }] }],
    })
  })

  it('validates repeater type', async () => {
    const response = await $fetch('/api/collections/repeater-fields', {
      method: 'post',
      body: { empty: {} },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ empty: 'Invalid input type' })
  })

  it('validates enntry type', async () => {
    const response = await $fetch('/api/collections/repeater-fields', {
      method: 'post',
      body: { empty: ['foo'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'empty.0': 'Invalid input type' })
  })

  it('validates required repeaters', async () => {
    const response = await $fetch('/api/collections/repeater-fields', {
      method: 'post',
      body: { nested: [{ user: 1, sub: [] }] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'nested.0.sub': 'This field is required' })
  })

  it('does not accept unknown subfields', async () => {
    const response = await $fetch('/api/collections/repeater-fields', {
      method: 'post',
      body: { empty: [{ foo: 'bar' }] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'empty.0.foo': 'Unrecognized field name' })
  })

  it('validates min length', async () => {
    const response = await $fetch('/api/collections/repeater-fields', {
      method: 'post',
      body: { normal: [] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ normal: 'The repeater must have at least 1 entry' })
  })

  it('validates max length', async () => {
    const response = await $fetch('/api/collections/repeater-fields', {
      method: 'post',
      body: {
        normal: [
          { foo: 'bar', bar: true },
          { foo: 'bar', bar: true },
          { foo: 'bar', bar: true },
        ],
        nested: [{ user: 1, sub: [{ user: 1 }, { user: 1 }, { user: 1 }] }],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      'normal': 'The repeater must not exceed 2 entries',
      'nested.0.sub': 'The repeater must not exceed 2 entries',
    })
  })

  it('populates values', async () => {
    const response = await $fetch('/api/collections/repeater-fields/2?select=empty,normal,nested&populate=1', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      empty: [{}],
      normal: [{ foo: '', bar: false }],
      nested: [
        {
          user: {
            role: {
              id: expect.any(Number),
              name: expect.any(String),
              capabilities: expect.any(Array),
            },
            capabilities: expect.any(Array),
          },
          sub: [
            {
              user: {
                role: expect.any(Number),
              },
            },
          ],
        },
      ],
    })
  })

  it('falls back to default values', async () => {
    await $fetch('/api/fields/create-invalid-repeater-fields', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response1 = await $fetch(
      '/api/collections/repeater-fields?order=id:desc&limit=1&select=empty,normal,nested',
      {
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response1.records).toEqual([
      {
        empty: [],
        normal: [{ foo: '', bar: false }],
        nested: [
          { user: null, sub: [{ user: null }, { user: null }] },
          { user: null, sub: [] },
        ],
      },
    ])

    const response2 = await $fetch(
      '/api/collections/repeater-fields?order=id:desc&limit=1&select=empty,normal,nested&populate=1',
      {
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response2.records).toEqual([
      {
        empty: [],
        normal: [{ foo: '', bar: false }],
        nested: [
          { user: null, sub: [{ user: null }, { user: null }] },
          { user: null, sub: [] },
        ],
      },
    ])
  })
})
