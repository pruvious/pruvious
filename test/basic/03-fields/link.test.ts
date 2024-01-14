import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('link field', () => {
  let pageIdEn: number
  let pageIdDe: number
  let postIdEn: number
  let postIdDe: number

  it('creates test pages and posts', async () => {
    const response1 = await $fetch('/api/collections/pages?select=id,path', {
      method: 'post',
      body: { path: 'link-test' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: expect.any(Number), path: '/link-test' })
    pageIdEn = response1.id

    const response2 = await $fetch(`/api/collections/pages/${pageIdEn}/mirror?select=id&to=de`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    pageIdDe = response2.id

    const response3 = await $fetch('/api/collections/posts?select=id,path', {
      method: 'post',
      body: { path: 'link-test' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3).toEqual({ id: expect.any(Number), path: '/link-test' })
    postIdEn = response3.id

    const response4 = await $fetch(`/api/collections/posts/${postIdEn}/mirror?select=id&to=de`, {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    postIdDe = response4.id
  })

  it('sets values', async () => {
    const response = await $fetch('/api/collections/link-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      regular: '',
      default: '#foo',
      required: 'foo',
    })
  })

  it('validates urls', async () => {
    const response = await $fetch('/api/collections/link-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'http://invalid link' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid URL' })
  })

  it('validates url paths', async () => {
    const response = await $fetch('/api/collections/link-fields?select=regular,default,required', {
      method: 'post',
      body: { required: 'invalid link' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Invalid URL path' })
  })

  it('validates required fields', async () => {
    const response = await $fetch('/api/collections/link-fields', {
      method: 'post',
      body: {},
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'This field is required' })
  })

  it('validates page links', async () => {
    const response = await $fetch('/api/collections/link-fields', {
      method: 'post',
      body: { required: 'pages:9001' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'Page #9001 does not exist and cannot be linked' })
  })

  it('creates absolute link', async () => {
    const response = await $fetch('/api/collections/link-fields?select=required&populate=true', {
      method: 'post',
      body: { required: '/foo?bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: '/foo?bar' })
  })

  it('creates relative link', async () => {
    const response = await $fetch('/api/collections/link-fields?select=required&populate=true', {
      method: 'post',
      body: { required: 'foo#bar' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ required: 'foo#bar' })
  })

  it('creates page links', async () => {
    const response1 = await $fetch('/api/collections/link-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `pages:${pageIdEn}` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toEqual({ required: '/link-test' })

    const response2 = await $fetch('/api/collections/link-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `pages:${pageIdDe}#foo` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response2).toEqual({ required: '/de/link-test#foo' })
  })

  it('creates post links', async () => {
    const response1 = await $fetch('/api/collections/link-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `posts:${postIdEn}` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toEqual({ required: '/posts/link-test' })

    const response2 = await $fetch('/api/collections/link-fields?select=required&populate=true', {
      method: 'post',
      body: { required: `posts:${postIdDe}?foo` },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response2).toEqual({ required: '/de/posts/link-test?foo' })
  })
})
