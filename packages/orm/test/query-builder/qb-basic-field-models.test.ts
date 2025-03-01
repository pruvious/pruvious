import { expect, test } from 'vitest'
import {
  bigIntFieldModel,
  booleanFieldModel,
  Collection,
  Database,
  Field,
  numberFieldModel,
  objectFieldModel,
  textFieldModel,
} from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

test('text field model', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_text_field_model')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Required: new Collection({
          fields: { foo: new Field({ model: textFieldModel(), options: {}, required: true }) },
        }),
        NonNullable: new Collection({
          fields: { bar: new Field({ model: textFieldModel(), options: {}, required: true, nullable: false }) },
        }),
        NoTrim: new Collection({
          fields: { baz: new Field({ model: textFieldModel(), options: { trim: false } }) },
        }),
        NoTrimRequired: new Collection({
          fields: { baz: new Field({ model: textFieldModel(), options: { trim: false }, required: true }) },
        }),
        AllowEmptyString: new Collection({
          fields: { qux: new Field({ model: textFieldModel(), options: { allowEmptyString: true } }) },
        }),
        OneToFiveChars: new Collection({
          fields: { quux: new Field({ model: textFieldModel(), options: { minLength: 1, maxLength: 5 } }) },
        }),
        FiveChars: new Collection({
          fields: { corge: new Field({ model: textFieldModel(), options: { minLength: 5, maxLength: 5 } }) },
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

    expect(await qb.insertInto('Required').values({ foo: '' }).run()).toEqual(
      qbe([{ foo: 'This field cannot be left empty' }]),
    )

    expect(await qb.insertInto('Required').values({ foo: 1 }).returning('foo').run()).toEqual(qbo([{ foo: '1' }]))

    expect(await qb.insertInto('Required').values({ foo: ' FOO ' }).returning('foo').run()).toEqual(
      qbo([{ foo: 'FOO' }]),
    )

    expect(await qb.insertInto('Required').values({ foo: ' ' }).returning('foo').run()).toEqual(
      qbe([{ foo: 'This field cannot be left empty' }]),
    )

    expect(await qb.insertInto('Required').values({ foo: null }).returning('foo').run()).toEqual(qbo([{ foo: null }]))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: true as any })
        .run(),
    ).toEqual(qbe([{ foo: 'The value must be a string or `null`' }]))

    expect(await qb.update('Required').set({ foo: '' }).run()).toEqual(qbe({ foo: 'This field cannot be left empty' }))

    expect(await qb.update('Required').set({}).where('id', '=', 1).run()).toEqual(qbo(1))

    expect(await qb.insertInto('NonNullable').values({ bar: '' }).run()).toEqual(
      qbe([{ bar: 'This field cannot be left empty' }]),
    )

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
    ).toEqual(qbe([{ bar: 'The value must be a string' }]))

    expect(
      await qb
        .update('NonNullable')
        .set({ bar: null as any })
        .run(),
    ).toEqual(qbe({ bar: 'This field is not nullable' }))

    expect(await qb.insertInto('NoTrim').values({ baz: ' ' }).returning('baz').run()).toEqual(qbo([{ baz: ' ' }]))

    expect(await qb.insertInto('NoTrim').values({ baz: '' }).returning('baz').run()).toEqual(qbo([{ baz: '' }]))

    expect(await qb.insertInto('NoTrim').values({ baz: ' BAZ ' }).returning('baz').run()).toEqual(
      qbo([{ baz: ' BAZ ' }]),
    )

    expect(await qb.insertInto('NoTrimRequired').values({ baz: ' ' }).returning('baz').run()).toEqual(
      qbo([{ baz: ' ' }]),
    )

    expect(await qb.insertInto('NoTrimRequired').values({ baz: '' }).run()).toEqual(
      qbe([{ baz: 'This field cannot be left empty' }]),
    )

    expect(await qb.insertInto('NoTrimRequired').values({ baz: ' BAZ ' }).returning('baz').run()).toEqual(
      qbo([{ baz: ' BAZ ' }]),
    )

    expect(await qb.insertInto('AllowEmptyString').values({ qux: '' }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('OneToFiveChars').values({ quux: ' ' }).run()).toEqual(
      qbe([{ quux: 'The value must be at least `1` character long' }]),
    )

    expect(await qb.insertInto('OneToFiveChars').values({ quux: '123456' }).run()).toEqual(
      qbe([{ quux: 'The value must be at most `5` characters long' }]),
    )

    expect(await qb.insertInto('OneToFiveChars').values({ quux: ' 12345 ' }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('FiveChars').values({ corge: '123456' }).run()).toEqual(
      qbe([{ corge: 'The value must be exactly `5` characters long' }]),
    )

    expect(await qb.insertInto('FiveChars').values({ corge: ' 12345 ' }).run()).toEqual(qbo(1))

    await db.close()
    await close?.()
  }
})

test('boolean field model', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_boolean_field_model')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Required: new Collection({
          fields: { foo: new Field({ model: booleanFieldModel(), options: {}, required: true }) },
        }),
        NonNullable: new Collection({
          fields: {
            bar: new Field({ model: booleanFieldModel(), options: {}, required: true, nullable: false }),
          },
        }),
        AllowFalse: new Collection({
          fields: {
            bar: new Field({ model: booleanFieldModel(), options: { requireTrue: false }, required: true }),
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

    expect(await qb.insertInto('Required').values({ foo: false }).run()).toEqual(
      qbe([{ foo: "The value cannot be 'false'" }]),
    )

    expect(await qb.insertInto('Required').values({ foo: 'no' }).run()).toEqual(
      qbe([{ foo: "The value cannot be 'false'" }]),
    )

    expect(await qb.insertInto('Required').values({ foo: 1 }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Required').values({ foo: null }).run()).toEqual(qbo(1))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: '2' as any })
        .run(),
    ).toEqual(qbe([{ foo: 'The value must be a boolean or `null`' }]))

    expect(await qb.insertInto('NonNullable').values({ bar: false }).run()).toEqual(
      qbe([{ bar: "The value cannot be 'false'" }]),
    )

    expect(await qb.update('Required').set({ foo: false }).run()).toEqual(qbe({ foo: "The value cannot be 'false'" }))

    expect(await qb.update('Required').set({}).where('id', '=', 1).run()).toEqual(qbo(1))

    expect(
      await qb
        .insertInto('NonNullable')
        .values({ bar: null as any })
        .run(),
    ).toEqual(qbe([{ bar: 'This field is not nullable' }]))

    expect(
      await qb
        .update('NonNullable')
        .set({ bar: null as any })
        .run(),
    ).toEqual(qbe({ bar: 'This field is not nullable' }))

    expect(await qb.insertInto('AllowFalse').values({ bar: false }).run()).toEqual(qbo(1))

    await db.close()
    await close?.()
  }
})

test('number field model', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_number_field_model')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Required: new Collection({
          fields: { foo: new Field({ model: numberFieldModel(), options: { decimalPlaces: 2 }, required: true }) },
        }),
        NonNullable: new Collection({
          fields: { bar: new Field({ model: numberFieldModel(), options: {}, required: true, nullable: false }) },
        }),
        PositiveIntegers: new Collection({
          fields: { baz: new Field({ model: numberFieldModel(), options: { decimalPlaces: 0, min: 1 } }) },
        }),
        ZeroToOnes: new Collection({
          fields: { qux: new Field({ model: numberFieldModel(), options: { decimalPlaces: 1, min: 0, max: 1 } }) },
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

    expect(await qb.insertInto('Required').values({ foo: 0 }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Required').values({ foo: '01.23' }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Required').values({ foo: null }).run()).toEqual(qbo(1))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: '1n' as any })
        .run(),
    ).toEqual(qbe([{ foo: 'The value must be a number or `null`' }]))

    expect(await qb.insertInto('Required').values({ foo: 9007199254740991 }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Required').values({ foo: 9007199254740992 }).run()).toEqual(
      qbe([{ foo: 'The value must be less than or equal to `9007199254740991`' }]),
    )
    expect(await qb.insertInto('Required').values({ foo: -9007199254740991 }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Required').values({ foo: -9007199254740992 }).run()).toEqual(
      qbe([{ foo: 'The value must be greater than or equal to `-9007199254740991`' }]),
    )

    expect(
      await qb
        .update('Required')
        .set({ foo: '1n' as any })
        .run(),
    ).toEqual(qbe({ foo: 'The value must be a number or `null`' }))

    expect(await qb.update('Required').set({ foo: 1 }).where('id', 'between', [0, 1]).run()).toEqual(qbo(1))

    expect(
      await qb
        .insertInto('NonNullable')
        .values({ bar: null as any })
        .run(),
    ).toEqual(qbe([{ bar: 'This field is not nullable' }]))

    expect(
      await qb
        .update('NonNullable')
        .set({ bar: null as any })
        .run(),
    ).toEqual(qbe({ bar: 'This field is not nullable' }))

    expect(await qb.update('PositiveIntegers').set({ baz: 0 }).run()).toEqual(
      qbe({ baz: 'The value must be greater than or equal to `1`' }),
    )

    expect(await qb.update('PositiveIntegers').set({ baz: 1.5 }).run()).toEqual(
      qbe({ baz: 'The value must be an integer' }),
    )

    expect(await qb.update('ZeroToOnes').set({ qux: -0.1 }).run()).toEqual(
      qbe({ qux: 'The value must be greater than or equal to `0`' }),
    )

    expect(await qb.update('ZeroToOnes').set({ qux: 1.1 }).run()).toEqual(
      qbe({ qux: 'The value must be less than or equal to `1`' }),
    )

    expect(await qb.update('ZeroToOnes').set({ qux: 0.01 }).run()).toEqual(
      qbe({ qux: 'The value cannot have more than `1` decimal' }),
    )

    await db.close()
    await close?.()
  }
})

test('bigint field model', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_bigint_field_model')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Required: new Collection({
          fields: { foo: new Field({ model: bigIntFieldModel(), options: {}, required: true }) },
        }),
        NonNullable: new Collection({
          fields: { bar: new Field({ model: bigIntFieldModel(), options: {}, required: true, nullable: false }) },
        }),
        PositiveIntegers: new Collection({
          fields: { baz: new Field({ model: bigIntFieldModel(), options: { min: 1 } }) },
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

    expect(await qb.insertInto('Required').values({ foo: 0 }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Required').values({ foo: '-001' }).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Required').values({ foo: '01.23' }).run()).toEqual(
      qbe([{ foo: 'The value must be an integer or `null`' }]),
    )

    expect(await qb.insertInto('Required').values({ foo: null }).run()).toEqual(qbo(1))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: '1n' as any })
        .run(),
    ).toEqual(qbe([{ foo: 'The value must be an integer or `null`' }]))

    expect(await qb.insertInto('Required').values({ foo: 9007199254740991 }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Required').values({ foo: 9007199254740992 }).run()).toEqual(
      qbe([{ foo: 'The value must be less than or equal to `9007199254740991`' }]),
    )
    expect(await qb.insertInto('Required').values({ foo: -9007199254740991 }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Required').values({ foo: -9007199254740992 }).run()).toEqual(
      qbe([{ foo: 'The value must be greater than or equal to `-9007199254740991`' }]),
    )

    expect(
      await qb
        .update('Required')
        .set({ foo: '1n' as any })
        .run(),
    ).toEqual(qbe({ foo: 'The value must be an integer or `null`' }))

    expect(await qb.update('Required').set({ foo: 1 }).run()).toEqual

    expect(
      await qb
        .insertInto('NonNullable')
        .values({ bar: null as any })
        .run(),
    ).toEqual(qbe([{ bar: 'This field is not nullable' }]))

    expect(
      await qb
        .update('NonNullable')
        .set({ bar: null as any })
        .run(),
    ).toEqual(qbe({ bar: 'This field is not nullable' }))

    expect(await qb.update('PositiveIntegers').set({ baz: 0 }).run()).toEqual(
      qbe({ baz: 'The value must be greater than or equal to `1`' }),
    )

    await db.close()
    await close?.()
  }
})

test('object field model', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_object_field_model')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Required: new Collection({
          fields: {
            foo: new Field({
              model: objectFieldModel<{ bar?: string | { baz?: string } }>(),
              options: {},
              required: true,
            }),
          },
        }),
        NonNullable: new Collection({
          fields: {
            bar: new Field({
              model: objectFieldModel<{ bar?: string | { baz?: string } }>(),
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

    expect(await qb.insertInto('Required').values({ foo: {} }).returning('foo').run()).toEqual(qbo([{ foo: {} }]))

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
        .values({ foo: { bar: 'baz' } })
        .returning('foo')
        .run(),
    ).toEqual(qbo([{ foo: { bar: 'baz' } }]))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: { bar: 123 as any } })
        .returning('foo')
        .run(),
    ).toEqual(qbo([{ foo: { bar: 123 } }]))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: { bar: (() => 123) as any } })
        .run(),
    ).toEqual(qbe([{ foo: 'The value must be serializable' }]))

    expect(await qb.insertInto('Required').values({ foo: null }).returning('foo').run()).toEqual(qbo([{ foo: null }]))

    expect(
      await qb
        .insertInto('Required')
        .values({ foo: JSON.stringify({ foo: 'bar' }) as any })
        .returning('foo')
        .run(),
    ).toEqual(qbo([{ foo: { foo: 'bar' } }]))

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
