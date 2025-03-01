import { deepClone } from '@pruvious/utils'
import { expect, test } from 'vitest'
import { Collection, Database } from '../../src'
import { createMiniflare, pgConnection, sqliteConnectionString } from '../utils'

test('revert sync transaction', async () => {
  const c1 = { Foo: new Collection({ key: 'foo', fields: {} }) }
  const c2 = { Bar: new Collection({ key: 'foo', fields: {} }), Baz: new Collection({ key: 'baz', fields: {} }) }

  // SQLite
  const sqliteCS = sqliteConnectionString('revert_sync_transaction')

  const sqlite1 = new Database({ driver: sqliteCS, collections: c1 })
  await sqlite1.connect()
  expect(await sqlite1.listTables()).toEqual(['Options', 'Foo'])
  await sqlite1.close()

  const sqlite2 = new Database({ driver: sqliteCS, collections: deepClone(c2) })
  ;(sqlite2 as any).collections['Baz"'] = sqlite2.collections.Baz
  delete (sqlite2 as any).collections.Baz
  ;(sqlite2 as any).schemaMap.baz.table = 'Baz"'
  await expect(() => sqlite2.connect()).rejects.toThrow()
  expect(await sqlite2.listTables()).toEqual(['Options', 'Foo'])
  await sqlite2.close()

  // PostgreSQL
  const pgC = await pgConnection('revert_sync_transaction')

  const pg1 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: c1 })
  await pg1.connect()
  expect(await pg1.listTables()).toEqual(['Options', 'Foo'])
  await pg1.close()

  const pg2 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: deepClone(c2) })
  ;(pg2 as any).collections['Baz"'] = pg2.collections.Baz
  delete (pg2 as any).collections.Baz
  ;(pg2 as any).schemaMap.baz.table = 'Baz"'
  await expect(() => pg2.connect()).rejects.toThrow()
  expect(await pg2.listTables()).toEqual(['Options', 'Foo'])
  await pg2.close()

  await pgC.drop()

  // D1
  const { mf, db } = await createMiniflare()

  const d1 = new Database({ driver: db, collections: c1 })
  await d1.connect()
  expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  await d1.close()

  const d2 = new Database({ driver: db, collections: deepClone(c2) })
  ;(d2 as any).collections['Baz"'] = d2.collections.Baz
  delete (d2 as any).collections.Baz
  ;(d2 as any).schemaMap.baz.table = 'Baz"'
  await expect(() => d2.connect()).rejects.toThrow()
  expect(await d2.listTables()).toEqual(['Options', 'Bar']) // D1 transactions are not supported
  await d2.close()

  await mf.dispose()
})
