import { expect, test } from 'vitest'
import {
  ExecError,
  Field,
  parseConditionalLogic,
  prepareQuery,
  repeaterFieldModel,
  structureFieldModel,
  textFieldModel,
} from '../src'

test('prepare query', async () => {
  // SQLite
  expect(prepareQuery('select * from "foo" where "id" = $id', { id: 1337 }, 'sqlite')).toEqual({
    sql: 'select * from "foo" where "id" = $p1',
    params: { p1: 1337 },
  })
  expect(prepareQuery('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }, 'sqlite')).toEqual({
    sql: 'insert into "foo" values ($p1), ($p2)',
    params: { p1: 'BAR', p2: 'BAZ' },
  })
  expect(prepareQuery('insert into "foo" values ($baz), ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }, 'sqlite')).toEqual(
    {
      sql: 'insert into "foo" values ($p1), ($p2), ($p1)',
      params: { p1: 'BAZ', p2: 'BAR' },
    },
  )
  expect(prepareQuery('select * from "foo" where "id" = $id', {} as any, 'sqlite')).toEqual({
    sql: 'select * from "foo" where "id" = $p1',
    params: { p1: undefined },
    error: expect.any(ExecError),
  })

  // PostgreSQL
  expect(prepareQuery('select * from "foo" where "id" = $id', { id: 1337 }, 'postgres')).toEqual({
    sql: 'select * from "foo" where "id" = $1',
    params: [1337],
  })
  expect(prepareQuery('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }, 'postgres')).toEqual({
    sql: 'insert into "foo" values ($1), ($2)',
    params: ['BAR', 'BAZ'],
  })
  expect(
    prepareQuery('insert into "foo" values ($baz), ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }, 'postgres'),
  ).toEqual({
    sql: 'insert into "foo" values ($1), ($2), ($1)',
    params: ['BAZ', 'BAR'],
  })
  expect(prepareQuery('select * from "foo" where "id" = $id', {} as any, 'postgres')).toEqual({
    sql: 'select * from "foo" where "id" = $1',
    params: [undefined],
    error: expect.any(ExecError),
  })

  // D1
  expect(prepareQuery('select * from "foo" where "id" = $id', { id: 1337 }, 'd1')).toEqual({
    sql: 'select * from "foo" where "id" = ?1',
    params: [1337],
  })
  expect(prepareQuery('insert into "foo" values ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }, 'd1')).toEqual({
    sql: 'insert into "foo" values (?1), (?2)',
    params: ['BAR', 'BAZ'],
  })
  expect(prepareQuery('insert into "foo" values ($baz), ($bar), ($baz)', { bar: 'BAR', baz: 'BAZ' }, 'd1')).toEqual({
    sql: 'insert into "foo" values (?1), (?2), (?1)',
    params: ['BAZ', 'BAR'],
  })
  expect(prepareQuery('select * from "foo" where "id" = $id', {} as any, 'd1')).toEqual({
    sql: 'select * from "foo" where "id" = ?1',
    params: [undefined],
    error: expect.any(ExecError),
  })
})

test('parse conditional logic', () => {
  expect(
    parseConditionalLogic(
      {
        foo: new Field({ model: textFieldModel(), options: {} }),
        bar: new Field({ model: textFieldModel(), conditionalLogic: { foo: { '=': 'FOO' } }, options: {} }),
      },
      {},
    ),
  ).toEqual({
    foo: undefined,
    bar: { foo: { '=': 'FOO' } },
  })

  expect(
    parseConditionalLogic(
      {
        foo: new Field({
          model: repeaterFieldModel({
            bar: new Field({ model: textFieldModel(), conditionalLogic: { '../foo': { '<': 5 } }, options: {} }),
          }),
          conditionalLogic: { '0.bar': { '=': 'BAR' } },
          options: {},
        }),
      },
      { foo: [{}, {}] },
    ),
  ).toEqual({
    'foo': { '0.bar': { '=': 'BAR' } },
    'foo.0.bar': { '../foo': { '<': 5 } },
    'foo.1.bar': { '../foo': { '<': 5 } },
  })

  expect(
    parseConditionalLogic(
      {
        foo: new Field({
          model: structureFieldModel({
            BAR: {
              bar: new Field({ model: textFieldModel(), conditionalLogic: { '../foo': { '<': 5 } }, options: {} }),
            },
          }),
          conditionalLogic: { '0.bar': { '=': 'BAR' } },
          options: {},
        }),
      },
      { foo: [{}, {}] },
    ),
  ).toEqual({
    'foo': { '0.bar': { '=': 'BAR' } },
    'foo.0.bar': { '../foo': { '<': 5 } },
    'foo.1.bar': { '../foo': { '<': 5 } },
  })

  expect(
    parseConditionalLogic(
      {
        foo: new Field({
          model: structureFieldModel({
            BAR: {
              bar: new Field({
                model: textFieldModel(),
                conditionalLogic: { '../foo': { '<': 5 } },
                options: {},
              }),
              baz: new Field({
                model: repeaterFieldModel({
                  qux: new Field({ model: textFieldModel(), conditionalLogic: { '../foo': { '<': 5 } }, options: {} }),
                }),
                conditionalLogic: { '0.qux': { '=': 'BAR' } },
                options: {},
              }),
            },
          }),
          conditionalLogic: { '0.bar': { '=': 'BAR' } },
          options: {},
        }),
      },
      { foo: [{ $key: 'BAR', baz: [{}] }, {}] },
    ),
  ).toEqual({
    'foo': { '0.bar': { '=': 'BAR' } },
    'foo.0.bar': { '../foo': { '<': 5 } },
    'foo.0.baz': { '0.qux': { '=': 'BAR' } },
    'foo.0.baz.0.qux': { '../foo': { '<': 5 } },
    'foo.1.bar': { '../foo': { '<': 5 } },
    'foo.1.baz': { '0.qux': { '=': 'BAR' } },
  })

  expect(
    parseConditionalLogic(
      {
        structureNested: new Field({
          model: structureFieldModel({
            foo: {
              nested: new Field({
                model: structureFieldModel({
                  repeater: {
                    repeater: new Field({
                      model: repeaterFieldModel({
                        type: new Field({ model: textFieldModel(), default: 'text', options: {} }),
                        text: new Field({
                          model: textFieldModel(),
                          conditionalLogic: { type: { '=': 'text' } },
                          required: true,
                          options: {},
                        }),
                        number: new Field({
                          model: textFieldModel(),
                          conditionalLogic: { type: { '=': 'number' } },
                          required: true,
                          options: {},
                        }),
                      }),
                      options: {},
                    }),
                  },
                }),
                options: {},
              }),
            },
          }),
          options: {},
        }),
      },
      { structureNested: [{ $key: 'foo', nested: [{}, { $key: 'repeater', repeater: [{}] }] }] },
    ),
  ).toEqual({
    'structureNested.0.nested.1.repeater.0.text': { type: { '=': 'text' } },
    'structureNested.0.nested.1.repeater.0.number': { type: { '=': 'number' } },
  })

  // @todo objectFieldModel test
})
