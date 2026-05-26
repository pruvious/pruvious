import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('Patterns collection', () => {
  const patterns = '/api/collections/patterns'
  const baseInput = (overrides: Record<string, any> = {}) => ({
    language: 'en',
    subpath: null,
    title: 'Test pattern',
    ...overrides,
  })

  test('requires title (description and blocks are optional)', async () => {
    expect(await $postAsAdmin(patterns, baseInput({ title: undefined }))).toEqual(
      $422([expect.objectContaining({ title: expect.any(String) })]),
    )
    const ok = (await $postAsAdmin(`${patterns}?returning=id,title,description,blocks`, baseInput())) as [
      Record<string, any>,
    ]
    expect(ok).toEqual([{ id: expect.any(Number), title: 'Test pattern', description: '', blocks: [] }])
    expect(await $deleteAsAdmin(`${patterns}/${ok[0].id}`)).toBe(1)
  })

  test('stores title, description and blocks; round-trips them', async () => {
    const created = (await $postAsAdmin(
      `${patterns}?returning=id,title,description,blocks`,
      baseInput({
        title: 'Hero CTA',
        description: 'Top of homepage',
        blocks: [{ $key: 'Button', label: 'Click me' }],
      }),
    )) as [Record<string, any>]
    expect(created).toEqual([
      {
        id: expect.any(Number),
        title: 'Hero CTA',
        description: 'Top of homepage',
        blocks: [{ $key: 'Button', label: 'Click me' }],
      },
    ])
    expect(await $deleteAsAdmin(`${patterns}/${created[0].id}`)).toBe(1)
  })

  test('hook forces isPublic to false on insert, even if the client tries to publish', async () => {
    const created = (await $postAsAdmin(
      `${patterns}?returning=id,isPublic`,
      baseInput({ title: 'Forced draft', subpath: 'forced-draft', isPublic: true }),
    )) as [{ id: number; isPublic: boolean }]
    expect(created).toEqual([{ id: expect.any(Number), isPublic: false }])
    expect(await $deleteAsAdmin(`${patterns}/${created[0].id}`)).toBe(1)
  })

  test('hook forces isPublic to false for bulk inserts', async () => {
    const created = (await $postAsAdmin(`${patterns}?returning=id,isPublic`, [
      baseInput({ title: 'Bulk EN', subpath: 'bulk-en', isPublic: true }),
      baseInput({ language: 'de', title: 'Bulk DE', subpath: 'bulk-de', isPublic: true }),
    ])) as [{ id: number; isPublic: boolean }, { id: number; isPublic: boolean }]
    expect(created).toEqual([
      { id: expect.any(Number), isPublic: false },
      { id: expect.any(Number), isPublic: false },
    ])
    expect(await $deleteAsAdmin(`${patterns}/${created[0].id}`)).toBe(1)
    expect(await $deleteAsAdmin(`${patterns}/${created[1].id}`)).toBe(1)
  })

  test('hook forces isPublic to false on update', async () => {
    const created = (await $postAsAdmin(`${patterns}?returning=id`, baseInput({ title: 'Update target' }))) as [
      { id: number },
    ]
    const updated = await $patchAsAdmin(`${patterns}/${created[0].id}?returning=isPublic`, {
      subpath: 'should-stay-draft',
      isPublic: true,
    })
    expect(updated).toEqual([{ isPublic: false }])
    expect(await $deleteAsAdmin(`${patterns}/${created[0].id}`)).toBe(1)
  })

  test('denies the Pattern block at the root and nested - no recursion', async () => {
    expect(
      await $postAsAdmin(
        `${patterns}?returning=blocks`,
        baseInput({ title: 'Recursive root denied', blocks: [{ $key: 'Pattern', pattern: 1 }] }),
      ),
    ).toEqual($422([expect.objectContaining({ 'blocks.0': expect.any(String) })]))

    expect(
      await $postAsAdmin(
        `${patterns}?returning=blocks`,
        baseInput({
          title: 'Recursive nested denied',
          blocks: [{ $key: 'Container', blocks: [{ $key: 'Pattern', pattern: 1 }] }],
        }),
      ),
    ).toEqual($422([expect.objectContaining({ 'blocks.0.blocks.0': expect.any(String) })]))
  })
})
