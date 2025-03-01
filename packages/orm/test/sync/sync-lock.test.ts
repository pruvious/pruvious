import { expect, test } from 'vitest'
import { Collection, Database } from '../../src'
import { createMiniflare, pgConnection, sqliteConnectionString } from '../utils'

test('sync lock', async () => {
  const collections = { Foo: new Collection({ fields: {} }) }
  const sqliteCS = sqliteConnectionString('sync_lock')
  const pgC = await pgConnection('sync_lock')

  // SQLite
  const sqliteFn = async () => {
    const sqlite = new Database({ driver: sqliteCS, collections })
    const synced = await sqlite.connect()
    expect(await sqlite.listTables()).toEqual(['Options', 'Foo'])
    await sqlite.close()
    return synced
  }

  const sqliteConnectionResults = (await Promise.all(Array.from({ length: 100 }, sqliteFn))).sort((a, b) =>
    a.synced === b.synced ? 0 : a.synced ? -1 : 1,
  )

  expect(sqliteConnectionResults).toHaveLength(100)
  expect(sqliteConnectionResults[0]).toEqual({ createdOptionsTable: true, synced: true })
  expect(sqliteConnectionResults.slice(1)).toEqual(
    Array.from({ length: 99 }, () => ({ createdOptionsTable: false, synced: false })),
  )

  // PostgreSQL
  const pgFn = async () => {
    const pg = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections })
    const synced = await pg.connect()
    expect(await pg.listTables()).toEqual(['Options', 'Foo'])
    await pg.close()
    return synced
  }

  const pgConnectionResults = (await Promise.all(Array.from({ length: 100 }, pgFn))).sort((a, b) =>
    a.synced === b.synced ? 0 : a.synced ? -1 : 1,
  )

  await pgC.drop()

  expect(pgConnectionResults).toHaveLength(100)
  expect(pgConnectionResults[0]).toEqual({ createdOptionsTable: true, synced: true })
  expect(pgConnectionResults.slice(1)).toEqual(
    Array.from({ length: 99 }, () => ({ createdOptionsTable: false, synced: false })),
  )

  // D1
  const { mf, db } = await createMiniflare()
  const d1Fn = async () => {
    const d1 = new Database({ driver: db, collections })
    const synced = await d1.connect()
    expect(await d1.listTables()).toEqual(['Options', 'Foo'])
    await d1.close()
    return synced
  }

  const d1ConnectionResults = (await Promise.all(Array.from({ length: 20 }, d1Fn))).sort((a, b) =>
    a.synced === b.synced ? 0 : a.synced ? -1 : 1,
  )

  expect(d1ConnectionResults).toHaveLength(20)
  expect(d1ConnectionResults.filter((r) => r.createdOptionsTable)).toHaveLength(1)
  expect(d1ConnectionResults.filter((r) => r.synced)).toHaveLength(1)

  await mf.dispose()
})
