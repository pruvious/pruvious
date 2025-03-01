import { expect, test } from 'vitest'
import { Collection, Database } from '../../src'
import { initAllDrivers, qbo } from '../utils'

test('collection hooks', async () => {
  const collections = {
    Foo: new Collection({
      fields: {},
      hooks: {
        afterQueryExecution: [
          ({ operation }, { result }) => {
            result.data = operation
          },
        ],
      },
    }),
  }

  for (const { driver, PGPool, close } of await initAllDrivers('qb_collection_hooks')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

    expect(await qb.insertInto('Foo').values({}).run()).toEqual(qbo('insert'))
    expect(await qb.selectFrom('Foo').all()).toEqual(qbo('select'))
    expect(await qb.update('Foo').run()).toEqual(qbo('update'))
    expect(await qb.deleteFrom('Foo').run()).toEqual(qbo('delete'))

    await db.close()
    await close?.()
  }
})
