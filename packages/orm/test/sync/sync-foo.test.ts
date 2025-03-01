import { expect, test } from 'vitest'
import { Collection, Database } from '../../src'
import { createMiniflare, pgConnection, sqliteConnectionString } from '../utils'

test("create collection 'Foo'", async () => {
  const collections = { Foo: new Collection({ key: 'foo', fields: {} }) }

  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('sync_foo_create'), collections })
  await sqlite.connect()
  expect(await sqlite.listTables()).toEqual(['Options', 'Foo'])
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('sync_foo_create')
  const pg = new Database({ driver: pgConnectionString, PGPool, collections })
  await pg.connect()
  expect(await pg.listTables()).toEqual(['Options', 'Foo'])
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db, collections })
  await d1.connect()
  expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  await d1.close()
  await mf.dispose()
})

test("rename collection 'Foo' to 'Bar'", async () => {
  const c1 = { Foo: new Collection({ key: 'foo', fields: {} }) }
  const c2 = { Bar: new Collection({ key: 'foo', fields: {} }) }

  // SQLite
  const sqliteCS = sqliteConnectionString('sync_foo_rename')

  const sqlite1 = new Database({ driver: sqliteCS, collections: c1 })
  await sqlite1.connect()
  expect(await sqlite1.listTables()).toEqual(['Options', 'Foo'])
  await sqlite1.exec('insert into "Foo" default values')
  expect(await sqlite1.exec('select * from "Foo"')).toEqual([{ id: 1 }])
  await sqlite1.close()

  const sqlite2 = new Database({ driver: sqliteCS, collections: c2 })
  await sqlite2.connect()
  expect(await sqlite2.listTables()).toEqual(['Options', 'Bar'])
  expect(await sqlite2.exec('select * from "Bar"')).toEqual([{ id: 1 }])
  await sqlite2.close()

  // PostgreSQL
  const pgC = await pgConnection('sync_foo_rename')

  const pg1 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: c1 })
  await pg1.connect()
  expect(await pg1.listTables()).toEqual(['Options', 'Foo'])
  await pg1.exec('insert into "Foo" default values')
  expect(await pg1.exec('select * from "Foo"')).toEqual([{ id: '1' }])
  await pg1.close()

  const pg2 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: c2 })
  await pg2.connect()
  expect(await pg2.listTables()).toEqual(['Options', 'Bar'])
  expect(await pg2.exec('select * from "Bar"')).toEqual([{ id: '1' }])
  await pg2.close()

  await pgC.drop()

  // D1
  const { mf, db } = await createMiniflare()

  const d1 = new Database({ driver: db, collections: c1 })
  await d1.connect()
  expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  await d1.exec('insert into "Foo" default values')
  expect(await d1.exec('select * from "Foo"')).toEqual([{ id: 1 }])
  await d1.close()

  const d2 = new Database({ driver: db, collections: c2 })
  await d2.connect()
  expect(await d2.listTables()).toEqual(['Options', 'Bar'])
  expect(await d2.exec('select * from "Bar"')).toEqual([{ id: 1 }])
  await d2.close()

  await mf.dispose()
})

test("delete collection 'Foo'", async () => {
  const c1 = { Foo: new Collection({ key: 'foo', fields: {} }) }
  const c2 = { Bar: new Collection({ key: 'bar', fields: {} }) }

  // SQLite
  const sqliteCS = sqliteConnectionString('sync_foo_delete')

  const sqlite1 = new Database({ driver: sqliteCS, collections: c1 })
  await sqlite1.connect()
  expect(await sqlite1.listTables()).toEqual(['Options', 'Foo'])
  await sqlite1.exec('insert into "Foo" default values')
  expect(await sqlite1.exec('select * from "Foo"')).toEqual([{ id: 1 }])
  await sqlite1.close()

  const sqlite2 = new Database({ driver: sqliteCS, collections: c2 })
  await sqlite2.connect()
  expect(await sqlite2.listTables()).toEqual(['Options', 'Bar'])
  expect(await sqlite2.exec('select * from "Bar"')).toEqual([])
  await sqlite2.close()

  // PostgreSQL
  const pgC = await pgConnection('sync_foo_delete')

  const pg1 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: c1 })
  await pg1.connect()
  expect(await pg1.listTables()).toEqual(['Options', 'Foo'])
  await pg1.exec('insert into "Foo" default values')
  expect(await pg1.exec('select * from "Foo"')).toEqual([{ id: '1' }])
  await pg1.close()

  const pg2 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: c2 })
  await pg2.connect()
  expect(await pg2.listTables()).toEqual(['Options', 'Bar'])
  expect(await pg2.exec('select * from "Bar"')).toEqual([])
  await pg2.close()

  await pgC.drop()

  // D1
  const { mf, db } = await createMiniflare()

  const d1 = new Database({ driver: db, collections: c1 })
  await d1.connect()
  expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  await d1.exec('insert into "Foo" default values')
  expect(await d1.exec('select * from "Foo"')).toEqual([{ id: 1 }])
  await d1.close()

  const d2 = new Database({ driver: db, collections: c2 })
  await d2.connect()
  expect(await d2.listTables()).toEqual(['Options', 'Bar'])
  expect(await d2.exec('select * from "Bar"')).toEqual([])
  await d2.close()

  await mf.dispose()
})

test("preserve collection 'Foo' when creating 'Bar'", async () => {
  const c1 = { Foo: new Collection({ key: 'foo', fields: {} }) }
  const c2 = { Bar: new Collection({ key: 'bar', fields: {} }) }

  // SQLite
  const sqliteCS = sqliteConnectionString('sync_foo_delete')

  const sqlite1 = new Database({ driver: sqliteCS, collections: c1, sync: { dropNonCollectionTables: false } })
  await sqlite1.connect()
  expect(await sqlite1.listTables()).toEqual(['Options', 'Foo'])
  await sqlite1.exec('insert into "Foo" default values')
  expect(await sqlite1.exec('select * from "Foo"')).toEqual([{ id: 1 }])
  await sqlite1.close()

  const sqlite2 = new Database({ driver: sqliteCS, collections: c2, sync: { dropNonCollectionTables: false } })
  await sqlite2.connect()
  expect(await sqlite2.listTables()).toEqual(['Options', 'Foo', 'Bar'])
  expect(await sqlite2.exec('select * from "Bar"')).toEqual([])
  await sqlite2.close()

  // PostgreSQL
  const pgC = await pgConnection('sync_foo_delete')

  const pg1 = new Database({
    driver: pgC.pgConnectionString,
    PGPool: pgC.PGPool,
    collections: c1,
    sync: { dropNonCollectionTables: false },
  })
  await pg1.connect()
  expect(await pg1.listTables()).toEqual(['Options', 'Foo'])
  await pg1.exec('insert into "Foo" default values')
  expect(await pg1.exec('select * from "Foo"')).toEqual([{ id: '1' }])
  await pg1.close()

  const pg2 = new Database({
    driver: pgC.pgConnectionString,
    PGPool: pgC.PGPool,
    collections: c2,
    sync: { dropNonCollectionTables: false },
  })
  await pg2.connect()
  expect(await pg2.listTables()).toEqual(['Options', 'Foo', 'Bar'])
  expect(await pg2.exec('select * from "Bar"')).toEqual([])
  await pg2.close()

  await pgC.drop()

  // D1
  const { mf, db } = await createMiniflare()

  const d1 = new Database({ driver: db, collections: c1, sync: { dropNonCollectionTables: false } })
  await d1.connect()
  expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  await d1.exec('insert into "Foo" default values')
  expect(await d1.exec('select * from "Foo"')).toEqual([{ id: 1 }])
  await d1.close()

  const d2 = new Database({ driver: db, collections: c2, sync: { dropNonCollectionTables: false } })
  await d2.connect()
  expect(await d2.listTables()).toEqual(['Options', 'Foo', 'Bar'])
  expect(await d2.exec('select * from "Bar"')).toEqual([])
  await d2.close()

  await mf.dispose()
})
