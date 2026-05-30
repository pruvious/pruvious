import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $getRaw, $getRawAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('icon field', () => {
  const icon = '/api/collections/fields?returning=icon'
  const iconCustomDir = '/api/collections/fields?returning=iconCustomDir'
  const iconWithDefault = '/api/collections/fields?returning=iconWithDefault'
  const iconMissingDir = '/api/collections/fields?returning=iconMissingDir'
  const iconTraversal = '/api/collections/fields?returning=iconTraversal'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(icon, { icon: undefined })).toEqual([{ icon: null }])
    expect(await $postAsAdmin(icon, { icon: null })).toEqual([{ icon: null }])
    expect(await $postAsAdmin(icon, { icon: 'home' })).toEqual([{ icon: 'home' }])
    expect(await $postAsAdmin(icon, { icon: 'user' })).toEqual([{ icon: 'user' }])
    expect(await $getAsAdmin(`/api/collections/fields?select=icon&where=icon[=][home]`)).toEqual(
      $paginated([{ icon: 'home' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=icon&where=icon[=][home]`, {
        icon: 'settings',
      }),
    ).toEqual([{ icon: 'settings' }])
  })

  test('defaults', async () => {
    // No `default` configured -> null
    expect(await $postAsAdmin(icon, { icon: undefined })).toEqual([{ icon: null }])
    // Explicit `default: 'home'` configured on iconWithDefault
    expect(await $postAsAdmin(iconWithDefault, { iconWithDefault: undefined })).toEqual([{ iconWithDefault: 'home' }])
  })

  test('validators', async () => {
    // Unknown icon -> rejected
    expect(await $postAsAdmin(icon, { icon: 'does-not-exist' })).toEqual($422([{ icon: expect.any(String) }]))

    // Wrong types -> rejected
    expect(await $postAsAdmin(icon, { icon: true })).toEqual($422([{ icon: expect.any(String) }]))
    expect(await $postAsAdmin(icon, { icon: 1 })).toEqual($422([{ icon: expect.any(String) }]))
    expect(await $postAsAdmin(icon, { icon: [] })).toEqual($422([{ icon: expect.any(String) }]))
    expect(await $postAsAdmin(icon, { icon: {} })).toEqual($422([{ icon: expect.any(String) }]))
  })

  test('custom dir', async () => {
    // Icon names from `app/brand-icons` are accepted
    expect(await $postAsAdmin(iconCustomDir, { iconCustomDir: 'github' })).toEqual([{ iconCustomDir: 'github' }])
    expect(await $postAsAdmin(iconCustomDir, { iconCustomDir: 'twitter' })).toEqual([{ iconCustomDir: 'twitter' }])

    // Names from the default dir are NOT accepted for the custom dir field
    expect(await $postAsAdmin(iconCustomDir, { iconCustomDir: 'home' })).toEqual(
      $422([{ iconCustomDir: expect.any(String) }]),
    )

    // null is fine (nullable)
    expect(await $postAsAdmin(iconCustomDir, { iconCustomDir: null })).toEqual([{ iconCustomDir: null }])
  })

  test('missing directory yields empty allow-list', async () => {
    // null is still accepted (nullable)
    expect(await $postAsAdmin(iconMissingDir, { iconMissingDir: null })).toEqual([{ iconMissingDir: null }])
    // Any non-null value is rejected because no icons are resolvable
    expect(await $postAsAdmin(iconMissingDir, { iconMissingDir: 'home' })).toEqual(
      $422([{ iconMissingDir: expect.any(String) }]),
    )
  })

  test('path traversal is rejected', async () => {
    // null still accepted
    expect(await $postAsAdmin(iconTraversal, { iconTraversal: null })).toEqual([{ iconTraversal: null }])
    // Any string value is rejected because dir resolution fails
    expect(await $postAsAdmin(iconTraversal, { iconTraversal: 'home' })).toEqual(
      $422([{ iconTraversal: expect.any(String) }]),
    )
  })
})

describe('icons API', () => {
  test('list endpoint returns names for default dir', async () => {
    const res = (await $getAsAdmin('/api/pruvious/icons')) as { dir: string; names: string[] }
    expect(res.dir).toBe('icons')
    expect(res.names).toEqual(expect.arrayContaining(['bell', 'home', 'mail', 'settings', 'user']))
  })

  test('list endpoint accepts a custom dir', async () => {
    const res = (await $getAsAdmin('/api/pruvious/icons?dir=brand-icons')) as { dir: string; names: string[] }
    expect(res.dir).toBe('brand-icons')
    expect(res.names).toEqual(expect.arrayContaining(['github', 'twitter']))
  })

  test('list endpoint returns empty list for missing dir', async () => {
    const res = (await $getAsAdmin('/api/pruvious/icons?dir=does-not-exist')) as { dir: string; names: string[] }
    expect(res.names).toEqual([])
  })

  test('list endpoint rejects path traversal', async () => {
    const res = (await $getAsAdmin('/api/pruvious/icons?dir=../secrets')) as any
    expect(res.statusCode).toBe(400)
  })

  test('list endpoint rejects URL-encoded path traversal', async () => {
    const res = (await $getAsAdmin('/api/pruvious/icons?dir=%2E%2E%2Fsecrets')) as any
    expect(res.statusCode).toBe(400)
  })

  test('SVG endpoint serves a sanitized icon', async () => {
    const res = await $getRawAsAdmin('/api/pruvious/icons/home')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(typeof res.data).toBe('string')
    expect(res.data).toContain('<svg')
    expect(res.data).toContain('</svg>')
  })

  test('SVG endpoint rejects unknown icons', async () => {
    const res = await $getRawAsAdmin('/api/pruvious/icons/does-not-exist')
    expect(res.status).toBe(404)
  })

  test('SVG endpoint rejects unknown dirs', async () => {
    const res = await $getRawAsAdmin('/api/pruvious/icons/home?dir=does-not-exist')
    expect(res.status).toBe(400)
  })

  test('SVG endpoint rejects invalid names', async () => {
    const res = await $getRawAsAdmin('/api/pruvious/icons/has%20space')
    expect(res.status).toBe(400)
  })

  test('SVG endpoint serves icons from a custom dir', async () => {
    const res = await $getRawAsAdmin('/api/pruvious/icons/github?dir=brand-icons')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.data).toContain('<svg')
  })

  test('SVG endpoint requires authentication', async () => {
    const res = await $getRaw('/api/pruvious/icons/home')
    expect([401, 403]).toContain(res.status)
  })
})

describe('icons SVG handler', () => {
  test('serves default-dir icons without auth', async () => {
    const res = await $getRaw('/_pruvious/icons/home.svg')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(typeof res.data).toBe('string')
    expect(res.data).toContain('<svg')
    expect(res.data).toContain('</svg>')
  })

  test('returns 404 for unknown icons in the default dir', async () => {
    const res = await $getRaw('/_pruvious/icons/does-not-exist.svg')
    expect(res.status).toBe(404)
  })

  test('default-dir route does not resolve custom-dir icons', async () => {
    const res = await $getRaw('/_pruvious/icons/github.svg')
    expect(res.status).toBe(404)
  })

  test('serves icons under a custom-dir prefix', async () => {
    const res = await $getRaw('/_pruvious/icons/brand-icons/github.svg')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(typeof res.data).toBe('string')
    expect(res.data).toContain('<svg')
  })

  test('returns 404 for unknown icons in a custom dir', async () => {
    const res = await $getRaw('/_pruvious/icons/brand-icons/does-not-exist.svg')
    expect(res.status).toBe(404)
  })
})
