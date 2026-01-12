import { describe, expect, test } from 'vitest'
import {
  Collection,
  Database,
  emailValidator,
  Field,
  matrixFieldModel,
  textFieldModel,
  uniqueValidator,
} from '../../src'
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

  test('query builder methods', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_junction_field_2')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Events: new Collection({
            fields: {
              title: new Field({
                model: textFieldModel(),
                options: {},
                required: true,
              }),
              categories: new Field({
                model: matrixFieldModel(),
                options: {},
              }),
              attendees: new Field({
                model: matrixFieldModel(),
                options: {},
              }),
            },
          }),
          Categories: new Collection({
            fields: {
              name: new Field({
                model: textFieldModel(),
                options: {},
                required: true,
                validators: [uniqueValidator()],
              }),
            },
            indexes: [{ fields: ['name'], unique: true }],
          }),
          Users: new Collection({
            fields: {
              email: new Field({
                model: textFieldModel(),
                options: {},
                required: true,
                validators: [emailValidator(), uniqueValidator()],
              }),
              events: new Field({
                model: matrixFieldModel(),
                options: {},
              }),
            },
            indexes: [{ fields: ['email'], unique: true }],
          }),
        },
      })

      await db.connect()
      const qb = db.queryBuilder()

      // Insert categories and users
      expect(
        await qb
          .insertInto('Categories')
          .values([{ name: 'Music' }, { name: 'Art' }, { name: 'Tech' }])
          .run(),
      ).toEqual(qbo(3))
      expect(
        await qb
          .insertInto('Users')
          .values([{ email: 'user1@example.com' }, { email: 'user2@example.com' }, { email: 'user3@example.com' }])
          .run(),
      ).toEqual(qbo(3))

      // Insert Concert events
      expect(
        await qb
          .insertInto('Events')
          .values([
            { title: 'Concert 1', categories: [1], attendees: [1] },
            { title: 'Concert 2', categories: [1], attendees: [1, 2] },
            { title: 'Concert 3', categories: [1], attendees: [1, 2, 3] },
            { title: 'Concert 4', categories: [1], attendees: [] },
          ])
          .returning(['categories', 'attendees'])
          .run(),
      ).toEqual(
        qbo([
          { categories: [1], attendees: [1] },
          { categories: [1], attendees: [1, 2] },
          { categories: [1], attendees: [1, 2, 3] },
          { categories: [1], attendees: [] },
        ]),
      )

      // Select concerts with user1 as attendee
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includes', 1)
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 3', attendees: [1, 2, 3] },
        ]),
      )

      // Select concerts with user2 as attendee
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includes', 2)
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 3', attendees: [1, 2, 3] },
        ]),
      )

      // Select concerts with user3 as attendee
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includes', 3)
          .orderBy('title')
          .all(),
      ).toEqual(qbo([{ title: 'Concert 3', attendees: [1, 2, 3] }]))

      // Select concerts with user1 and user2 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includes', [1, 2])
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 3', attendees: [1, 2, 3] },
        ]),
      )

      // Select concerts with user2 and user3 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includes', [2, 3])
          .orderBy('title')
          .all(),
      ).toEqual(qbo([{ title: 'Concert 3', attendees: [1, 2, 3] }]))

      // Select concerts with user1 or user2 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includesAny', [1, 2])
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 3', attendees: [1, 2, 3] },
        ]),
      )

      // Select concerts with user2 or user3 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'includesAny', [2, 3])
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 3', attendees: [1, 2, 3] },
        ]),
      )

      // Select concerts without user1 as attendee
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludes', 1)
          .orderBy('title')
          .all(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [] }]))

      // Select concerts without user2 as attendee
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludes', 2)
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 4', attendees: [] },
        ]),
      )

      // Select concerts without user3 as attendee
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludes', 3)
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 4', attendees: [] },
        ]),
      )

      // Select concerts without user1 and user2 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludes', [1, 2])
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 4', attendees: [] },
        ]),
      )

      // Select concerts without user2 and user3 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludes', [2, 3])
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 4', attendees: [] },
        ]),
      )

      // Select concerts without user1 or user2 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludesAny', [1, 2])
          .orderBy('title')
          .all(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [] }]))

      // Select concerts without user2 or user3 as attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', 'excludesAny', [2, 3])
          .orderBy('title')
          .all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 4', attendees: [] },
        ]),
      )

      // Select concerts with less than one attendee
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('attendees', '<', 1).orderBy('title').all(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [] }]))

      // Select concerts with more than two attendees
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('attendees', '>', 2).orderBy('title').all(),
      ).toEqual(qbo([{ title: 'Concert 3', attendees: [1, 2, 3] }]))

      // Select concerts with exactly two attendees
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'attendees'])
          .where('attendees', '>=', 2)
          .where('attendees', '<=', 2)
          .orderBy('title')
          .all(),
      ).toEqual(qbo([{ title: 'Concert 2', attendees: [1, 2] }]))

      // Select concerts with one or more attendees
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('attendees', '>=', 1).orderBy('title').all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 3', attendees: [1, 2, 3] },
        ]),
      )

      // Select concerts with less than or equal to two attendees
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('attendees', '<=', 2).orderBy('title').all(),
      ).toEqual(
        qbo([
          { title: 'Concert 1', attendees: [1] },
          { title: 'Concert 2', attendees: [1, 2] },
          { title: 'Concert 4', attendees: [] },
        ]),
      )

      // Set user3 as attendees of Concert 4
      expect(
        await qb
          .update('Events')
          .set({ attendees: [3] })
          .where('title', '=', 'Concert 4')
          .returning(['title', 'attendees'])
          .run(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [3] }]))
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('title', '=', 'Concert 4').all(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [3] }]))

      // Set user1 and user2 as attendees of Concert 4
      expect(
        await qb
          .update('Events')
          .set({ attendees: [1, 2] })
          .where('title', '=', 'Concert 4')
          .run(),
      ).toEqual(qbo(1))
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('title', '=', 'Concert 4').all(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [1, 2] }]))

      // Set user2 and user1 (reversed order) as attendees of Concert 4
      expect(
        await qb
          .update('Events')
          .set({ attendees: [2, 1] })
          .where('title', '=', 'Concert 4')
          .run(),
      ).toEqual(qbo(1))
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('title', '=', 'Concert 4').all(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [2, 1] }]))

      // Remove Concert 4
      expect(
        await qb.deleteFrom('Events').where('title', '=', 'Concert 4').returning(['title', 'attendees']).run(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [2, 1] }]))
      expect(
        await qb.selectFrom('Events').select(['title', 'attendees']).where('title', '=', 'Concert 4').all(),
      ).toEqual(qbo([]))

      // Re-add Concert 4
      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Concert 4', categories: [1] }])
          .run(),
      ).toEqual(qbo(1))
      expect(
        await qb
          .selectFrom('Events')
          .select(['title', 'categories', 'attendees'])
          .where('title', '=', 'Concert 4')
          .all(),
      ).toEqual(qbo([{ title: 'Concert 4', categories: [1], attendees: [] }]))

      await db.close()
      await close?.()
    }
  })
})
