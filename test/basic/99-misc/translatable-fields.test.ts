import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('translatable fields (multi-entry collection)', () => {
  it('synchronizes testValue1 when creating', async () => {
    const response1 = await $fetch(
      '/api/collections/translatable-fields-multi?select=testValue1,testValue2,translations',
      {
        method: 'post',
        body: { testValue1: 'foo', testValue2: 'baz' },
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    const response2 = await $fetch('/api/collections/translatable-fields-multi?select=testValue1,testValue2', {
      method: 'post',
      body: { language: 'de', translations: response1.translations },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ testValue1: 'foo', testValue2: 'baz', translations: expect.any(String) })
    expect(response2).toEqual({ testValue1: 'foo', testValue2: 'default' })
  })

  it('synchronizes testValue1 when creating many', async () => {
    const response1 = await $fetch(
      '/api/collections/translatable-fields-multi?select=testValue1,testValue2,translations',
      {
        method: 'post',
        body: [
          { testValue1: 'foo', testValue2: 'baz' },
          { testValue1: 'foo', testValue2: 'baz' },
        ],
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    const response2 = await $fetch('/api/collections/translatable-fields-multi?select=testValue1,testValue2', {
      method: 'post',
      body: [
        { language: 'de', translations: response1[0].translations },
        { language: 'de', translations: response1[1].translations },
      ],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual([
      { testValue1: 'foo', testValue2: 'baz', translations: expect.any(String) },
      { testValue1: 'foo', testValue2: 'baz', translations: expect.any(String) },
    ])

    expect(response2).toEqual([
      { testValue1: 'foo', testValue2: 'default' },
      { testValue1: 'foo', testValue2: 'default' },
    ])
  })

  it('synchronizes testValue1 when updating', async () => {
    const response1 = await $fetch('/api/collections/translatable-fields-multi/2?select=testValue1,testValue2', {
      method: 'patch',
      body: { testValue1: 'bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch('/api/collections/translatable-fields-multi/1?select=testValue1,testValue2', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ testValue1: 'bar', testValue2: 'default' })
    expect(response2).toEqual({ testValue1: 'bar', testValue2: 'baz' })
  })

  it('synchronizes testValue1 when updating many', async () => {
    const response1 = await $fetch(
      '/api/collections/translatable-fields-multi?select=testValue1,testValue2&where=language[=][en]',
      {
        method: 'patch',
        body: { testValue1: 'bar', testValue2: 'baz' },
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    const response2 = await $fetch(
      '/api/collections/translatable-fields-multi?select=testValue1,testValue2&where=language[=][de]',
      {
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response1).toEqual([
      { testValue1: 'bar', testValue2: 'baz' },
      { testValue1: 'bar', testValue2: 'baz' },
      { testValue1: 'bar', testValue2: 'baz' },
    ])

    expect(response2.records).toEqual([
      { testValue1: 'bar', testValue2: 'default' },
      { testValue1: 'bar', testValue2: 'default' },
      { testValue1: 'bar', testValue2: 'default' },
    ])
  })
})

describe('translatable fields (single-entry collection)', () => {
  it('synchronizes testValue1 when updating', async () => {
    const response1 = await $fetch('/api/collections/translatable-fields-single?select=testValue1,testValue2', {
      method: 'patch',
      body: { testValue1: 'bar', testValue2: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch(
      '/api/collections/translatable-fields-single?language=de&select=testValue1,testValue2',
      { headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response1).toEqual({ testValue1: 'bar', testValue2: 'baz' })
    expect(response2).toEqual({ testValue1: 'bar', testValue2: 'default' })
  })
})
