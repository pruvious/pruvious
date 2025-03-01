import { describe, expect, test } from 'vitest'
import { Collection, Database, Field, matrixFieldModel } from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

describe('matrix field', () => {
  test('basic sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_matrix_field_sanitization_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Required: new Collection({
            fields: {
              foo: new Field({
                model: matrixFieldModel(),
                options: {},
                required: true,
              }),
            },
          }),
          NonNullable: new Collection({
            fields: {
              bar: new Field({
                model: matrixFieldModel(),
                options: {},
                required: true,
                nullable: false,
              }),
            },
          }),
          AllowEmptyArray: new Collection({
            fields: {
              baz: new Field({
                model: matrixFieldModel(),
                options: {
                  allowEmptyArray: true,
                },
              }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Required')
          .values({} as any)
          .run(),
      ).toEqual(qbe([{ foo: 'This field is required' }]))

      expect(await qb.insertInto('Required').values({ foo: [] }).run()).toEqual(
        qbe([{ foo: 'This field must contain at least one item' }]),
      )

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: {} as any })
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be an array or `null`' }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: 'foo' as any })
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be an array or `null`' }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: [1] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [1] }]))

      expect(await qb.insertInto('Required').values({ foo: null }).returning('foo').run()).toEqual(qbo([{ foo: null }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: JSON.stringify([1]) as any })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [1] }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: JSON.stringify(null) as any })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: null }]))

      expect(
        await qb
          .insertInto('NonNullable')
          .values({ bar: null as any })
          .run(),
      ).toEqual(qbe([{ bar: 'This field is not nullable' }]))

      expect(
        await qb
          .insertInto('NonNullable')
          .values({ bar: true as any })
          .run(),
      ).toEqual(qbe([{ bar: 'The value must be an array' }]))

      expect(
        await qb
          .update('NonNullable')
          .set({ bar: null as any })
          .run(),
      ).toEqual(qbe({ bar: 'This field is not nullable' }))

      expect(await qb.insertInto('AllowEmptyArray').values({ baz: [] }).returning('baz').run()).toEqual(
        qbo([{ baz: [] }]),
      )

      await db.close()
      await close?.()
    }
  })

  test('array items type casting', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_matrix_field_items_type_casting')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              strings: new Field({ model: matrixFieldModel('string'), options: {} }),
              numbers: new Field({ model: matrixFieldModel('number'), options: {} }),
              stringsAndNumbers: new Field({ model: matrixFieldModel(['string', 'number']), options: {} }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Foo')
          .values({ strings: ['foo', 1] })
          .returning('strings')
          .run(),
      ).toEqual(qbo([{ strings: ['foo', '1'] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ numbers: ['1', 2] })
          .returning('numbers')
          .run(),
      ).toEqual(qbo([{ numbers: [1, 2] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsAndNumbers: [1, 'foo', '2', ''] })
          .returning('stringsAndNumbers')
          .run(),
      ).toEqual(qbo([{ stringsAndNumbers: [1, 'foo', '2', ''] }]))

      await db.close()
      await close?.()
    }
  })

  test('array items type validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_matrix_field_items_type_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              strings: new Field({ model: matrixFieldModel('string'), options: {} }),
              numbers: new Field({ model: matrixFieldModel('number'), options: {} }),
              stringsAndNumbers: new Field({ model: matrixFieldModel(['string', 'number']), options: {} }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Foo')
          .values({ strings: [true, null] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'strings': 'This field contains items of the wrong type',
            'strings.0': 'The value must be a string',
            'strings.1': 'The value must be a string',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ numbers: ['foo', null, true] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'numbers': 'This field contains items of the wrong type',
            'numbers.0': 'The value must be a number',
            'numbers.1': 'The value must be a number',
            'numbers.2': 'The value must be a number',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsAndNumbers: [true, null, false] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'stringsAndNumbers': 'This field contains items of the wrong type',
            'stringsAndNumbers.0': 'The value must be one of the specified types: string, number',
            'stringsAndNumbers.1': 'The value must be one of the specified types: string, number',
            'stringsAndNumbers.2': 'The value must be one of the specified types: string, number',
          },
        ]),
      )

      await db.close()
      await close?.()
    }
  })

  test('array items unique sanitization', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_matrix_field_unique_items_sanitization')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: matrixFieldModel(['number', 'string']),
                options: { deduplicateItems: true },
              }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['foo', 'foo'] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: ['foo'] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['1', 1] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: ['1', 1] }]))

      await db.close()
      await close?.()
    }
  })

  test('array items unique validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_matrix_field_unique_items_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: matrixFieldModel(['number', 'string']),
                options: { enforceUniqueItems: true },
              }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['foo', 'foo'] })
          .run(),
      ).toEqual(qbe([{ 'foo': 'Each item in this field must be unique', 'foo.1': 'The value must be unique' }]))

      await db.close()
      await close?.()
    }
  })

  test('array items min/max', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_matrix_field_min_max_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: matrixFieldModel(),
                options: { minItems: 2, maxItems: 4 },
              }),
            },
          }),
          Bar: new Collection({
            fields: {
              bar: new Field({
                model: matrixFieldModel(),
                options: { minItems: 1, maxItems: 1 },
              }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1] })
          .run(),
      ).toEqual(qbe([{ foo: 'This field must contain at least 2 items' }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1, 1] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1, 1, 1, 1] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1, 1, 1, 1, 1] })
          .run(),
      ).toEqual(qbe([{ foo: 'This field must contain at most 4 items' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({ bar: [1, 1] })
          .run(),
      ).toEqual(qbe([{ bar: 'This field must contain exactly 1 item' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({ bar: [1] })
          .run(),
      ).toEqual(qbo(1))

      await db.close()
      await close?.()
    }
  })
})
