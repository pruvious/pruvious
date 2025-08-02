import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('trueFalse field', () => {
  const trueFalse = '/api/collections/fields?returning=trueFalse'
  const trueFalseRequireTrue = '/api/collections/fields?returning=trueFalseRequireTrue'
  const trueFalseRequireAny = '/api/collections/fields?returning=trueFalseRequireAny'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(trueFalse, { trueFalse: undefined })).toEqual([{ trueFalse: false }])
    expect(
      await $postAsAdmin(trueFalse, { trueFalse: 'T', trueFalseRequireTrue: true, trueFalseRequireAny: true }),
    ).toEqual([{ trueFalse: true }])
    expect(await $getAsAdmin(`/api/collections/fields?select=trueFalse&where=trueFalse[=][true]`)).toEqual(
      $paginated([{ trueFalse: true }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=trueFalse&where=trueFalse[=][T]`, { trueFalse: false }),
    ).toEqual([{ trueFalse: false }])
  })

  test('sanitizers', async () => {
    expect(
      await $postAsAdmin(trueFalse, { trueFalse: 1, trueFalseRequireTrue: true, trueFalseRequireAny: true }),
    ).toEqual([{ trueFalse: true }])
    expect(
      await $postAsAdmin(trueFalse, { trueFalse: '1', trueFalseRequireTrue: true, trueFalseRequireAny: true }),
    ).toEqual([{ trueFalse: true }])
    expect(
      await $postAsAdmin(trueFalse, { trueFalse: 't', trueFalseRequireTrue: true, trueFalseRequireAny: true }),
    ).toEqual([{ trueFalse: true }])
    expect(await $postAsAdmin(trueFalse, { trueFalse: 'F' })).toEqual([{ trueFalse: false }])
    expect(await $postAsAdmin(trueFalse, { trueFalse: 'FaLsE' })).toEqual([{ trueFalse: false }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(trueFalse, { trueFalse: null })).toEqual($422([{ trueFalse: expect.any(String) }]))
    expect(await $postAsAdmin(trueFalse, { trueFalse: 'true2' })).toEqual($422([{ trueFalse: expect.any(String) }]))
    expect(await $postAsAdmin(trueFalse, { trueFalse: 2 })).toEqual($422([{ trueFalse: expect.any(String) }]))
    expect(await $postAsAdmin(trueFalse, { trueFalse: -1 })).toEqual($422([{ trueFalse: expect.any(String) }]))
    expect(await $postAsAdmin(trueFalse, { trueFalse: [] })).toEqual($422([{ trueFalse: expect.any(String) }]))
    expect(await $postAsAdmin(trueFalse, { trueFalse: {} })).toEqual($422([{ trueFalse: expect.any(String) }]))

    // requireTrue
    expect(await $postAsAdmin(trueFalseRequireTrue, { trueFalseRequireTrue: true })).toEqual([
      { trueFalseRequireTrue: true },
    ])
    expect(await $postAsAdmin(trueFalseRequireTrue, { trueFalseRequireTrue: false })).toEqual([
      { trueFalseRequireTrue: false },
    ])
    expect(
      await $postAsAdmin(trueFalseRequireTrue, {
        trueFalse: true,
        trueFalseRequireTrue: true,
        trueFalseRequireAny: true,
      }),
    ).toEqual([{ trueFalseRequireTrue: true }])
    expect(await $postAsAdmin(trueFalseRequireTrue, { trueFalse: true, trueFalseRequireAny: true })).toEqual(
      $422([{ trueFalseRequireTrue: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(trueFalseRequireTrue, {
        trueFalse: true,
        trueFalseRequireTrue: false,
        trueFalseRequireAny: true,
      }),
    ).toEqual($422([{ trueFalseRequireTrue: expect.any(String) }]))

    // requireAny
    expect(await $postAsAdmin(trueFalseRequireAny, { trueFalseRequireAny: true })).toEqual([
      { trueFalseRequireAny: true },
    ])
    expect(await $postAsAdmin(trueFalseRequireAny, { trueFalseRequireAny: false })).toEqual([
      { trueFalseRequireAny: false },
    ])
    expect(
      await $postAsAdmin(trueFalseRequireAny, { trueFalse: true, trueFalseRequireTrue: true, trueFalseRequireAny: 0 }),
    ).toEqual([{ trueFalseRequireAny: false }])
    expect(await $postAsAdmin(trueFalseRequireAny, { trueFalse: true, trueFalseRequireTrue: true })).toEqual(
      $422([{ trueFalseRequireAny: expect.any(String) }]),
    )
  })
})
