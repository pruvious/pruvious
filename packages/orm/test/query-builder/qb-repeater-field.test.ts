import { describe, expect, test } from 'vitest'
import {
  bigIntFieldModel,
  Collection,
  Database,
  Field,
  numberFieldModel,
  repeaterFieldModel,
  textFieldModel,
  uniqueValidator,
  urlValidator,
} from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

describe('repeater field', () => {
  test('basic sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_field_sanitization_validation')) {
      const subfields = {
        label: new Field({ model: textFieldModel(), options: {} }),
        link: new Field({ model: textFieldModel(), nullable: false, options: {} }),
      }
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Required: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel(subfields),
                options: {},
                required: true,
              }),
            },
          }),
          NonNullable: new Collection({
            fields: {
              bar: new Field({
                model: repeaterFieldModel(subfields),
                options: {},
                required: true,
                nullable: false,
              }),
            },
          }),
          AllowEmptyArray: new Collection({
            fields: {
              baz: new Field({
                model: repeaterFieldModel(subfields),
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
          .values({ foo: ['foo' as any] })
          .run(),
      ).toEqual(qbe([{ foo: 'All items in the array must be of type `object`' }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: [{ label: null, link: '' }] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [{ label: null, link: '' }] }]))

      expect(await qb.insertInto('Required').values({ foo: null }).returning('foo').run()).toEqual(qbo([{ foo: null }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: JSON.stringify([{ label: null, link: '' }]) as any })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [{ label: null, link: '' }] }]))

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

  test('subfields sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_subfield_sanitization_validation')) {
      const subfields = {
        label: new Field({
          model: textFieldModel(),
          required: true,
          nullable: false,
          options: {},
          validators: [
            (value) => {
              if (value === 'Voldemort') {
                throw new Error('You know who')
              }
            },
          ],
        }),
        link: new Field({
          model: textFieldModel(),
          required: true,
          nullable: false,
          options: {},
          validators: [urlValidator('The value must be a valid URL')],
        }),
        rel: new Field({
          model: repeaterFieldModel({
            value: new Field({
              model: textFieldModel(),
              required: true,
              nullable: false,
              options: {},
              validators: [
                (value) => {
                  const allowedRelValues = [
                    'alternate',
                    'author',
                    'bookmark',
                    'external',
                    'help',
                    'license',
                    'next',
                    'nofollow',
                    'noreferrer',
                    'noopener',
                    'prev',
                    'search',
                    'tag',
                  ]

                  if (!allowedRelValues.includes(value)) {
                    throw new Error('Invalid `rel` value')
                  }
                },
              ],
            }),
          }),
          nullable: false,
          options: {},
        }),
      }
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel(subfields),
                options: {},
                required: true,
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
          .values({ foo: [{ label: 'Foo', link: 'bar', rel: [] }] })
          .run(),
      ).toEqual(qbe([{ 'foo.0.link': 'The value must be a valid URL' }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{ label: null, link: null, rel: null } as any] })
          .run(),
      ).toEqual(
        qbe([
          {
            'foo.0.label': 'This field is not nullable',
            'foo.0.link': 'This field is not nullable',
            'foo.0.rel': 'This field is not nullable',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{} as any] })
          .run(),
      ).toEqual(qbe([{ 'foo.0.label': 'This field is required', 'foo.0.link': 'This field is required' }]))
      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{ label: '', link: '' }] })
          .run(),
      ).toEqual(
        qbe([{ 'foo.0.label': 'This field cannot be left empty', 'foo.0.link': 'This field cannot be left empty' }]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values([
            {
              foo: [
                {
                  label: ' Foo ',
                  link: ' http://pruvious.com ',
                  rel: [{ value: ' nofollow ', bar: 'BAR' }],
                  baz: 'BAZ',
                },
              ],
            },
            { foo: [{ label: 123, link: ' http://pruvious.com ', baz: 'BAZ' }] },
          ])
          .returning('foo')
          .run(),
      ).toEqual(
        qbo([
          { foo: [{ label: 'Foo', link: 'http://pruvious.com', rel: [{ value: 'nofollow' }] }] },
          { foo: [{ label: '123', link: 'http://pruvious.com', rel: [] }] },
        ]),
      )

      expect(
        await qb
          .update('Foo')
          .set({
            foo: [{ label: 321, link: 'http://pruvious.com' }, { link: 'http://pruvious.com' } as any],
          })
          .run(),
      ).toEqual(qbe({ 'foo.1.label': 'This field is required' }))

      expect(
        await qb
          .update('Foo')
          .set({
            foo: [{ label: 321, link: 'http://pruvious.com' }],
          })
          .where('id', '=', 1)
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [{ label: '321', link: 'http://pruvious.com', rel: [] }] }]))

      expect(
        await qb
          .selectFrom('Foo')
          .where('foo', '=', JSON.stringify([{ label: '321', link: 'http://pruvious.com', rel: [] }]))
          .count(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .selectFrom('Foo')
          .where('foo', '=', JSON.stringify([{ label: '321', rel: [], link: 'http://pruvious.com' }]))
          .count(),
      ).toEqual(qbo(0))

      await db.close()
      await close?.()
    }
  })

  test('subfields conditional logic', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_subfield_conditional_logic')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel({
                  req: new Field({
                    model: textFieldModel(),
                    required: true,
                    nullable: false,
                    options: { allowEmptyString: true },
                  }),
                  dep: new Field({
                    model: textFieldModel(),
                    required: true,
                    nullable: false,
                    options: {},
                    conditionalLogic: { req: { '!=': '' } },
                  }),
                }),
                options: {},
                required: true,
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
          .values({ foo: [{} as any] })
          .run(),
      ).toEqual(
        qbe([
          {
            'foo.0.req': 'This field is required',
            'foo.0.dep': 'This field requires `foo.0.req` to be present in the input data',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{ req: '' }] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .update('Foo')
          .set({ foo: [{} as any] })
          .run(),
      ).toEqual(
        qbe({
          'foo.0.req': 'This field is required',
          'foo.0.dep': 'This field requires `foo.0.req` to be present in the input data',
        }),
      )

      await db.close()
      await close?.()
    }
  })

  test('auto-generated subfields', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_auto_generated_subfields')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel({
                  one: new Field({
                    model: textFieldModel(),
                    required: true,
                    nullable: false,
                    autoGenerated: true,
                    options: { allowEmptyString: true },
                    inputFilters: { beforeInputSanitization: () => 1 },
                  }),
                  two: new Field({
                    model: numberFieldModel(),
                    required: true,
                    nullable: false,
                    autoGenerated: true,
                    options: {},
                    inputFilters: { beforeInputValidation: () => 2 },
                  }),
                }),
                options: {},
                required: true,
              }),
            },
          }),
          Bar: new Collection({
            fields: {
              bar: new Field({
                model: repeaterFieldModel({
                  baz: new Field({
                    model: textFieldModel(),
                    required: true,
                    nullable: false,
                    autoGenerated: true,
                    options: { allowEmptyString: true },
                    inputFilters: { beforeQueryExecution: () => 'BAZ' },
                  }),
                }),
                required: true,
                nullable: false,
                autoGenerated: true,
                options: {},
                inputFilters: { beforeInputValidation: () => [{ baz: 'baz' }] },
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
          .values({ foo: [{}, {}] })
          .returning('foo')
          .run(),
      ).toEqual(
        qbo([
          {
            foo: [
              { one: '1', two: 2 },
              { one: '1', two: 2 },
            ],
          },
        ]),
      )

      expect(await qb.insertInto('Bar').values({}).returning('bar').run()).toEqual(qbo([{ bar: [{ baz: 'BAZ' }] }]))

      await db.close()
      await close?.()
    }
  })

  test('unique subfields', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_unique_subfields')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel({
                  bar: new Field({
                    model: textFieldModel(),
                    options: {},
                    validators: [uniqueValidator()],
                  }),
                }),
                options: {},
                default: null,
                validators: [uniqueValidator()],
              }),
            },
          }),
          Bar: new Collection({
            fields: {
              bar: new Field({
                model: repeaterFieldModel({
                  baz: new Field({
                    model: textFieldModel(),
                    options: {},
                    validators: [uniqueValidator(['baz', 'qux'], 'Duplicate!')],
                  }),
                  qux: new Field({
                    model: numberFieldModel(),
                    options: {},
                  }),
                }),
                options: {},
              }),
            },
          }),
        },
      })

      await db.connect()
      const qb = db.queryBuilder()

      expect(await qb.insertInto('Foo').values([{}, {}]).run()).toEqual(qbo(2))
      expect(
        await qb
          .insertInto('Foo')
          .values([{ foo: [] }, { foo: [] }])
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be unique' }, { foo: 'The value must be unique' }]))
      expect(
        await qb
          .insertInto('Foo')
          .values([{ foo: [{ bar: '1' }] }, { foo: [{ bar: 1 }] }])
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be unique' }, { foo: 'The value must be unique' }]))
      expect(
        await qb
          .insertInto('Foo')
          .values([{ foo: [{ bar: '1' }] }, { foo: [{ bar: '2' }] }])
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [{ bar: '1' }] }, { foo: [{ bar: '2' }] }]))
      expect(
        await qb
          .insertInto('Foo')
          .values([{ foo: [{ bar: '1' }] }, { foo: [{ bar: '2' }] }])
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be unique' }, { foo: 'The value must be unique' }]))

      expect(await qb.insertInto('Foo').values({}).returning('foo').run()).toEqual(qbo([{ foo: null }]))
      expect(await qb.insertInto('Foo').values({}).returning('foo').run()).toEqual(qbo([{ foo: null }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{ bar: '3' }, { bar: 3 }] })
          .run(),
      ).toEqual(qbe([{ 'foo.0.bar': 'The value must be unique', 'foo.1.bar': 'The value must be unique' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({
            bar: [
              { baz: 'A', qux: 4 },
              { qux: 4, baz: 'A' },
            ],
          })
          .run(),
      ).toEqual(qbe([{ 'bar.0.baz': 'Duplicate!', 'bar.1.baz': 'Duplicate!' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({
            bar: [
              { baz: 'A', qux: 4 },
              { qux: 3, baz: 'A' },
            ],
          })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .update('Bar')
          .set({
            bar: [
              { baz: 'A', qux: 4 },
              { qux: 4, baz: 'A' },
            ],
          })
          .run(),
      ).toEqual(qbe({ 'bar.0.baz': 'Duplicate!', 'bar.1.baz': 'Duplicate!' }))

      await db.close()
      await close?.()
    }
  })

  test('repeater items unique sanitization', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_field_unique_items_sanitization')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel({ bar: new Field({ model: textFieldModel(), options: {} }) }),
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
          .values({ foo: [{ bar: 'baz' }, { bar: 'baz' }] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [{ bar: 'baz' }] }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{ bar: 'baz' }, { bar: 'BAZ' }] })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: [{ bar: 'baz' }, { bar: 'BAZ' }] }]))

      await db.close()
      await close?.()
    }
  })

  test('repeater items unique validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_field_unique_items_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel({ bar: new Field({ model: textFieldModel(), options: {} }) }),
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
          .values({ foo: [{ bar: 'baz' }, { bar: 'baz' }] })
          .run(),
      ).toEqual(qbe([{ 'foo': 'Each item in this field must be unique', 'foo.1': 'The value must be unique' }]))

      await db.close()
      await close?.()
    }
  })

  test('repeater items min/max', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_field_min_max_validation')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: repeaterFieldModel({}),
                options: { minItems: 2, maxItems: 4 },
              }),
            },
          }),
          Bar: new Collection({
            fields: {
              bar: new Field({
                model: repeaterFieldModel({}),
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
          .values({ foo: [{}] })
          .run(),
      ).toEqual(qbe([{ foo: 'This field must contain at least 2 items' }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{}, {}] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{}, {}, {}, {}] })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: [{}, {}, {}, {}, {}] })
          .run(),
      ).toEqual(qbe([{ foo: 'This field must contain at most 4 items' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({ bar: [{}, {}] })
          .run(),
      ).toEqual(qbe([{ bar: 'This field must contain exactly 1 item' }]))

      expect(
        await qb
          .insertInto('Bar')
          .values({ bar: [{}] })
          .run(),
      ).toEqual(qbo(1))

      await db.close()
      await close?.()
    }
  })

  test('repeater population', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_repeater_field_min_max_validation')) {
      const Categories = new Collection({
        fields: {
          name: new Field({
            model: textFieldModel(),
            nullable: false,
            options: {},
          }),
        },
      })
      const Roles = new Collection({
        fields: {
          name: new Field({
            model: textFieldModel(),
            options: {},
          }),
          categories: new Field({
            model: repeaterFieldModel({
              category: new Field({
                model: bigIntFieldModel<number, Pick<(typeof Categories)['TPopulatedTypes'], 'name'> | null>(),
                options: {
                  populator: async (value, { context }) => {
                    if (value) {
                      const categories = await context.database
                        .queryBuilder<{ Categories: typeof Categories }>()
                        .selectFrom('Categories')
                        .select('name')
                        .where('id', '=', value)
                        .useCache(context.cache)
                        .first()

                      if (categories.success) {
                        return categories.data
                      }
                    }

                    return null
                  },
                },
              }),
            }),
            options: {},
          }),
        },
      })
      const Users = new Collection({
        fields: {
          roles: new Field({
            model: repeaterFieldModel({
              role: new Field({
                model: bigIntFieldModel<
                  number,
                  Pick<(typeof Roles)['TPopulatedTypes'], 'name' | 'categories'> | null
                >(),
                options: {
                  populator: async (value, { context }) => {
                    if (value) {
                      const role = await context.database
                        .queryBuilder<{ Roles: typeof Roles }>()
                        .selectFrom('Roles')
                        .select(['name', 'categories'])
                        .where('id', '=', value)
                        .populate()
                        .useCache(context.cache)
                        .first()

                      if (role.success) {
                        return role.data
                      }
                    }

                    return null
                  },
                },
              }),
            }),
            options: {},
          }),
        },
      })
      const db = new Database({ driver, PGPool, collections: { Users, Roles, Categories } })
      await db.connect()
      const qb = db.queryBuilder()

      expect(
        await qb
          .insertInto('Categories')
          .values([{ name: 'Category 1' }, { name: 'Category 2' }, { name: 'Category 3' }])
          .run(),
      ).toEqual(qbo(3))

      expect(
        await qb
          .insertInto('Roles')
          .values([{ name: 'Role 1', categories: [{ category: 1 }, { category: 2 }] }])
          .returning('categories')
          .populate()
          .run(),
      ).toEqual(qbo([{ categories: [{ category: { name: 'Category 1' } }, { category: { name: 'Category 2' } }] }]))

      expect(
        await qb
          .insertInto('Users')
          .values([{ roles: [{ role: 1 }] }])
          .returning('roles')
          .populate()
          .run(),
      ).toEqual(
        qbo([
          {
            roles: [
              {
                role: {
                  name: 'Role 1',
                  categories: [{ category: { name: 'Category 1' } }, { category: { name: 'Category 2' } }],
                },
              },
            ],
          },
        ]),
      )

      const a = await qb
        .insertInto('Users')
        .values([{ roles: [{ role: 1 }] }])
        .returning('roles')
        .populate()
        .run()

      await db.close()
      await close?.()
    }
  })
})
