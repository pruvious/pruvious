import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('editor field', () => {
  let pageIdEn: number
  let pageIdDe: number
  let postIdEn: number
  let postIdDe: number

  it('creates test pages and posts', async () => {
    const response1 = await $fetch('/api/collections/pages?select=id,path', {
      method: 'post',
      body: { path: 'editor-test' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: expect.any(Number), path: '/editor-test' })
    pageIdEn = response1.id

    const response2 = await $fetch(`/api/collections/pages/${pageIdEn}/mirror?select=id&to=de`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    pageIdDe = response2.id

    const response3 = await $fetch('/api/collections/posts?select=id,path', {
      method: 'post',
      body: { path: 'editor-test' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3).toEqual({ id: expect.any(Number), path: '/editor-test' })
    postIdEn = response3.id

    const response4 = await $fetch(`/api/collections/posts/${postIdEn}/mirror?select=id&to=de`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    postIdDe = response4.id
  })

  it('sets values', async () => {
    const response = await $fetch('/api/collections/editor-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: '<p></p>',
      default: '<h1></h1>',
      required: 'foo',
    })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/editor-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('validates page links', async () => {
    const response = await $fetch('/api/collections/editor-fields', {
      method: 'post',
      body: { required: '<a href="pages:9001"></a>' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Page #9001 does not exist and cannot be linked' })
  })

  it('creates absolute link', async () => {
    const response = await $fetch('/api/collections/editor-fields?select=required&populate=true', {
      method: 'post',
      body: { required: '<a href="/foo?bar"></a>' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: '<a href="/foo?bar"></a>' })
  })

  it('creates relative link', async () => {
    const response = await $fetch('/api/collections/editor-fields?select=required&populate=true', {
      method: 'post',
      body: { required: '<a href="foo#bar"></a>' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: '<a href="foo#bar"></a>' })
  })

  it('creates page links', async () => {
    const response1 = await $fetch('/api/collections/editor-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `<a href="pages:${pageIdEn}"></a>` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toEqual({ required: '<a href="/editor-test"></a>' })

    const response2 = await $fetch('/api/collections/editor-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `<a href="pages:${pageIdDe}#foo"></a>` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response2).toEqual({ required: '<a href="/de/editor-test#foo"></a>' })
  })

  it('creates post links', async () => {
    const response1 = await $fetch('/api/collections/editor-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `<a href="posts:${postIdEn}"></a>` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toEqual({ required: '<a href="/posts/editor-test"></a>' })

    const response2 = await $fetch('/api/collections/editor-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `<a href="posts:${postIdDe}?foo"></a>` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response2).toEqual({ required: '<a href="/de/posts/editor-test?foo"></a>' })
  })
})
