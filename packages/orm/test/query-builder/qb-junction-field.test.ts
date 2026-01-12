import { describe, expect, test } from 'vitest'
import {
  Collection,
  Database,
  emailValidator,
  Field,
  junctionFieldModel,
  textFieldModel,
  uniqueValidator,
} from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

const collections = {
  Events: new Collection({
    fields: {
      title: new Field({
        model: textFieldModel(),
        options: {},
        required: true,
      }),
      categories: new Field({
        model: junctionFieldModel('Categories'),
        options: {},
      }),
      attendees: new Field({
        model: junctionFieldModel('Users', 'events'),
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
        model: junctionFieldModel('Events', 'attendees'),
        options: {},
      }),
    },
    indexes: [{ fields: ['email'], unique: true }],
  }),
}

describe('junction field', () => {
  test('sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_junction_field')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          ...collections,
          Events: {
            ...collections.Events,
            fields: {
              ...collections.Events.fields,
              categories: new Field({
                model: junctionFieldModel('Categories'),
                options: {},
                required: true,
              }),
              attendees: new Field({
                model: junctionFieldModel('Users', 'events'),
                options: {
                  minItems: 2,
                  maxItems: 2,
                },
              }),
            },
          },
        },
      })

      await db.connect()
      const qb = db.queryBuilder()

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

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Concert', categories: ['1.0'], attendees: ['01', 2] }])
          .returning(['categories', 'attendees'])
          .run(),
      ).toEqual(qbo([{ categories: [1], attendees: [1, 2] }]))

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', attendees: [1, 2] } as any])
          .run(),
      ).toEqual(qbe([{ categories: 'This field is required' }]))

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', categories: [], attendees: [1, 2] }])
          .run(),
      ).toEqual(qbe([{ categories: 'This field must contain at least one item' }]))

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', categories: null, attendees: [1, 2] }])
          .run(),
      ).toEqual(qbe([{ categories: 'This field is not nullable' }]))

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', categories: {} as any, attendees: [1, 2] }])
          .run(),
      ).toEqual(qbe([{ categories: 'The value must be an array' }]))

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', categories: [0], attendees: [1, 2] }])
          .run(),
      ).toEqual(
        qbe([
          {
            'categories.0': 'The value must be a positive integer',
            'categories': 'This field contains items of the wrong type',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', categories: [1, 1], attendees: [1, 2] }])
          .run(),
      ).toEqual(
        qbe([
          {
            'categories.1': 'The value must be unique',
            'categories': 'Each item in this field must be unique',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Events')
          .values([{ title: 'Event 1', categories: [1, 2], attendees: [1] }])
          .run(),
      ).toEqual(qbe([{ attendees: 'This field must contain exactly 2 items' }]))

      await db.close()
      await close?.()
    }
  })

  test('query builder methods', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_junction_field_2')) {
      const db = new Database({ driver, PGPool, collections })

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

      // Remove Concert 4
      expect(
        await qb.deleteFrom('Events').where('title', '=', 'Concert 4').returning(['title', 'attendees']).run(),
      ).toEqual(qbo([{ title: 'Concert 4', attendees: [] }]))
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

      // Check inverse relation from Users side
      expect(await qb.selectFrom('Users').select('events').where('email', '=', 'user1@example.com').all()).toEqual(
        qbo([{ events: [1, 2, 3] }]),
      )
      expect(await qb.selectFrom('Users').select('events').where('email', '=', 'user2@example.com').all()).toEqual(
        qbo([{ events: [2, 3] }]),
      )
      expect(await qb.selectFrom('Users').select('events').where('email', '=', 'user3@example.com').all()).toEqual(
        qbo([{ events: [3] }]),
      )

      await db.close()
      await close?.()
    }
  })
})
