import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('search', () => {
  it('inserts dummy data', async () => {
    const response = await $fetch('/api/collections/search', {
      method: 'post',
      body: [
        { text: ' foo', checkboxes: [1] },
        { text: 'foo', checkboxes: [2] },
        { text: 'FOOBAR', checkboxes: [1, 2] },
        { text: 'Bar', checkboxes: [1] },
        { text: 'baz foo bar' },
      ],
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toHaveLength(5)
  })

  it("searches 'foo'", async () => {
    const response = await $fetch('/api/collections/search?select=id&search=foo&order=:default,id', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.records).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }])
  })

  it("searches 'BAR'", async () => {
    const response = await $fetch('/api/collections/search?select=id&search=BAR&order=:default:desc,id', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.records).toEqual([{ id: 5 }, { id: 3 }, { id: 4 }])
  })

  it("searches 'one'", async () => {
    const response = await $fetch('/api/collections/search?select=id&search=one&order=:default,text:desc', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.records).toEqual([{ id: 1 }, { id: 4 }, { id: 3 }])
  })

  it("searches 'two two'", async () => {
    const response = await $fetch('/api/collections/search?select=id&search=two two&order=:default,id', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.records).toEqual([{ id: 2 }, { id: 3 }])
  })

  it("searches 'foo' in 'fooBar' structure", async () => {
    const response = await $fetch('/api/collections/search?select=id&search:fooBar=foo&order=:default,id', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.records).toEqual([])
  })

  it("searches 'one' in 'fooBar' structure", async () => {
    const response = await $fetch('/api/collections/search?select=id&search:fooBar=one&order=:default,id', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.records).toEqual([{ id: 1 }, { id: 3 }, { id: 4 }])
  })

  it('does not work in non-searchable collections', async () => {
    const response = await $fetch('/api/collections/junk?search=foo', {
      method: 'get',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('This collection is not searchable')
  })
})
