import { describe, expect, test } from 'vitest'
import { $404, $422, $deleteAsAdmin, $getAsAdmin, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('linkedBlocks field', () => {
  const linkedBlocks = '/api/collections/relation-fields?returning=linkedBlocks'
  const linkedBlocksCascade = '/api/collections/relation-fields?returning=linkedBlocksCascade'

  async function createPattern(
    blocks: Record<string, any>[] = [{ $key: 'Button', label: 'Hello' }],
    overrides: Record<string, any> = {},
  ) {
    const result = (await $postAsAdmin('/api/collections/patterns?returning=id', {
      language: 'en',
      subpath: null,
      title: `Pattern ${Math.random().toString(36).slice(2, 8)}`,
      blocks,
      ...overrides,
    })) as [{ id: number }]
    return result[0].id
  }

  test('stores the casted record id', async () => {
    const patternId = await createPattern()
    expect(await $postAsAdmin(linkedBlocks, { linkedBlocks: undefined })).toEqual([{ linkedBlocks: null }])
    expect(await $postAsAdmin(linkedBlocks, { linkedBlocks: patternId })).toEqual([{ linkedBlocks: patternId }])
  })

  test('returns the casted id by default (no populate)', async () => {
    const patternId = await createPattern()
    const created = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: patternId })) as [
      { linkedBlocks: number; id: number },
    ]
    expect(await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}?select=linkedBlocks`)).toEqual({
      linkedBlocks: patternId,
    })
  })

  test('coerces string ids to numbers (bigint sanitizer)', async () => {
    const patternId = await createPattern()
    expect(await $postAsAdmin(linkedBlocks, { linkedBlocks: String(patternId) })).toEqual([{ linkedBlocks: patternId }])
  })

  test('validates: wrong type / non-existent record', async () => {
    expect(await $postAsAdmin(linkedBlocks, { linkedBlocks: true })).toEqual(
      $422([{ linkedBlocks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(linkedBlocks, { linkedBlocks: {} })).toEqual($422([{ linkedBlocks: expect.any(String) }]))
    expect(await $postAsAdmin(linkedBlocks, { linkedBlocks: 9_999_999 })).toEqual(
      $422([{ linkedBlocks: expect.any(String) }]),
    )
  })

  test('populates the linked pattern’s blocks (not the record)', async () => {
    const blocks = [
      { $key: 'Button', label: 'Outer' },
      { $key: 'Nesting', slot: [{ $key: 'Button', label: 'Inner' }] },
    ]
    const patternId = await createPattern(blocks)
    const created = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: patternId })) as [
      { linkedBlocks: number; id: number },
    ]
    const record = await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}?select=linkedBlocks&populate=1`)
    expect(record).toEqual({
      linkedBlocks: [
        { $key: 'Button', label: 'Outer' },
        { $key: 'Nesting', slot: [{ $key: 'Button', label: 'Inner' }], page: null },
      ],
    })
  })

  test('populates as an empty array when the linked pattern has no blocks', async () => {
    const patternId = await createPattern([])
    const created = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: patternId })) as [
      { linkedBlocks: number; id: number },
    ]
    expect(
      await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}?select=linkedBlocks&populate=1`),
    ).toEqual({ linkedBlocks: [] })
  })

  test('populates the language-specific blocks (translatable target)', async () => {
    const deId = await createPattern([{ $key: 'Button', label: 'DE block' }], { language: 'de' })
    const created = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: deId })) as [
      { linkedBlocks: number; id: number },
    ]
    expect(
      await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}?select=linkedBlocks&populate=1`),
    ).toEqual({ linkedBlocks: [{ $key: 'Button', label: 'DE block' }] })
  })

  test('populates as null when the referenced pattern does not exist (set null)', async () => {
    const patternId = await createPattern()
    const created = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: patternId })) as [
      { linkedBlocks: number; id: number },
    ]
    expect(await $deleteAsAdmin(`/api/collections/patterns/${patternId}`)).toBe(1)
    expect(await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}?select=linkedBlocks`)).toEqual({
      linkedBlocks: null,
    })
    expect(
      await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}?select=linkedBlocks&populate=1`),
    ).toEqual({ linkedBlocks: null })
  })

  test('cascade deletes the referencing row when the pattern is deleted', async () => {
    const patternId = await createPattern()
    const created = (await $postAsAdmin(`${linkedBlocksCascade},id`, {
      linkedBlocksCascade: patternId,
    })) as [{ linkedBlocksCascade: number; id: number }]
    expect(await $deleteAsAdmin(`/api/collections/patterns/${patternId}`)).toBe(1)
    expect(await $getAsAdmin(`/api/collections/relation-fields/${created[0].id}`)).toEqual($404('Resource not found'))
  })

  test('filter operators: =, !=, in, isNull', async () => {
    const a = await createPattern()
    const b = await createPattern()
    const recA = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: a })) as [{ id: number }]
    const recB = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: b })) as [{ id: number }]
    const recNull = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: null })) as [{ id: number }]

    const eq = await $getAsAdmin(
      `/api/collections/relation-fields?select=id,linkedBlocks&where=linkedBlocks[=][${a}]&perPage=100`,
    )
    expect((eq as any).records).toEqual(expect.arrayContaining([{ id: recA[0].id, linkedBlocks: a }]))
    expect((eq as any).records.find((r: any) => r.id === recB[0].id)).toBeUndefined()

    const ne = await $getAsAdmin(
      `/api/collections/relation-fields?select=id,linkedBlocks&where=linkedBlocks[!=][${a}]&perPage=100`,
    )
    expect((ne as any).records).toEqual(expect.arrayContaining([{ id: recB[0].id, linkedBlocks: b }]))

    const inOp = await $getAsAdmin(
      `/api/collections/relation-fields?select=id,linkedBlocks&where=linkedBlocks[in][${a},${b}]&perPage=100`,
    )
    expect((inOp as any).records).toEqual(
      expect.arrayContaining([
        { id: recA[0].id, linkedBlocks: a },
        { id: recB[0].id, linkedBlocks: b },
      ]),
    )

    const nullOp = await $getAsAdmin(
      `/api/collections/relation-fields?select=id,linkedBlocks&where=linkedBlocks[isNull][]&perPage=100`,
    )
    expect((nullOp as any).records).toEqual(expect.arrayContaining([{ id: recNull[0].id, linkedBlocks: null }]))
  })

  test('populates a Pattern block nested inside a blocksField (the production path)', async () => {
    const patternBlocks = [{ $key: 'Button', label: 'Inner button' }]
    const patternId = await createPattern(patternBlocks)
    const fields = (await $postAsAdmin('/api/collections/fields?returning=id', {
      blocks: [{ $key: 'Pattern', pattern: patternId }],
    })) as [{ id: number }]
    const record = await $getAsAdmin(`/api/collections/fields/${fields[0].id}?select=blocks&populate=1`)
    expect(record).toEqual({
      blocks: [{ $key: 'Pattern', pattern: patternBlocks }],
    })
  })

  test('update changes the linked pattern', async () => {
    const a = await createPattern([{ $key: 'Button', label: 'A' }])
    const b = await createPattern([{ $key: 'Button', label: 'B' }])
    const created = (await $postAsAdmin(`${linkedBlocks},id`, { linkedBlocks: a })) as [
      { linkedBlocks: number; id: number },
    ]
    expect(
      await $patchAsAdmin(`/api/collections/relation-fields/${created[0].id}?returning=linkedBlocks`, {
        linkedBlocks: b,
      }),
    ).toEqual([{ linkedBlocks: b }])
  })
})
