import { expect, test } from 'vitest'
import { Database } from '../../src'
import { collections } from '../test-collections'
import { initAllDrivers, qbo } from '../utils'

test('query builder search methods', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_search_methods')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

    expect(
      await qb
        .insertInto('Students')
        .values([
          { firstName: 'Harry', lastName: 'Potter' },
          { firstName: 'Hermione', lastName: 'Granger' },
          { firstName: 'Ron', lastName: 'Weasley' },
          { firstName: 'Draco', lastName: 'Malfoy' },
          { firstName: 'Neville', lastName: 'Longbottom' },
          { firstName: 'Luna', lastName: 'Lovegood' },
          { firstName: 'Ginny', lastName: 'Weasley' },
          { firstName: 'Pansy', lastName: 'Parker' },
          { firstName: 'Fake', lastName: 'NotPotter' },
        ])
        .run(),
    ).toEqual(qbo(9))

    expect(await qb.selectFrom('Students').select('firstName').search('Harry', 'firstName').all()).toEqual(
      qbo([{ firstName: 'Harry' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').search('harr', 'firstName').all()).toEqual(
      qbo([{ firstName: 'Harry' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').search('foo', 'firstName').all()).toEqual(qbo([]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .search('weasley', ['firstName', 'lastName'])
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Ginny' }, { firstName: 'Ron' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .search('potter', ['firstName', 'lastName'])
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Fake' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .search('potter', ['firstName', 'lastName'])
        .where('firstName', '=', 'Harry')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .search('potter', ['firstName', 'lastName'])
        .search('harry', ['firstName', 'lastName'])
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb.selectFrom('Students').select('firstName').search('harry potter', ['firstName', 'lastName']).all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(await qb.selectFrom('Students').select('firstName').search('harry potter', 'firstName').all()).toEqual(
      qbo([]),
    )

    expect(
      await qb.selectFrom('Students').select('firstName').search('ha rr y pott er', ['firstName', 'lastName']).all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb.selectFrom('Students').select('firstName').search('ha rr y po tt er', ['firstName', 'lastName']).all(),
    ).toEqual(qbo([])) // Max search keywords: 5

    // SQL injection

    expect(await qb.selectFrom('Students').search('; drop table "Students";', 'firstName').all()).toEqual(qbo([]))

    expect(await qb.selectFrom('Students').count()).toEqual(qbo(9))

    await db.close()
    await close?.()
  }
})
