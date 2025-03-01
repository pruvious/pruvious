import { expect, test } from 'vitest'
import {
  booleanFieldModel,
  Collection,
  Database,
  Field,
  GenericField,
  numberFieldModel,
  textFieldModel,
} from '../../src'
import { initAllDrivers, qbo } from '../utils'

test('sync column types', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_sync_column_types')) {
    function getOptions(fields: Record<string, GenericField> = {}) {
      return { driver, PGPool, collections: { Foo: new Collection({ fields }) } }
    }

    let db = new Database(getOptions({ foo: new Field({ model: textFieldModel(), default: null, options: {} }) }))
    let qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: true, synced: true })
    expect(await qb.insertInto('Foo').values({}).run()).toEqual(qbo(1))
    expect(await qb.selectFrom('Foo').select('foo').first()).toEqual(qbo({ foo: null }))
    await db.close()

    db = new Database(getOptions({ foo: new Field({ model: textFieldModel(), nullable: false, options: {} }) }))
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: true })
    expect(await qb.selectFrom('Foo').select('foo').first()).toEqual(qbo({ foo: '' }))
    await db.close()

    db = new Database(getOptions({ foo: new Field({ model: textFieldModel(), options: {} }) }))
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: true })
    expect(await qb.selectFrom('Foo').select('foo').first()).toEqual(qbo({ foo: '' }))
    await db.close()

    db = new Database(getOptions({ foo: new Field({ model: textFieldModel(), options: {} }) }))
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: false })
    expect(await qb.selectFrom('Foo').select('foo').first()).toEqual(qbo({ foo: '' }))
    await db.close()

    db = new Database(
      getOptions({
        foo: new Field({ model: textFieldModel(), nullable: false, options: {} }),
        bar: new Field({ model: textFieldModel(), nullable: false, options: {} }),
      }),
    )
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: true })
    expect(await qb.selectFrom('Foo').select(['foo', 'bar']).first()).toEqual(qbo({ foo: '', bar: '' }))
    await db.close()

    db = new Database(
      getOptions({
        foo: new Field({ model: booleanFieldModel(), nullable: false, options: {} }),
        bar: new Field({ model: booleanFieldModel(), nullable: false, options: {} }),
      }),
    )
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: true })
    expect(await qb.selectFrom('Foo').select(['foo', 'bar']).first()).toEqual(qbo({ foo: false, bar: false }))
    expect(await qb.update('Foo').set({ foo: true, bar: false }).run()).toEqual(qbo(1))
    await db.close()

    db = new Database(
      getOptions({
        foo: new Field({ model: numberFieldModel(), nullable: false, options: {} }),
        bar: new Field({ model: numberFieldModel(), nullable: false, options: {} }),
      }),
    )
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: true })
    expect(await qb.selectFrom('Foo').select(['foo', 'bar']).first()).toEqual(qbo({ foo: 0, bar: 0 }))
    await db.close()

    db = new Database(
      getOptions({
        foo: new Field({ model: textFieldModel(), nullable: false, options: {} }),
        bar: new Field({ model: textFieldModel(), nullable: false, options: {} }),
      }),
    )
    qb = db.queryBuilder()
    expect(await db.connect()).toEqual({ createdOptionsTable: false, synced: true })
    expect(await qb.selectFrom('Foo').select(['foo', 'bar']).first()).toEqual(qbo({ foo: '0', bar: '0' }))
    await db.close()

    await close?.()
  }
})
