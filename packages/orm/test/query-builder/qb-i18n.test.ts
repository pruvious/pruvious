import { I18n } from '@pruvious/i18n'
import { expect, test } from 'vitest'
import { Database } from '../../src'
import { collections } from '../test-collections'
import { initAllDrivers, qbe } from '../utils'

test('query builder i18n', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_i18n')) {
    const db = new Database({
      driver,
      PGPool,
      collections,
      i18n: new I18n()
        .defineTranslatableStrings({
          domain: 'pruvious-orm',
          language: 'en',
          strings: { 'At least one field must be selected': 'Select at least one field' },
        })
        .defineTranslatableStrings({
          domain: 'pruvious-orm',
          language: 'de',
          strings: { 'At least one field must be selected': 'Wählen Sie mindestens ein Feld aus' },
        }),
    })
    await db.connect()

    expect(
      await db
        .queryBuilder()
        .selectFrom('Houses')
        .select([] as any)
        .all(),
    ).toEqual(qbe('Select at least one field'))

    expect(
      await db
        .queryBuilder({ contextLanguage: 'de' })
        .selectFrom('Houses')
        .select([] as any)
        .all(),
    ).toEqual(qbe('Wählen Sie mindestens ein Feld aus'))

    await db.close()
    await close?.()
  }
})
