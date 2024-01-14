import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('seo translation mirror', async () => {
  it('updates seo parameters in primary language', async () => {
    const response1 = await $fetch('/api/collections/seo?language=en&select=titleSeparator', {
      method: 'patch',
      body: { titleSeparator: ' - ' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ titleSeparator: ' - ' })

    const response2 = await $fetch('/api/collections/seo?language=de&select=titleSeparator', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2).toEqual({ titleSeparator: ' | ' })
  })

  it('requires from parameter', async () => {
    const response = await $fetch('/api/collections/seo/mirror?select=titleSeparator&to=de', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("Missing 'from' language parameter")
  })

  it('requires to parameter', async () => {
    const response = await $fetch('/api/collections/seo/mirror?select=titleSeparator&from=en', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("Missing 'to' language parameter")
  })

  it('requires valid from parameter', async () => {
    const response = await $fetch('/api/collections/seo/mirror?select=titleSeparator&from=foo&to=de', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The language code 'foo' is not supported")
  })

  it('requires valid to parameter', async () => {
    const response = await $fetch('/api/collections/seo/mirror?select=titleSeparator&from=en&to=bar', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe("The language code 'bar' is not supported")
  })

  it('requires distinct from and to parameters', async () => {
    const response = await $fetch('/api/collections/seo/mirror?select=titleSeparator&from=en&to=en', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toBe('Source and target language cannot be the same')
  })

  it('mirrors translation', async () => {
    const response = await $fetch('/api/collections/seo/mirror?select=titleSeparator&from=en&to=de', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ titleSeparator: ' - ' })
  })
})
