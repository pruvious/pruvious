import { describe, expect, test } from 'vitest'
import { arrayFieldModel, Collection, Database, Field, uniqueValidator } from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

describe('array field', () => {
  test('basic sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_sanitization_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Required: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel(),
                options: {},
                required: true,
              }),
            },
          }),
          NonNullable: new Collection({
            fields: {
              bar: new Field({
                model: arrayFieldModel(),
                options: {},
                required: true,
                nullable: false,
              }),
            },
          }),
          AllowEmptyArray: new Collection({
            fields: {
              baz: new Field({
                model: arrayFieldModel(),
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
          .values({ foo: ['foo'] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: ['foo'] }]))

      expect(await qb.insertInto('Required').values({ foo: null }).returning('foo').run()).toEqual(qbo([{ foo: null }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: JSON.stringify(['foo']) as any })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: ['foo'] }]))

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
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_items_type_casting')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              strings: new Field({ model: arrayFieldModel('string'), options: {} }),
              numbers: new Field({ model: arrayFieldModel('number'), options: {} }),
              booleans: new Field({ model: arrayFieldModel('boolean'), options: {} }),
              nulls: new Field({ model: arrayFieldModel('null'), options: {} }),
              stringsAndNumbers: new Field({ model: arrayFieldModel(['string', 'number']), options: {} }),
              stringsNumbersAndNulls: new Field({ model: arrayFieldModel(['string', 'number', 'null']), options: {} }),
              stringsAndBooleans: new Field({ model: arrayFieldModel(['string', 'boolean']), options: {} }),
              all: new Field({ model: arrayFieldModel(['boolean', 'null', 'number', 'string']), options: {} }),
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
          .values({ booleans: [1, 'no', true, false] })
          .returning('booleans')
          .run(),
      ).toEqual(qbo([{ booleans: [true, false, true, false] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ nulls: [null] })
          .returning('nulls')
          .run(),
      ).toEqual(qbo([{ nulls: [null] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsAndNumbers: [1, 'foo', '2', ''] })
          .returning('stringsAndNumbers')
          .run(),
      ).toEqual(qbo([{ stringsAndNumbers: [1, 'foo', '2', ''] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsNumbersAndNulls: [1, 'foo', '2', '', null] })
          .returning('stringsNumbersAndNulls')
          .run(),
      ).toEqual(qbo([{ stringsNumbersAndNulls: [1, 'foo', '2', '', null] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsAndBooleans: ['t', '0', '', true, false] })
          .returning('stringsAndBooleans')
          .run(),
      ).toEqual(qbo([{ stringsAndBooleans: ['t', '0', '', true, false] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ all: [1, 'foo', '2', '', null, true, false] })
          .returning('all')
          .run(),
      ).toEqual(qbo([{ all: [1, 'foo', '2', '', null, true, false] }]))

      await db.close()
      await close?.()
    }
  })

  test('array items type validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_items_type_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              strings: new Field({ model: arrayFieldModel('string'), options: {} }),
              numbers: new Field({ model: arrayFieldModel('number'), options: {} }),
              booleans: new Field({ model: arrayFieldModel('boolean'), options: {} }),
              nulls: new Field({ model: arrayFieldModel('null'), options: {} }),
              stringsAndNumbers: new Field({ model: arrayFieldModel(['string', 'number']), options: {} }),
              stringsNumbersAndNulls: new Field({ model: arrayFieldModel(['string', 'number', 'null']), options: {} }),
              stringsAndBooleans: new Field({ model: arrayFieldModel(['string', 'boolean']), options: {} }),
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
          .values({ booleans: ['tt', null, 11] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'booleans': 'This field contains items of the wrong type',
            'booleans.0': 'The value must be a boolean',
            'booleans.1': 'The value must be a boolean',
            'booleans.2': 'The value must be a boolean',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ nulls: ['foo', 0, true] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'nulls': 'This field contains items of the wrong type',
            'nulls.0': 'The value must be `null`',
            'nulls.1': 'The value must be `null`',
            'nulls.2': 'The value must be `null`',
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

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsNumbersAndNulls: [true, false] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'stringsNumbersAndNulls': 'This field contains items of the wrong type',
            'stringsNumbersAndNulls.0': 'The value must be one of the specified types: string, number, null',
            'stringsNumbersAndNulls.1': 'The value must be one of the specified types: string, number, null',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ stringsAndBooleans: [1, 0, null] as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'stringsAndBooleans': 'This field contains items of the wrong type',
            'stringsAndBooleans.0': 'The value must be one of the specified types: string, boolean',
            'stringsAndBooleans.1': 'The value must be one of the specified types: string, boolean',
            'stringsAndBooleans.2': 'The value must be one of the specified types: string, boolean',
          },
        ]),
      )

      await db.close()
      await close?.()
    }
  })

  test('array items unique sanitization', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_unique_items_sanitization')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel(['boolean', 'null', 'number', 'string']),
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
          .values({ foo: ['1', 1, true, true] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: ['1', 1, true] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [null, null] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [null] }]))

      await db.close()
      await close?.()
    }
  })

  test('array items unique validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_unique_items_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel(['boolean', 'null', 'number', 'string']),
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

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['1', 1, true, true] })
          .run(),
      ).toEqual(qbe([{ 'foo': 'Each item in this field must be unique', 'foo.3': 'The value must be unique' }]))

      await db.close()
      await close?.()
    }
  })

  test('unique arrays', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_unique_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel(),
                options: {},
                validators: [uniqueValidator()],
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
          .values({ foo: [1, 2, 3] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [3, 2, 1] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1, 2, 3] })
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be unique' }]))

      await db.close()
      await close?.()
    }
  })

  test('array items min/max', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_min_max_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel(),
                options: { minItems: 2, maxItems: 4 },
              }),
            },
          }),
          Bar: new Collection({
            fields: {
              bar: new Field({
                model: arrayFieldModel(),
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
          .values({ foo: [''] })
          .run(),
      ).toEqual(qbe([{ foo: 'This field must contain at least 2 items' }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['', ''] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['', '', '', ''] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: ['', '', '', '', ''] })
          .run(),
      ).toEqual(qbe([{ foo: 'This field must contain at most 4 items' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({ bar: ['', ''] })
          .run(),
      ).toEqual(qbe([{ bar: 'This field must contain exactly 1 item' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({ bar: [''] })
          .run(),
      ).toEqual(qbo(1))

      await db.close()
      await close?.()
    }
  })

  test('array allow values', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_allow_values_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel('number'),
                options: { allowValues: [1, 2, 3] },
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
          .values({ foo: [1, 2, 3] })
          .run(),
      ).toEqual(qbo(1))

      expect(await qb.insertInto('Foo').values({ foo: [] }).run()).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1, 2, 3, 4] })
          .run(),
      ).toEqual(qbe([{ 'foo': 'This field contains invalid values', 'foo.3': 'Invalid value' }]))

      await db.close()
      await close?.()
    }
  })

  test('array deny values', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_array_field_deny_values_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: arrayFieldModel('number'),
                options: { denyValues: [1, 2, 3] },
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
          .values({ foo: [4, 5, 6] })
          .run(),
      ).toEqual(qbo(1))

      expect(await qb.insertInto('Foo').values({ foo: [] }).run()).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [1, 4, 2] })
          .run(),
      ).toEqual(
        qbe([
          {
            'foo': 'This field contains invalid values',
            'foo.0': 'Invalid value',
            'foo.2': 'Invalid value',
          },
        ]),
      )

      await db.close()
      await close?.()
    }
  })
})
