import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('chips field', () => {
  it("defaults to ['1']", async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: [1] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      normal: ['1'],
      required: ['1'],
    })
  })

  it("accepts ['foo']", async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { normal: ['foo'], required: ['foo'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      normal: ['foo'],
      required: ['foo'],
    })
  })

  it("accepts ['foo', 'bar', 1]", async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: ['foo', 'bar', '1'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      normal: ['1'],
      required: ['foo', 'bar', '1'],
    })
  })

  it("accepts ['foo', 'foo']", async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: ['foo', 'foo'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      normal: ['1'],
      required: ['foo'],
    })
  })

  it('does not accept other values', async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: 'falsy' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid input type' })
  })

  it('validates types of array elements', async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: ['foo', true] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Selected values must be strings' })
  })

  it('validates array elements', async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: ['foo', 'baz', 'Bar'] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: "Invalid value: 'baz'" })
  })

  it("fails with ['Foo']", async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: ['Foo', true] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: "Invalid value: 'Foo'" })
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('fails required validation with []', async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: [] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('fails required validation with null', async () => {
    const response = await $fetch('/api/collections/chips-fields?select=normal,required', {
      method: 'post',
      body: { required: null },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })
})
