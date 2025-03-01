import { isDefined, isUndefined } from '@pruvious/utils'
import { expect, test } from 'vitest'
import { Collection, Database, Field, numberFieldModel } from '../../src'
import { initAllDrivers, qbo } from '../utils'

test('field input filters', async () => {
  const collections = {
    Foo: new Collection({
      fields: {
        foo: new Field({
          model: numberFieldModel(),
          options: {},
          inputFilters: {
            beforeInputSanitization: {
              order: 9,
              callback: (value, { context }) => {
                if (isDefined(context.getRawInputValue('foo'))) {
                  if (context.operation === 'insert') {
                    context.rawInput[context.inputIndex]['beforeInputSanitization'] = 2
                  } else {
                    context.rawInput['beforeInputSanitization'] = 2
                  }
                }

                return value
              },
            },
            beforeInputValidation: {
              order: 9,
              callback: (value, { context }) => {
                if (isDefined(context.getRawInputValue('foo'))) {
                  if (context.operation === 'insert') {
                    context.rawInput[context.inputIndex]['beforeInputValidation'] = 2
                    context.sanitizedInput[context.inputIndex]['beforeInputValidation'] = 2
                  } else {
                    context.rawInput['beforeInputValidation'] = 2
                    context.sanitizedInput['beforeInputValidation'] = 2
                  }
                }

                return value
              },
            },
            beforeQueryExecution: {
              order: 9,
              callback: (value, { context }) => {
                if (isDefined(context.getRawInputValue('foo'))) {
                  if (context.operation === 'insert') {
                    context.rawInput[context.inputIndex]['beforeQueryExecution'] = 2
                    context.rawInput[context.inputIndex]['never'] = 2
                    context.sanitizedInput[context.inputIndex]['beforeQueryExecution'] = 2
                    context.sanitizedInput[context.inputIndex]['never'] = 2
                  } else {
                    context.rawInput['beforeQueryExecution'] = 2
                    context.rawInput['never'] = 2
                    context.sanitizedInput['beforeQueryExecution'] = 2
                    context.sanitizedInput['never'] = 2
                  }
                }

                return value
              },
            },
          },
        }),
        beforeInputSanitization: new Field({
          model: numberFieldModel(),
          options: {},
          inputFilters: {
            beforeInputSanitization: (value, { context }) =>
              isUndefined(context.getRawInputValue('beforeInputSanitization')) ? 1 : value,
          },
        }),
        beforeInputValidation: new Field({
          model: numberFieldModel(),
          options: {},
          inputFilters: {
            beforeInputValidation: (value, { context }) =>
              isUndefined(context.getRawInputValue('beforeInputValidation')) ? 1 : value,
          },
        }),
        beforeQueryExecution: new Field({
          model: numberFieldModel(),
          options: {},
          inputFilters: {
            beforeQueryExecution: (value, { context }) =>
              isUndefined(context.getRawInputValue('beforeQueryExecution')) ? 1 : value,
          },
        }),
        never: new Field({
          model: numberFieldModel(),
          options: {},
          inputFilters: {
            beforeQueryExecution: {
              order: 12,
              callback: () => undefined,
            },
          },
        }),
      },
    }),
  }

  for (const { driver, PGPool, close } of await initAllDrivers('qb_input_filters')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

    expect(await qb.insertInto('Foo').values({}).returningAll().run()).toEqual(
      qbo([
        {
          id: 1,
          beforeInputSanitization: 1,
          beforeInputValidation: 1,
          beforeQueryExecution: 1,
          never: null,
          foo: 0,
        },
      ]),
    )

    expect(await qb.insertInto('Foo').values({ foo: 3 }).returningAll().run()).toEqual(
      qbo([
        {
          id: 2,
          beforeInputSanitization: 2,
          beforeInputValidation: 2,
          beforeQueryExecution: 2,
          never: null,
          foo: 3,
        },
      ]),
    )

    expect(await qb.insertInto('Foo').values({ beforeInputSanitization: 4, foo: 3 }).returningAll().run()).toEqual(
      qbo([
        {
          id: 3,
          beforeInputSanitization: 2,
          beforeInputValidation: 2,
          beforeQueryExecution: 2,
          never: null,
          foo: 3,
        },
      ]),
    )

    expect(await qb.update('Foo').set({}).where('id', '=', 3).returningAll().run()).toEqual(
      qbo([
        {
          id: 3,
          beforeInputSanitization: 1,
          beforeInputValidation: 1,
          beforeQueryExecution: 1,
          never: null,
          foo: 3,
        },
      ]),
    )

    expect(await qb.update('Foo').set({ foo: 4 }).where('id', '=', 3).returningAll().run()).toEqual(
      qbo([
        {
          id: 3,
          beforeInputSanitization: 2,
          beforeInputValidation: 2,
          beforeQueryExecution: 2,
          never: null,
          foo: 4,
        },
      ]),
    )

    expect(await qb.update('Foo').set({ beforeInputValidation: 4 }).where('id', '=', 3).returningAll().run()).toEqual(
      qbo([
        {
          id: 3,
          beforeInputSanitization: 1,
          beforeInputValidation: 4,
          beforeQueryExecution: 1,
          never: null,
          foo: 4,
        },
      ]),
    )

    expect(await qb.update('Foo').set({ never: 3 }).where('id', '=', 3).returningAll().run()).toEqual(
      qbo([
        {
          id: 3,
          beforeInputSanitization: 1,
          beforeInputValidation: 1,
          beforeQueryExecution: 1,
          never: null,
          foo: 4,
        },
      ]),
    )

    await db.close()
    await close?.()
  }
})
