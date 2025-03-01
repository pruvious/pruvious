import { expect, test } from 'vitest'
import { Collection, Database, Field, repeaterFieldModel, textFieldModel } from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

test('field dependencies', async () => {
  const Buttons = new Collection({
    fields: {
      type: new Field({
        model: textFieldModel(),
        options: {},
      }),
      link: new Field({
        model: textFieldModel(),
        dependencies: ['type'],
        options: {},
      }),
      other1: new Field({
        model: textFieldModel(),
        options: {},
      }),
      other2: new Field({
        model: textFieldModel(),
        options: {},
      }),
      styles: new Field({
        model: repeaterFieldModel({
          theme: new Field({ model: textFieldModel(), options: {} }),
          variant: new Field({ model: textFieldModel(), dependencies: ['theme'], options: {} }),
          other1: new Field({ model: textFieldModel(), dependencies: ['/other1'], options: {} }),
          other2: new Field({ model: textFieldModel(), dependencies: ['../../other2'], options: {} }),
        }),
        options: {},
      }),
    },
  })

  for (const { driver, PGPool, close } of await initAllDrivers('qb_field_dependencies')) {
    const db = new Database({ driver, PGPool, collections: { Buttons } })
    const qb = db.queryBuilder()
    await db.connect()

    expect(await qb.insertInto('Buttons').values({}).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Buttons').values({ link: '#' }).run()).toEqual(
      qbe([{ link: 'This field requires `type` to be present in the input data' }]),
    )
    expect(await qb.update('Buttons').set({ link: '#' }).run()).toEqual(
      qbe({ link: 'This field requires `type` to be present in the input data' }),
    )

    expect(
      await qb
        .insertInto('Buttons')
        .values({ other1: '', styles: [{ theme: 'dark' }] })
        .returning('styles')
        .run(),
    ).toEqual(qbo([{ styles: [{ theme: 'dark', variant: '', other1: '', other2: '' }] }]))

    expect(
      await qb
        .update('Buttons')
        .set({ styles: [{}, {}] })
        .run(),
    ).toEqual(
      qbe({
        'styles.0.other1': 'This field requires `other1` to be present in the input data',
        'styles.0.other2': 'This field requires `other2` to be present in the input data',
        'styles.1.other1': 'This field requires `other1` to be present in the input data',
        'styles.1.other2': 'This field requires `other2` to be present in the input data',
      }),
    )

    await db.close()
    await close?.()
  }
})
