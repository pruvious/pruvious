import { expect, test } from 'vitest'
import { Collection, Database, Field, repeaterFieldModel, textFieldModel } from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

test('conditional logic in query builder', async () => {
  const Buttons = new Collection({
    fields: {
      label: new Field({
        model: textFieldModel(),
        required: false,
        conditionalLogic: {},
        options: {},
      }),
      type: new Field({
        model: textFieldModel(),
        required: true,
        conditionalLogic: { label: { regexp: '.+' } },
        options: {},
      }),
      link: new Field({
        model: textFieldModel(),
        required: true,
        conditionalLogic: { label: { regexp: '.+' }, type: { '=': 'link' } },
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
          variant: new Field({
            model: textFieldModel(),
            required: true,
            conditionalLogic: { theme: { '=': 'dark' } },
            options: {},
          }),
          other1: new Field({
            model: textFieldModel(),
            required: true,
            conditionalLogic: { '/other1': { '=': 'foo' } },
            options: {},
          }),
          other2: new Field({
            model: textFieldModel(),
            required: true,
            conditionalLogic: { '../../other2': { '=': 'foo' } },
            options: { allowEmptyString: true },
          }),
        }),
        options: {},
      }),
    },
  })

  for (const { driver, PGPool, close } of await initAllDrivers('qb_conditional_logic')) {
    const db = new Database({ driver, PGPool, collections: { Buttons } })
    const qb = db.queryBuilder()
    await db.connect()

    expect(await qb.insertInto('Buttons').values({ label: 'foo' }).run()).toEqual(
      qbe([{ type: 'This field is required' }]),
    )

    expect(await qb.insertInto('Buttons').values({ label: 'foo', type: '' }).run()).toEqual(
      qbe([{ type: 'This field cannot be left empty' }]),
    )

    expect(await qb.insertInto('Buttons').values({ type: '' }).returning(['label', 'type', 'link']).run()).toEqual(
      qbo([{ label: '', type: '', link: '' }]),
    )

    expect(await qb.insertInto('Buttons').values({}).returning(['label', 'type', 'link']).run()).toEqual(
      qbo([{ label: '', type: '', link: '' }]),
    )

    expect(await qb.insertInto('Buttons').values({ link: 'foo' }).returning(['label', 'type', 'link']).run()).toEqual(
      qbo([{ label: '', type: '', link: 'foo' }]),
    )

    expect(
      await qb
        .insertInto('Buttons')
        .values([{ type: true as any }, { link: true as any }, { type: true as any, link: true as any }])
        .run(),
    ).toEqual(
      qbe([
        { type: 'The value must be a string or `null`' },
        { link: 'The value must be a string or `null`' },
        { type: 'The value must be a string or `null`', link: 'The value must be a string or `null`' },
      ]),
    )

    expect(await qb.update('Buttons').set({ type: '' }).where('id', '=', 1).run()).toEqual(
      qbe({ type: 'This field requires `label` to be present in the input data' }),
    )

    expect(await qb.update('Buttons').set({ label: 'foo', type: '' }).where('id', '=', 1).run()).toEqual(
      qbe({ type: 'This field cannot be left empty' }),
    )

    expect(await qb.update('Buttons').set({ label: '', type: '' }).where('id', '=', 1).run()).toEqual(qbo(1))

    expect(await qb.insertInto('Buttons').values({ label: 'foo', type: 'link' }).clone().run()).toEqual(
      qbe([{ link: 'This field is required' }]),
    )

    expect(await qb.update('Buttons').set({ label: 'foo', type: 'link', link: ' ' }).where('id', '=', 1).run()).toEqual(
      qbe({ link: 'This field cannot be left empty' }),
    )

    expect(await qb.insertInto('Buttons').values({ label: 'foo', type: 'link', link: '#' }).run()).toEqual(qbo(1))
    expect(await qb.update('Buttons').set({ label: 'foo', type: 'link', link: '#' }).run()).toEqual(
      qbo(expect.any(Number)),
    )

    expect(
      await qb
        .update('Buttons')
        .set({ styles: [{}] })
        .run(),
    ).toEqual(
      qbe({
        'styles.0.other1': 'This field requires `other1` to be present in the input data',
        'styles.0.other2': 'This field requires `other2` to be present in the input data',
      }),
    )

    expect(
      await qb
        .update('Buttons')
        .set({ other1: '', other2: '', styles: [{ theme: 'light' }] })
        .where('id', '=', 1)
        .returning('styles')
        .run(),
    ).toEqual(qbo([{ styles: [{ theme: 'light', variant: '', other1: '', other2: '' }] }]))

    expect(
      await qb
        .update('Buttons')
        .set({ other1: '', other2: '', styles: [{ theme: 'system', other2: '' }] })
        .where('id', '=', 1)
        .returning('styles')
        .run(),
    ).toEqual(qbo([{ styles: [{ theme: 'system', variant: '', other1: '', other2: '' }] }]))

    expect(
      await qb
        .update('Buttons')
        .set({ other1: 'foo', other2: 'foo', styles: [{ theme: 'dark' }] })
        .run(),
    ).toEqual(
      qbe({
        'styles.0.variant': 'This field is required',
        'styles.0.other1': 'This field is required',
        'styles.0.other2': 'This field is required',
      }),
    )

    await db.close()
    await close?.()
  }
})
