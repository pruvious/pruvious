import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('collection: seo', async () => {
  it('works', async () => {
    const response1 = await $fetch('/api/collections/seo?language=en', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch('/api/collections/seo?language=de', {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const expected = {
      id: expect.any(Number),
      baseTitle: 'My Pruvious Site',
      titleSeparator: ' | ',
      baseTitlePosition: 'after',
      visible: true,
      sharingImage: null,
      logo: null,
      favicon: null,
      baseUrl: '',
      socialMediaMeta: true,
      metaTags: [],
      scripts: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }

    expect(response1).toEqual({ language: 'en', ...expected })
    expect(response2).toEqual({ language: 'de', ...expected })
  })
})
