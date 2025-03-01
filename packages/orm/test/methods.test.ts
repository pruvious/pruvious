import { sleep } from '@pruvious/utils'
import { expect, test } from 'vitest'
import { Database } from '../src'
import { createMiniflare, pgConnection, sqliteConnectionString } from './utils'

test('database connection', async () => {
  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('database_connection') })
  expect(sqlite.connectionStatus).toBe('disconnected')
  await new Promise<void>(async (resolve) => {
    sqlite.connect().then((result) => {
      expect(result).toEqual({ createdOptionsTable: true, synced: true })
      resolve()
    })
    expect(sqlite.connectionStatus).toBe('connecting')
  })
  expect(sqlite.connectionStatus).toBe('connected')
  expect(await sqlite.close()).toBeUndefined()
  await expect(() => sqlite.close()).rejects.toThrow()
  expect(sqlite.connectionStatus).toBe('disconnected')

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('database_connection')
  const pg = new Database({ driver: pgConnectionString, PGPool })
  expect(pg.connectionStatus).toBe('disconnected')
  await new Promise<void>(async (resolve) => {
    pg.connect().then((result) => {
      expect(result).toEqual({ createdOptionsTable: true, synced: true })
      resolve()
    })
    expect(pg.connectionStatus).toBe('connecting')
  })
  expect(pg.connectionStatus).toBe('connected')
  expect(await pg.close()).toBeUndefined()
  await expect(() => pg.close()).rejects.toThrow()
  expect(pg.connectionStatus).toBe('disconnected')
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  expect(d1.connectionStatus).toBe('disconnected')
  await new Promise<void>(async (resolve) => {
    d1.connect().then((result) => {
      expect(result).toEqual({ createdOptionsTable: true, synced: true })
      resolve()
    })
    expect(d1.connectionStatus).toBe('connecting')
  })
  expect(d1.connectionStatus).toBe('connected')
  expect(await d1.close()).toBeUndefined()
  await expect(() => d1.close()).rejects.toThrow()
  expect(d1.connectionStatus).toBe('disconnected')
  await mf.dispose()
})

test('executing queries', async () => {
  const values10k = Array.from({ length: 10000 }, (_, i) => `$p${i + 1}`).join('), (')
  const query10k = `insert into "foo" values (${values10k})`
  const params10k = Object.fromEntries(Array.from({ length: 10000 }, (_, i) => [`p${i + 1}`, i + 1]))

  const values100 = Array.from({ length: 100 }, (_, i) => `$p${i + 1}`).join('), (')
  const query100 = `insert into "foo" values (${values100})`
  const params100 = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`p${i + 1}`, i + 1]))

  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('executing_queries') })
  await sqlite.connect()
  expect(await sqlite.exec('create table "foo" (bar text not null)')).toBe(0)
  expect(await sqlite.exec('select * from "foo"')).toEqual([])
  await expect(() =>
    sqlite.exec('insert into "foo" values ($bar1), ($bar2)', { bar1: 'BAR 1', bar2: null }),
  ).rejects.toThrow()
  expect(await sqlite.exec('select * from "foo"')).toEqual([])
  expect(await sqlite.exec('insert into "foo" values ($1), ($2)', { 1: 'BAR', 2: 'BAZ' })).toBe(2)
  await expect(() =>
    sqlite.exec('insert into "foo" values ($bar)', { bar: 'BAR', baz: 'BAZ' } as any),
  ).rejects.toThrow()
  await sqlite.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }).catch((error) => {
    expect(error.name).toBe('ExecError')
    expect(error.sql).toBe('insert into "foo" values ($p1), ($p2)')
    expect(error.params).toEqual({ p1: 'bar', p2: 'baz' })
  })
  expect(await sqlite.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' })).toBe(2)
  await expect(() => sqlite.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any)).rejects.toThrow()
  expect(await sqlite.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any, true)).toBeUndefined()
  expect(await sqlite.exec('insert into "foo" values ($bar) returning "bar"', { bar: 'BAR' })).toEqual([{ bar: 'BAR' }])
  expect(await sqlite.exec(query10k, params10k)).toBe(10000)
  expect(await sqlite.execWithDuration(query10k, params10k)).toEqual({ result: 10000, duration: expect.any(Number) })
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('executing_queries')
  const pg = new Database({ driver: pgConnectionString, PGPool })
  await pg.connect()
  expect(await pg.exec('create table "foo" (bar text not null)')).toBe(0)
  expect(await pg.exec('select * from "foo"')).toEqual([])
  await expect(() =>
    pg.exec('insert into "foo" values ($bar1), ($bar2)', { bar1: 'BAR 1', bar2: null }),
  ).rejects.toThrow()
  expect(await pg.exec('select * from "foo"')).toEqual([])
  expect(await pg.exec('insert into "foo" values ($1), ($2)', { 1: 'BAR', 2: 'BAZ' })).toBe(2)
  await expect(() => pg.exec('insert into "foo" values ($bar)', { bar: 'BAR', baz: 'BAZ' } as any)).rejects.toThrow()
  await pg.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any).catch((error) => {
    expect(error.name).toBe('ExecError')
    expect(error.sql).toBe('insert into "foo" values ($1), ($2)')
    expect(error.params).toEqual(['BAR', undefined])
  })
  expect(await pg.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' })).toBe(2)
  await expect(() => pg.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any)).rejects.toThrow()
  expect(await pg.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any, true)).toBeUndefined()
  expect(await pg.exec('insert into "foo" values ($bar) returning "bar"', { bar: 'BAR' })).toEqual([{ bar: 'BAR' }])
  expect(await pg.exec(query10k, params10k)).toBe(10000)
  expect(await pg.execWithDuration(query10k, params10k)).toEqual({ result: 10000, duration: expect.any(Number) })
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  expect(await d1.exec('create table "foo" (bar text not null)')).toBe(0)
  expect(await d1.exec('select * from "foo"')).toEqual([])
  await expect(() =>
    d1.exec('insert into "foo" values ($bar1), ($bar2)', { bar1: 'BAR 1', bar2: null }),
  ).rejects.toThrow()
  expect(await d1.exec('select * from "foo"')).toEqual([])
  expect(await d1.exec('insert into "foo" values ($1), ($2)', { 1: 'BAR', 2: 'BAZ' })).toBe(2)
  await expect(() => d1.exec('insert into "foo" values ($bar)', { bar: 'BAR', baz: 'BAZ' } as any)).rejects.toThrow()
  await d1.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any).catch((error) => {
    expect(error.name).toBe('ExecError')
    expect(error.sql).toBe('insert into "foo" values (?1), (?2)')
    expect(error.params).toEqual(['BAR', undefined])
  })
  expect(await d1.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' })).toBe(2)
  await expect(() => d1.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any)).rejects.toThrow()
  expect(await d1.exec('insert into "foo" values ($bar), ($baz)', { bar: 'BAR' } as any, true)).toBeUndefined()
  expect(await d1.exec('insert into "foo" values ($bar) returning "bar"', { bar: 'BAR' })).toEqual([{ bar: 'BAR' }])
  await expect(() => d1.exec(query10k, params10k)).rejects.toThrow()
  expect(await d1.exec(query100, params100)).toBe(100)
  expect(await d1.execWithDuration(query100, params100)).toEqual({ result: 100, duration: expect.any(Number) })
  await d1.close()
  await mf.dispose()
})

test('table and column methods', async () => {
  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('table_and_column_methods') })
  await sqlite.connect()
  expect(await sqlite.createTable('select')).toBeUndefined()
  await expect(() => sqlite.createTable('select')).rejects.toThrow()
  expect(await sqlite.tableExists('select')).toBe(true)
  expect(await sqlite.listTables()).toEqual(['Options', 'select'])
  expect(await sqlite.createColumn('select', 'insert', 'text')).toBeUndefined()
  await expect(() => sqlite.createColumn('select', 'insert', 'text')).rejects.toThrow()
  expect(await sqlite.columnExists('select', 'insert')).toBe(true)
  expect(await sqlite.listColumns('select')).toEqual(['id', 'insert'])
  await expect(() => sqlite.listColumns('Foo')).rejects.toThrow()
  expect(await sqlite.dropColumn('select', 'insert')).toBeUndefined()
  await expect(() => sqlite.dropColumn('select', 'insert')).rejects.toThrow()
  await expect(() => sqlite.createColumn('select', 'id', 'text')).rejects.toThrow()
  await expect(() => sqlite.createColumn('select', 'ID', 'text')).rejects.toThrow()
  expect(await sqlite.listColumns('select')).toEqual(['id'])
  expect(await sqlite.dropTable('select')).toBeUndefined()
  await expect(() => sqlite.dropTable('select')).rejects.toThrow()
  await expect(() => sqlite.createTable('Options')).rejects.toThrow()
  await expect(() => sqlite.createTable('options')).rejects.toThrow()
  expect(await sqlite.createTable('Foo')).toBeUndefined()
  expect(await sqlite.renameTable('Foo', 'Bar')).toBeUndefined()
  await expect(() => sqlite.renameTable('Foo', 'Bar')).rejects.toThrow()
  expect(await sqlite.listTables()).toEqual(['Options', 'Bar'])
  expect(await sqlite.createColumn('Bar', 'baz', 'text')).toBeUndefined()
  expect(await sqlite.renameColumn('Bar', 'baz', 'qux')).toBeUndefined()
  await expect(() => sqlite.renameColumn('Bar', 'baz', 'qux')).rejects.toThrow()
  expect(await sqlite.listColumns('Bar')).toEqual(['id', 'qux'])
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('table_and_column_methods')
  const pg = new Database({ driver: pgConnectionString, PGPool })
  await pg.connect()
  expect(await pg.createTable('select')).toBeUndefined()
  await expect(() => pg.createTable('select')).rejects.toThrow()
  expect(await pg.tableExists('select')).toBe(true)
  expect(await pg.listTables()).toEqual(['Options', 'select'])
  expect(await pg.createColumn('select', 'insert', 'text')).toBeUndefined()
  await expect(() => pg.createColumn('select', 'insert', 'text')).rejects.toThrow()
  expect(await pg.columnExists('select', 'insert')).toBe(true)
  expect(await pg.listColumns('select')).toEqual(['id', 'insert'])
  await expect(() => pg.listColumns('Foo')).rejects.toThrow()
  expect(await pg.dropColumn('select', 'insert')).toBeUndefined()
  await expect(() => pg.dropColumn('select', 'insert')).rejects.toThrow()
  await expect(() => pg.createColumn('select', 'id', 'text')).rejects.toThrow()
  expect(await pg.createColumn('select', 'ID', 'text')).toBeUndefined()
  expect(await pg.dropColumn('select', 'ID')).toBeUndefined()
  expect(await pg.listColumns('select')).toEqual(['id'])
  expect(await pg.dropTable('select')).toBeUndefined()
  await expect(() => pg.dropTable('select')).rejects.toThrow()
  await expect(() => pg.createTable('Options')).rejects.toThrow()
  expect(await pg.createTable('options')).toBeUndefined()
  expect(await pg.dropTable('options')).toBeUndefined()
  expect(await pg.createTable('Foo')).toBeUndefined()
  expect(await pg.renameTable('Foo', 'Bar')).toBeUndefined()
  await expect(() => pg.renameTable('Foo', 'Bar')).rejects.toThrow()
  expect(await pg.listTables()).toEqual(['Options', 'Bar'])
  expect(await pg.createColumn('Bar', 'baz', 'text')).toBeUndefined()
  expect(await pg.renameColumn('Bar', 'baz', 'qux')).toBeUndefined()
  await expect(() => pg.renameColumn('Bar', 'baz', 'qux')).rejects.toThrow()
  expect(await pg.listColumns('Bar')).toEqual(['id', 'qux'])
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  expect(await d1.createTable('select')).toBeUndefined()
  await expect(() => d1.createTable('select')).rejects.toThrow()
  expect(await d1.tableExists('select')).toBe(true)
  expect(await d1.listTables()).toEqual(['Options', 'select'])
  expect(await d1.createColumn('select', 'insert', 'text')).toBeUndefined()
  await expect(() => d1.createColumn('select', 'insert', 'text')).rejects.toThrow()
  expect(await d1.columnExists('select', 'insert')).toBe(true)
  expect(await d1.listColumns('select')).toEqual(['id', 'insert'])
  await expect(() => d1.listColumns('Foo')).rejects.toThrow()
  expect(await d1.dropColumn('select', 'insert')).toBeUndefined()
  await expect(() => d1.dropColumn('select', 'insert')).rejects.toThrow()
  await expect(() => d1.createColumn('select', 'id', 'text')).rejects.toThrow()
  await expect(() => d1.createColumn('select', 'ID', 'text')).rejects.toThrow()
  expect(await d1.listColumns('select')).toEqual(['id'])
  expect(await d1.dropTable('select')).toBeUndefined()
  await expect(() => d1.dropTable('select')).rejects.toThrow()
  await expect(() => d1.createTable('Options')).rejects.toThrow()
  await expect(() => d1.createTable('options')).rejects.toThrow()
  expect(await d1.createTable('Foo')).toBeUndefined()
  expect(await d1.renameTable('Foo', 'Bar')).toBeUndefined()
  await expect(() => d1.renameTable('Foo', 'Bar')).rejects.toThrow()
  expect(await d1.listTables()).toEqual(['Options', 'Bar'])
  expect(await d1.createColumn('Bar', 'baz', 'text')).toBeUndefined()
  expect(await d1.renameColumn('Bar', 'baz', 'qux')).toBeUndefined()
  await expect(() => d1.renameColumn('Bar', 'baz', 'qux')).rejects.toThrow()
  expect(await d1.listColumns('Bar')).toEqual(['id', 'qux'])
  await d1.close()
  await mf.dispose()
})

test('option methods', async () => {
  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('option_methods') })
  await sqlite.connect()
  expect(await sqlite.getOption('foo')).toBeUndefined()
  expect(await sqlite.setOption('foo', 'bar')).toBe(true)
  expect(await sqlite.getOption('foo')).toBe('bar')
  expect(await sqlite.setOption('foo', { baz: 1 })).toBe(true)
  expect(await sqlite.getOption('foo')).toEqual({ baz: 1 })
  expect(await sqlite.deleteOption('foo')).toBe(true)
  expect(await sqlite.deleteOption('foo')).toBe(false)
  expect(await sqlite.getOption('foo')).toBeUndefined()
  expect(await sqlite.getAllOptions()).toEqual({})
  expect(await sqlite.setOptions({ foo: 'bar', baz: 'qux', quux: 'corge' })).toBe(true)
  expect(await sqlite.getOptions(['foo', 'baz'])).toEqual({ foo: 'bar', baz: 'qux' })
  expect(await sqlite.setOptions({ foo: 'foo' })).toBe(true)
  expect(await sqlite.getOptions(['foo'])).toEqual({ foo: 'foo' })
  expect(await sqlite.getAllOptions()).toEqual({ foo: 'foo', baz: 'qux', quux: 'corge' })
  expect(await sqlite.deleteOptions(['foo', 'bar', 'baz'])).toBe(2)
  expect(await sqlite.deleteOptions(['foo', 'baz'])).toBe(0)
  expect(await sqlite.getAllOptions()).toEqual({ quux: 'corge' })
  expect(await sqlite.getOptions(['foo', 'quux'])).toEqual({ foo: undefined, quux: 'corge' })
  expect(await sqlite.deleteAllOptions()).toBe(1)
  expect(await sqlite.deleteAllOptions()).toBe(0)
  expect(await sqlite.getAllOptions()).toEqual({})
  await expect(() => sqlite.getOption('_foo')).rejects.toThrow()
  await expect(() => sqlite.getOptions(['_foo'])).rejects.toThrow()
  await expect(() => sqlite.setOption('_foo', 'bar')).rejects.toThrow()
  await expect(() => sqlite.setOptions({ _foo: 'bar' })).rejects.toThrow()
  await expect(() => sqlite.deleteOption('_foo')).rejects.toThrow()
  await expect(() => sqlite.deleteOptions(['_foo'])).rejects.toThrow()
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('option_methods')
  const pg = new Database({ driver: pgConnectionString, PGPool })
  await pg.connect()
  expect(await pg.getOption('foo')).toBeUndefined()
  expect(await pg.setOption('foo', 'bar')).toBe(true)
  expect(await pg.getOption('foo')).toBe('bar')
  expect(await pg.setOption('foo', { baz: 1 })).toBe(true)
  expect(await pg.getOption('foo')).toEqual({ baz: 1 })
  expect(await pg.deleteOption('foo')).toBe(true)
  expect(await pg.deleteOption('foo')).toBe(false)
  expect(await pg.getOption('foo')).toBeUndefined()
  expect(await pg.getAllOptions()).toEqual({})
  expect(await pg.setOptions({ foo: 'bar', baz: 'qux', quux: 'corge' })).toBe(true)
  expect(await pg.getOptions(['foo', 'baz'])).toEqual({ foo: 'bar', baz: 'qux' })
  expect(await pg.setOptions({ foo: 'foo' })).toBe(true)
  expect(await pg.getOptions(['foo'])).toEqual({ foo: 'foo' })
  expect(await pg.getAllOptions()).toEqual({ foo: 'foo', baz: 'qux', quux: 'corge' })
  expect(await pg.deleteOptions(['foo', 'bar', 'baz'])).toBe(2)
  expect(await pg.deleteOptions(['foo', 'baz'])).toBe(0)
  expect(await pg.getAllOptions()).toEqual({ quux: 'corge' })
  expect(await pg.getOptions(['foo', 'quux'])).toEqual({ foo: undefined, quux: 'corge' })
  expect(await pg.deleteAllOptions()).toBe(1)
  expect(await pg.deleteAllOptions()).toBe(0)
  expect(await pg.getAllOptions()).toEqual({})
  await expect(() => pg.getOption('_foo')).rejects.toThrow()
  await expect(() => pg.getOptions(['_foo'])).rejects.toThrow()
  await expect(() => pg.setOption('_foo', 'bar')).rejects.toThrow()
  await expect(() => pg.setOptions({ _foo: 'bar' })).rejects.toThrow()
  await expect(() => pg.deleteOption('_foo')).rejects.toThrow()
  await expect(() => pg.deleteOptions(['_foo'])).rejects.toThrow()
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  expect(await d1.getOption('foo')).toBeUndefined()
  expect(await d1.setOption('foo', 'bar')).toBe(true)
  expect(await d1.getOption('foo')).toBe('bar')
  expect(await d1.setOption('foo', { baz: 1 })).toBe(true)
  expect(await d1.getOption('foo')).toEqual({ baz: 1 })
  expect(await d1.deleteOption('foo')).toBe(true)
  expect(await d1.deleteOption('foo')).toBe(false)
  expect(await d1.getOption('foo')).toBeUndefined()
  expect(await d1.getAllOptions()).toEqual({})
  expect(await d1.setOptions({ foo: 'bar', baz: 'qux', quux: 'corge' })).toBe(true)
  expect(await d1.getOptions(['foo', 'baz'])).toEqual({ foo: 'bar', baz: 'qux' })
  expect(await d1.setOptions({ foo: 'foo' })).toBe(true)
  expect(await d1.getOptions(['foo'])).toEqual({ foo: 'foo' })
  expect(await d1.getAllOptions()).toEqual({ foo: 'foo', baz: 'qux', quux: 'corge' })
  expect(await d1.deleteOptions(['foo', 'bar', 'baz'])).toBe(2)
  expect(await d1.deleteOptions(['foo', 'baz'])).toBe(0)
  expect(await d1.getAllOptions()).toEqual({ quux: 'corge' })
  expect(await d1.getOptions(['foo', 'quux'])).toEqual({ foo: undefined, quux: 'corge' })
  expect(await d1.deleteAllOptions()).toBe(1)
  expect(await d1.deleteAllOptions()).toBe(0)
  expect(await d1.getAllOptions()).toEqual({})
  await expect(() => d1.getOption('_foo')).rejects.toThrow()
  await expect(() => d1.getOptions(['_foo'])).rejects.toThrow()
  await expect(() => d1.setOption('_foo', 'bar')).rejects.toThrow()
  await expect(() => d1.setOptions({ _foo: 'bar' })).rejects.toThrow()
  await expect(() => d1.deleteOption('_foo')).rejects.toThrow()
  await expect(() => d1.deleteOptions(['_foo'])).rejects.toThrow()
  await d1.close()
  await mf.dispose()
})

test('index methods', async () => {
  const sqliteCS = sqliteConnectionString('index_methods')
  const pgC = await pgConnection('index_methods')

  // SQLite
  const sqlite = new Database({ driver: sqliteCS })
  await sqlite.connect()
  await sqlite.createTable('Foo')
  await sqlite.createColumn('Foo', 'bar', 'text')
  await sqlite.createColumn('Foo', 'baz', 'text')
  await sqlite.createColumn('Foo', 'qux', 'text')
  await sqlite.createColumn('Foo', 'corge', 'text')
  await sqlite.createColumn('Foo', 'grault', 'text')
  await sqlite.createColumn('Foo', 'garply', 'text')
  expect(await sqlite.listIndexes('Foo')).toEqual([])
  await expect(() => sqlite.listIndexes('Bar')).rejects.toThrow()
  expect(await sqlite.createIndex('Foo', ['bar'])).toBeUndefined()
  expect(await sqlite.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  expect(await sqlite.dropIndex('IX_Foo__bar')).toBeUndefined()
  await expect(() => sqlite.dropIndex('IX_Foo__bar')).rejects.toThrow()
  expect(await sqlite.listIndexes('Foo')).toEqual([])
  expect(await sqlite.createIndex('Foo', ['bar'])).toBeUndefined()
  expect(await sqlite.createIndex('Foo', ['baz'], true)).toBeUndefined()
  expect(await sqlite.createIndex('Foo', ['qux', 'corge'])).toBeUndefined()
  expect(await sqlite.createIndex('Foo', ['grault', 'garply'], true)).toBeUndefined()
  expect((await sqlite.listIndexes('Foo')).sort()).toEqual([
    'CX_Foo__qux__corge',
    'IX_Foo__bar',
    'UC_Foo__grault__garply',
    'UX_Foo__baz',
  ])
  expect(
    (await sqlite.exec("select name, sql from sqlite_master where type = 'index' and sql is not null")).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  ).toEqual([
    { name: 'CX_Foo__qux__corge', sql: 'CREATE INDEX "CX_Foo__qux__corge" on "Foo" ("qux", "corge")' },
    { name: 'IX_Foo__bar', sql: 'CREATE INDEX "IX_Foo__bar" on "Foo" ("bar")' },
    {
      name: 'UC_Foo__grault__garply',
      sql: 'CREATE UNIQUE INDEX "UC_Foo__grault__garply" on "Foo" ("grault", "garply")',
    },
    { name: 'UX_Foo__baz', sql: 'CREATE UNIQUE INDEX "UX_Foo__baz" on "Foo" ("baz")' },
  ])
  expect(
    await sqlite.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a', 'b', 'c', 'd', 'e', 'f')`),
  ).toBe(1)
  await expect(() =>
    sqlite.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b2', 'c2', 'd2', 'e', 'f')`),
  ).rejects.toThrow()
  expect(await sqlite.dropIndex('UC_Foo__grault__garply')).toBeUndefined()
  await expect(() =>
    sqlite.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b', 'c2', 'd2', 'e2', 'f2')`),
  ).rejects.toThrow()
  expect(await sqlite.dropIndex('UX_Foo__baz')).toBeUndefined()
  expect(
    await sqlite.exec(
      `insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b2', 'c2', 'd2', 'e2', 'f2')`,
    ),
  ).toBe(1)
  expect(
    await sqlite.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a', 'b', 'c', 'd', 'e', 'f')`),
  ).toBe(1)
  await sqlite.close()

  // PostgreSQL
  const pg = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool })
  await pg.connect()
  await pg.createTable('Foo')
  await pg.createColumn('Foo', 'bar', 'text')
  await pg.createColumn('Foo', 'baz', 'text')
  await pg.createColumn('Foo', 'qux', 'text')
  await pg.createColumn('Foo', 'corge', 'text')
  await pg.createColumn('Foo', 'grault', 'text')
  await pg.createColumn('Foo', 'garply', 'text')
  expect(await pg.listIndexes('Foo')).toEqual([])
  await expect(() => pg.listIndexes('Bar')).rejects.toThrow()
  expect(await pg.createIndex('Foo', ['bar'])).toBeUndefined()
  expect(await pg.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  expect(await pg.dropIndex('IX_Foo__bar')).toBeUndefined()
  await expect(() => pg.dropIndex('IX_Foo__bar')).rejects.toThrow()
  expect(await pg.createIndex('Foo', ['bar'])).toBeUndefined()
  expect(await pg.createIndex('Foo', ['baz'], true)).toBeUndefined()
  expect(await pg.createIndex('Foo', ['qux', 'corge'])).toBeUndefined()
  expect(await pg.createIndex('Foo', ['grault', 'garply'], true)).toBeUndefined()
  expect((await pg.listIndexes('Foo')).sort()).toEqual([
    'CX_Foo__qux__corge',
    'IX_Foo__bar',
    'UC_Foo__grault__garply',
    'UX_Foo__baz',
  ])
  expect(
    (
      await pg.exec("select indexname, indexdef from pg_indexes where tablename = 'Foo' and indexname != 'Foo_pkey'")
    ).sort((a, b) => a.indexname.localeCompare(b.indexname)),
  ).toEqual([
    {
      indexname: 'CX_Foo__qux__corge',
      indexdef: 'CREATE INDEX "CX_Foo__qux__corge" ON public."Foo" USING btree (qux, corge)',
    },
    {
      indexname: 'IX_Foo__bar',
      indexdef: 'CREATE INDEX "IX_Foo__bar" ON public."Foo" USING btree (bar)',
    },
    {
      indexname: 'UC_Foo__grault__garply',
      indexdef: 'CREATE UNIQUE INDEX "UC_Foo__grault__garply" ON public."Foo" USING btree (grault, garply)',
    },
    {
      indexname: 'UX_Foo__baz',
      indexdef: 'CREATE UNIQUE INDEX "UX_Foo__baz" ON public."Foo" USING btree (baz)',
    },
  ])
  expect(
    await pg.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a', 'b', 'c', 'd', 'e', 'f')`),
  ).toBe(1)
  await expect(() =>
    pg.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b2', 'c2', 'd2', 'e', 'f')`),
  ).rejects.toThrow()
  expect(await pg.dropIndex('UC_Foo__grault__garply')).toBeUndefined()
  await expect(() =>
    pg.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b', 'c2', 'd2', 'e2', 'f2')`),
  ).rejects.toThrow()
  expect(await pg.dropIndex('UX_Foo__baz')).toBeUndefined()
  expect(
    await pg.exec(
      `insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b2', 'c2', 'd2', 'e2', 'f2')`,
    ),
  ).toBe(1)
  expect(
    await pg.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a', 'b', 'c', 'd', 'e', 'f')`),
  ).toBe(1)
  await pg.close()
  await pgC.drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  await d1.createTable('Foo')
  await d1.createColumn('Foo', 'bar', 'text')
  await d1.createColumn('Foo', 'baz', 'text')
  await d1.createColumn('Foo', 'qux', 'text')
  await d1.createColumn('Foo', 'corge', 'text')
  await d1.createColumn('Foo', 'grault', 'text')
  await d1.createColumn('Foo', 'garply', 'text')
  expect(await d1.listIndexes('Foo')).toEqual([])
  await expect(() => d1.listIndexes('Bar')).rejects.toThrow()
  expect(await d1.createIndex('Foo', ['bar'])).toBeUndefined()
  expect(await d1.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  expect(await d1.dropIndex('IX_Foo__bar')).toBeUndefined()
  await expect(() => d1.dropIndex('IX_Foo__bar')).rejects.toThrow()
  expect(await d1.listIndexes('Foo')).toEqual([])
  expect(await d1.createIndex('Foo', ['bar'])).toBeUndefined()
  expect(await d1.createIndex('Foo', ['baz'], true)).toBeUndefined()
  expect(await d1.createIndex('Foo', ['qux', 'corge'])).toBeUndefined()
  expect(await d1.createIndex('Foo', ['grault', 'garply'], true)).toBeUndefined()
  expect((await d1.listIndexes('Foo')).sort()).toEqual([
    'CX_Foo__qux__corge',
    'IX_Foo__bar',
    'UC_Foo__grault__garply',
    'UX_Foo__baz',
  ])
  expect(
    (await d1.exec("select name, sql from sqlite_master where type = 'index' and sql is not null")).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  ).toEqual([
    { name: 'CX_Foo__qux__corge', sql: 'CREATE INDEX "CX_Foo__qux__corge" on "Foo" ("qux", "corge")' },
    { name: 'IX_Foo__bar', sql: 'CREATE INDEX "IX_Foo__bar" on "Foo" ("bar")' },
    {
      name: 'UC_Foo__grault__garply',
      sql: 'CREATE UNIQUE INDEX "UC_Foo__grault__garply" on "Foo" ("grault", "garply")',
    },
    { name: 'UX_Foo__baz', sql: 'CREATE UNIQUE INDEX "UX_Foo__baz" on "Foo" ("baz")' },
  ])
  expect(
    await d1.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a', 'b', 'c', 'd', 'e', 'f')`),
  ).toBe(1)
  await expect(() =>
    d1.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b2', 'c2', 'd2', 'e', 'f')`),
  ).rejects.toThrow()
  expect(await d1.dropIndex('UC_Foo__grault__garply')).toBeUndefined()
  await expect(() =>
    d1.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b', 'c2', 'd2', 'e2', 'f2')`),
  ).rejects.toThrow()
  expect(await d1.dropIndex('UX_Foo__baz')).toBeUndefined()
  expect(
    await d1.exec(
      `insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a2', 'b2', 'c2', 'd2', 'e2', 'f2')`,
    ),
  ).toBe(1)
  expect(
    await d1.exec(`insert into "Foo" (bar, baz, qux, corge, grault, garply) values ('a', 'b', 'c', 'd', 'e', 'f')`),
  ).toBe(1)
  await d1.close()
  await mf.dispose()
})

test('foreign key methods', async () => {
  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('foreign_key_methods') })
  await sqlite.connect()
  await sqlite.createTable('Foo')
  await sqlite.createTable('Bar')
  await sqlite.createColumn('Foo', 'bar', 'bigint', false)
  expect(await sqlite.listForeignKeys('Foo')).toEqual([])
  await expect(() => sqlite.listForeignKeys('Baz')).rejects.toThrow()
  expect(await sqlite.createForeignKey('Foo', 'bar', 'Bar', 'id')).toBeUndefined()
  expect(await sqlite.listForeignKeys('Foo')).toEqual(['FK_Foo__bar'])
  await sqlite.exec('insert into "Bar" default values')
  await sqlite.exec('insert into "Foo" (bar) values (1)')
  await expect(() => sqlite.exec('insert into "Foo" (bar) values (2)')).rejects.toThrow()
  expect(await sqlite.dropForeignKey('Foo', 'FK_Foo__bar')).toBeUndefined()
  await expect(() => sqlite.dropForeignKey('Foo', 'FK_Foo__bar')).rejects.toThrow()
  expect(await sqlite.listForeignKeys('Foo')).toEqual([])
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('foreign_key_methods')
  const pg = new Database({ driver: pgConnectionString, PGPool })
  await pg.connect()
  await pg.createTable('Foo')
  await pg.createTable('Bar')
  await pg.createColumn('Foo', 'bar', 'bigint', false)
  expect(await pg.listForeignKeys('Foo')).toEqual([])
  await expect(() => pg.listForeignKeys('Baz')).rejects.toThrow()
  expect(await pg.createForeignKey('Foo', 'bar', 'Bar', 'id')).toBeUndefined()
  expect(await pg.listForeignKeys('Foo')).toEqual(['FK_Foo__bar'])
  await pg.exec('insert into "Bar" default values')
  await pg.exec('insert into "Foo" (bar) values (1)')
  await expect(() => pg.exec('insert into "Foo" (bar) values (2)')).rejects.toThrow()
  expect(await pg.dropForeignKey('Foo', 'FK_Foo__bar')).toBeUndefined()
  await expect(() => pg.dropForeignKey('Foo', 'FK_Foo__bar')).rejects.toThrow()
  expect(await pg.listForeignKeys('Foo')).toEqual([])
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  await d1.createTable('Foo')
  await d1.createTable('Bar')
  await d1.createColumn('Foo', 'bar', 'bigint', false)
  expect(await d1.listForeignKeys('Foo')).toEqual([])
  await expect(() => d1.listForeignKeys('Baz')).rejects.toThrow()
  expect(await d1.createForeignKey('Foo', 'bar', 'Bar', 'id')).toBeUndefined()
  expect(await d1.listForeignKeys('Foo')).toEqual(['FK_Foo__bar'])
  await d1.exec('insert into "Bar" default values')
  await d1.exec('insert into "Foo" (bar) values (1)')
  await expect(() => d1.exec('insert into "Foo" (bar) values (2)')).rejects.toThrow()
  expect(await d1.dropForeignKey('Foo', 'FK_Foo__bar')).toBeUndefined()
  await expect(() => d1.dropForeignKey('Foo', 'FK_Foo__bar')).rejects.toThrow()
  expect(await d1.listForeignKeys('Foo')).toEqual([])
  await d1.close()
  await mf.dispose()
})

test('transaction methods', async () => {
  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('transaction_methods') })
  await sqlite.connect()
  await sqlite.transaction(async (exec) => {
    await exec('create table "Foo" (bar text)')
    await exec(`insert into "Foo" (bar) values ('baz')`)
    expect(await sqlite.listTables()).toEqual(['Options', 'Foo'])
  })
  expect(await sqlite.listTables()).toEqual(['Options', 'Foo'])
  await expect(() => sqlite.transaction((exec) => exec('create table "Foo" (bar text)'))).rejects.toThrow()
  await expect(() =>
    sqlite.transaction(async (exec) => {
      await exec('delete from "Foo"')
      await exec('create table "Bar" (bar text)')
      await exec('create table "Foo" (bar text)')
    }),
  ).rejects.toThrow()
  expect(await sqlite.listTables()).toEqual(['Options', 'Foo'])
  expect(await sqlite.exec('select * from "Foo"')).toEqual([{ bar: 'baz' }])
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('transaction_methods')
  const pg = new Database({ driver: pgConnectionString, PGPool })
  await pg.connect()
  await pg.transaction(async (exec) => {
    await exec('create table "Foo" (bar text)')
    await exec(`insert into "Foo" (bar) values ('baz')`)
    expect(await exec("select table_name from information_schema.tables where table_schema = 'public'")).toEqual([
      { table_name: 'Options' },
      { table_name: 'Foo' },
    ])
  })
  expect(await pg.listTables()).toEqual(['Options', 'Foo'])
  await expect(() => pg.transaction((exec) => exec('create table "Foo" (bar text)'))).rejects.toThrow()
  await expect(() =>
    pg.transaction(async (exec) => {
      await exec('delete from "Foo"')
      await exec('create table "Bar" (bar text)')
      await exec('create table "Foo" (bar text)')
    }),
  ).rejects.toThrow()
  expect(await pg.listTables()).toEqual(['Options', 'Foo'])
  expect(await pg.exec('select * from "Foo"')).toEqual([{ bar: 'baz' }])
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  await d1.transaction(async (exec) => {
    await exec('create table "Foo" (bar text)')
    await exec(`insert into "Foo" (bar) values ('baz')`)
    expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  })
  expect(await d1.listTables()).toEqual(['Options', 'Foo'])
  await expect(() => d1.transaction((exec) => exec('create table "Foo" (bar text)'))).rejects.toThrow()
  await expect(() =>
    d1.transaction(async (exec) => {
      await exec('delete from "Foo"')
      await exec('create table "Bar" (bar text)')
      await exec('create table "Foo" (bar text)')
    }),
  ).rejects.toThrow()
  expect(await d1.listTables()).toEqual(['Options', 'Foo', 'Bar']) // D1 transactions are not supported
  expect(await d1.exec('select * from "Foo"')).toEqual([]) // D1 transactions are not supported
  await d1.close()
  await mf.dispose()
})

test('lock methods', async () => {
  // SQLite
  const sqliteCS = sqliteConnectionString('lock_methods')
  const sqlite = new Database({ driver: sqliteCS })
  await sqlite.connect()
  expect(await sqlite.lock('foo')).toBe(true)
  expect(await sqlite.isLocked('foo')).toBe(true)
  expect(await sqlite.isLocked('bar')).toBe(false)
  expect(await sqlite.unlock('foo')).toBe(true)
  expect(await sqlite.unlock('bar')).toBe(false)
  expect(await sqlite.isLocked('foo')).toBe(false)
  expect(await sqlite.lock('foo')).toBe(true)
  sqlite.lock('foo').then((locked) => expect(locked).toBe(true))
  sqlite.lock('foo', 150).then((locked) => expect(locked).toBe(false))
  let sqliteT = performance.now()
  for (let i = 1; i <= 5; i++) {
    if (i === 5) {
      sqliteT = performance.now() - sqliteT
      await sqlite.unlock('foo')
    } else {
      await sleep(50)
    }
  }
  expect(sqliteT).toBeGreaterThanOrEqual(199)
  expect(sqliteT).toBeLessThanOrEqual(301)
  await sleep(50)
  expect(await sqlite.isLocked('foo')).toBe(true)
  await sqlite.close()

  const sqlite2 = new Database({ driver: sqliteCS })
  await sqlite2.connect()
  expect(await sqlite2.isLocked('foo')).toBe(false)
  expect(await sqlite2.lock('foo')).toBe(true)
  expect(await sqlite2.lock('bar')).toBe(true)
  expect((await sqlite2.listLocks()).sort()).toEqual(['bar', 'foo'])
  expect(await sqlite2.unlockAll()).toBe(2)
  expect(await sqlite2.listLocks()).toEqual([])
  expect(await sqlite2.unlockAll()).toBe(0)
  await sqlite2.close()

  // PostgreSQL
  const pgC = await pgConnection('lock_methods')
  const pg = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool })
  await pg.connect()
  expect(await pg.lock('foo')).toBe(true)
  expect(await pg.isLocked('foo')).toBe(true)
  expect(await pg.isLocked('bar')).toBe(false)
  expect(await pg.unlock('foo')).toBe(true)
  expect(await pg.unlock('bar')).toBe(false)
  expect(await pg.isLocked('foo')).toBe(false)
  expect(await pg.lock('foo')).toBe(true)
  pg.lock('foo').then((locked) => expect(locked).toBe(true))
  pg.lock('foo', 150).then((locked) => expect(locked).toBe(false))
  let pgT = performance.now()
  for (let i = 1; i <= 5; i++) {
    if (i === 5) {
      pgT = performance.now() - pgT
      await pg.unlock('foo')
    } else {
      await sleep(51)
    }
  }
  expect(pgT).toBeGreaterThanOrEqual(199)
  expect(pgT).toBeLessThanOrEqual(301)
  await sleep(50)
  expect(await pg.isLocked('foo')).toBe(true)
  await pg.close()

  const pg2 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool })
  await pg2.connect()
  expect(await pg2.isLocked('foo')).toBe(false)
  expect(await pg2.lock('foo')).toBe(true)
  expect(await pg2.lock('bar')).toBe(true)
  expect((await pg2.listLocks()).sort()).toEqual(['bar', 'foo'])
  expect(await pg2.unlockAll()).toBe(2)
  expect(await pg2.listLocks()).toEqual([])
  expect(await pg2.unlockAll()).toBe(0)
  await pg2.close()

  await pgC.drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  expect(await d1.lock('foo')).toBe(true)
  expect(await d1.isLocked('foo')).toBe(true)
  expect(await d1.isLocked('bar')).toBe(false)
  expect(await d1.unlock('foo')).toBe(true)
  expect(await d1.unlock('bar')).toBe(false)
  expect(await d1.isLocked('foo')).toBe(false)
  expect(await d1.lock('foo')).toBe(true)
  await d1.close()

  const d2 = new Database({ driver: db })
  await d2.connect()
  expect(await d2.isLocked('foo')).toBe(false)
  expect(await d2.lock('foo')).toBe(true)
  expect(await d2.lock('bar')).toBe(true)
  expect((await d2.listLocks()).sort()).toEqual(['bar', 'foo'])
  expect(await d2.unlockAll()).toBe(2)
  expect(await d2.listLocks()).toEqual([])
  expect(await d2.unlockAll()).toBe(0)
  await d2.close()

  await mf.dispose()
})
