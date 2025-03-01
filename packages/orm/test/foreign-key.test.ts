import { expect, test } from 'vitest'
import { Database } from '../src'
import { createMiniflare, sqliteConnectionString } from './utils'

test('foreign key integrity in sqlite', async () => {
  const sqlite = new Database({ driver: sqliteConnectionString('foreign_key_integrity') })
  await sqlite.connect()
  await sqlite.createTable('Foo')
  await sqlite.createTable('Bar')
  await sqlite.createColumn('Foo', 'bar', 'bigint', false)
  await sqlite.exec('insert into "Bar" default values')
  await sqlite.exec('insert into "Foo" (bar) values (1)')
  await sqlite.createForeignKey('Foo', 'bar', 'Bar', 'id')
  expect(await sqlite.exec('select bar from "Foo"')).toEqual([{ bar: 1 }])

  await sqlite.renameTable('Foo', 'Foo2')
  await sqlite.renameTable('Bar', 'Bar2')
  expect(await sqlite.exec('select bar from "Foo2"')).toEqual([{ bar: 1 }])
  expect(await sqlite.listForeignKeys('Foo2')).toEqual(['FK_Foo__bar'])

  await sqlite.exec('delete from "Bar2"')
  expect(await sqlite.exec('select bar from "Foo2"')).toEqual([])

  await sqlite.exec('insert into "Bar2" default values')
  await sqlite.exec('insert into "Foo2" (bar) values (2)')
  await sqlite.exec('insert into "Foo2" (bar) values (2)')
  await expect(() => sqlite.exec('insert into "Foo2" (bar) values (1)')).rejects.toThrow()
  expect(await sqlite.exec('select bar from "Foo2"')).toEqual([{ bar: 2 }, { bar: 2 }])

  await sqlite.exec('delete from "Bar2"')
  expect(await sqlite.exec('select bar from "Foo2"')).toEqual([])

  await sqlite.exec('insert into "Bar2" default values')
  await sqlite.exec('insert into "Foo2" (bar) values (3)')
  await sqlite.dropForeignKey('Foo2', 'FK_Foo__bar')
  expect(await sqlite.listForeignKeys('Foo2')).toEqual([])
  await sqlite.exec('insert into "Foo2" (bar) values (4)')
  expect(await sqlite.exec('select bar from "Foo2"')).toEqual([{ bar: 3 }, { bar: 4 }])

  await expect(() => sqlite.createForeignKey('Foo2', 'bar', 'Bar2', 'id')).rejects.toThrow()
  expect(await sqlite.exec('select bar from "Foo2"')).toEqual([{ bar: 3 }, { bar: 4 }])
  await sqlite.exec('delete from "Foo2" where bar = 4')
  expect(await sqlite.createForeignKey('Foo2', 'bar', 'Bar2', 'id')).toBeUndefined()

  await sqlite.close()
})

test('foreign keys + indexes in sqlite', async () => {
  const sqlite = new Database({ driver: sqliteConnectionString('foreign_keys_and_indexes') })
  await sqlite.connect()
  await sqlite.createTable('Foo')
  await sqlite.createTable('Bar')
  await sqlite.createColumn('Foo', 'bar', 'bigint', false)
  await sqlite.createIndex('Foo', ['bar'])
  expect(await sqlite.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  await sqlite.createForeignKey('Foo', 'bar', 'Bar', 'id')
  expect(await sqlite.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  await sqlite.dropForeignKey('Foo', 'FK_Foo__bar')
  expect(await sqlite.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  await sqlite.close()
})

test('foreign key integrity in d1', async () => {
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  await d1.createTable('Foo')
  await d1.createTable('Bar')
  await d1.createColumn('Foo', 'bar', 'bigint', false)
  await d1.exec('insert into "Bar" default values')
  await d1.exec('insert into "Foo" (bar) values (1)')
  await d1.createForeignKey('Foo', 'bar', 'Bar', 'id')
  expect(await d1.exec('select bar from "Foo"')).toEqual([{ bar: 1 }])

  await d1.renameTable('Foo', 'Foo2')
  await d1.renameTable('Bar', 'Bar2')
  expect(await d1.exec('select bar from "Foo2"')).toEqual([{ bar: 1 }])
  expect(await d1.listForeignKeys('Foo2')).toEqual(['FK_Foo__bar'])

  await d1.exec('delete from "Bar2"')
  expect(await d1.exec('select bar from "Foo2"')).toEqual([])

  await d1.exec('insert into "Bar2" default values')
  await d1.exec('insert into "Foo2" (bar) values (2)')
  await d1.exec('insert into "Foo2" (bar) values (2)')
  await expect(() => d1.exec('insert into "Foo2" (bar) values (1)')).rejects.toThrow()
  expect(await d1.exec('select bar from "Foo2"')).toEqual([{ bar: 2 }, { bar: 2 }])

  await d1.exec('delete from "Bar2"')
  expect(await d1.exec('select bar from "Foo2"')).toEqual([])

  await d1.exec('insert into "Bar2" default values')
  await d1.exec('insert into "Foo2" (bar) values (3)')
  await d1.dropForeignKey('Foo2', 'FK_Foo__bar')
  expect(await d1.listForeignKeys('Foo2')).toEqual([])
  await d1.exec('insert into "Foo2" (bar) values (4)')
  expect(await d1.exec('select bar from "Foo2"')).toEqual([{ bar: 3 }, { bar: 4 }])

  await expect(() => d1.createForeignKey('Foo2', 'bar', 'Bar2', 'id')).rejects.toThrow()
  expect(await d1.exec('select bar from "Foo2"')).toEqual([{ bar: 3 }, { bar: 4 }])
  await d1.exec('delete from "Foo2" where bar = 4')
  expect(await d1.createForeignKey('Foo2', 'bar', 'Bar2', 'id')).toBeUndefined()

  await d1.close()
  await mf.dispose()
})

test('foreign keys + indexes in d1', async () => {
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db })
  await d1.connect()
  await d1.createTable('Foo')
  await d1.createTable('Bar')
  await d1.createColumn('Foo', 'bar', 'bigint', false)
  await d1.createIndex('Foo', ['bar'])
  expect(await d1.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  await d1.createForeignKey('Foo', 'bar', 'Bar', 'id')
  expect(await d1.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  await d1.dropForeignKey('Foo', 'FK_Foo__bar')
  expect(await d1.listIndexes('Foo')).toEqual(['IX_Foo__bar'])
  await d1.close()
  await mf.dispose()
})
