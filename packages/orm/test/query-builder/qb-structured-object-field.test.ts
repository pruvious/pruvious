import { describe, expect, test } from 'vitest'
import {
  bigIntFieldModel,
  Collection,
  Database,
  Field,
  numberFieldModel,
  repeaterFieldModel,
  structuredObjectFieldModel,
  textFieldModel,
  urlValidator,
} from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

describe('structured object field', () => {
  test('basic sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers(
      'qb_structured_object_field_sanitization_validation',
    )) {
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
                model: structuredObjectFieldModel(subfields),
                options: {},
                required: true,
              }),
            },
          }),
          NonNullable: new Collection({
            fields: {
              bar: new Field({
                model: structuredObjectFieldModel(subfields),
                options: {},
                required: true,
                nullable: false,
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

      expect(await qb.insertInto('Required').values({ foo: {} }).returning('foo').run()).toEqual(
        qbo([{ foo: { label: '', link: '' } }]),
      )

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: [] as any })
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be an object or `null`' }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: 'foo' as any })
          .run(),
      ).toEqual(qbe([{ foo: 'The value must be an object or `null`' }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: { label: null, link: '' } })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: { label: null, link: '' } }]))

      expect(await qb.insertInto('Required').values({ foo: null }).returning('foo').run()).toEqual(qbo([{ foo: null }]))

      expect(
        await qb
          .insertInto('Required')
          .values({ foo: JSON.stringify({ label: null, link: '' }) as any })
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: { label: null, link: '' } }]))

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
      ).toEqual(qbe([{ bar: 'The value must be an object' }]))

      expect(
        await qb
          .update('NonNullable')
          .set({ bar: null as any })
          .run(),
      ).toEqual(qbe({ bar: 'This field is not nullable' }))

      await db.close()
      await close?.()
    }
  })

  test('subfields sanitization and validation', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers(
      'qb_structured_object_subfield_sanitization_validation',
    )) {
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
                model: structuredObjectFieldModel(subfields),
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
          .values({ foo: { label: 'Foo', link: 'bar', rel: [] } })
          .run(),
      ).toEqual(qbe([{ 'foo.link': 'The value must be a valid URL' }]))

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: { label: null, link: null, rel: null } as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'foo.label': 'This field is not nullable',
            'foo.link': 'This field is not nullable',
            'foo.rel': 'This field is not nullable',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: {} as any })
          .run(),
      ).toEqual(qbe([{ 'foo.label': 'This field is required', 'foo.link': 'This field is required' }]))
      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: { label: '', link: '' } })
          .run(),
      ).toEqual(
        qbe([{ 'foo.label': 'This field cannot be left empty', 'foo.link': 'This field cannot be left empty' }]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values([
            {
              foo: {
                label: ' Foo ',
                link: ' http://pruvious.com ',
                rel: [{ value: ' nofollow ', bar: 'BAR' }],
                baz: 'BAZ',
              },
            },
            { foo: { label: 123, link: ' http://pruvious.com ', baz: 'BAZ' } },
          ])
          .returning('foo')
          .run(),
      ).toEqual(
        qbo([
          { foo: { label: 'Foo', link: 'http://pruvious.com', rel: [{ value: 'nofollow' }] } },
          { foo: { label: '123', link: 'http://pruvious.com', rel: [] } },
        ]),
      )

      expect(
        await qb
          .update('Foo')
          .set({
            foo: { link: 'http://pruvious.com' } as any,
          })
          .run(),
      ).toEqual(qbe({ 'foo.label': 'This field is required' }))

      expect(
        await qb
          .update('Foo')
          .set({
            foo: { label: 321, link: 'http://pruvious.com' },
          })
          .where('id', '=', 1)
          .returning('foo')
          .run(),
      ).toEqual(qbo([{ foo: { label: '321', link: 'http://pruvious.com', rel: [] } }]))

      expect(
        await qb
          .selectFrom('Foo')
          .where('foo', '=', JSON.stringify({ label: '321', link: 'http://pruvious.com', rel: [] }))
          .count(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .selectFrom('Foo')
          .where('foo', '=', JSON.stringify({ label: '321', rel: [], link: 'http://pruvious.com' }))
          .count(),
      ).toEqual(qbo(0))

      await db.close()
      await close?.()
    }
  })

  test('subfields conditional logic', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_structured_object_subfield_conditional_logic')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: structuredObjectFieldModel({
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
          .values({ foo: {} as any })
          .run(),
      ).toEqual(
        qbe([
          {
            'foo.req': 'This field is required',
            'foo.dep': 'This field requires `foo.req` to be present in the input data',
          },
        ]),
      )

      expect(
        await qb
          .insertInto('Foo')
          .values({ foo: { req: '' } })
          .run(),
      ).toEqual(qbo(1))

      expect(
        await qb
          .update('Foo')
          .set({ foo: {} as any })
          .run(),
      ).toEqual(
        qbe({
          'foo.req': 'This field is required',
          'foo.dep': 'This field requires `foo.req` to be present in the input data',
        }),
      )

      await db.close()
      await close?.()
    }
  })

  test('auto-generated subfields', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_structured_object_auto_generated_subfields')) {
      const db = new Database({
        driver,
        PGPool,
        collections: {
          Foo: new Collection({
            fields: {
              foo: new Field({
                model: structuredObjectFieldModel({
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
                model: structuredObjectFieldModel({
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
                inputFilters: { beforeInputValidation: () => ({ baz: 'baz' }) },
              }),
            },
          }),
        },
      })
      await db.connect()
      const qb = db.queryBuilder()

      expect(await qb.insertInto('Foo').values({ foo: {} }).returning('foo').run()).toEqual(
        qbo([{ foo: { one: '1', two: 2 } }]),
      )

      expect(await qb.insertInto('Bar').values({}).returning('bar').run()).toEqual(qbo([{ bar: { baz: 'BAZ' } }]))

      await db.close()
      await close?.()
    }
  })

  test('structured_object population', async () => {
    for (const { driver, PGPool, close } of await initAllDrivers('qb_structured_object_field_min_max_validation')) {
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
            model: structuredObjectFieldModel({
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
            model: structuredObjectFieldModel({
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
          .values([{ name: 'Role 1', categories: { category: 1 } }])
          .returning('categories')
          .populate()
          .run(),
      ).toEqual(qbo([{ categories: { category: { name: 'Category 1' } } }]))

      expect(
        await qb
          .insertInto('Users')
          .values([{ roles: { role: 1 } }])
          .returning('roles')
          .populate()
          .run(),
      ).toEqual(
        qbo([
          {
            roles: {
              role: {
                name: 'Role 1',
                categories: { category: { name: 'Category 1' } },
              },
            },
          },
        ]),
      )

      await db.close()
      await close?.()
    }
  })
})
