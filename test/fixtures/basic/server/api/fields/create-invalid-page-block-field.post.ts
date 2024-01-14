import { db, query } from '#pruvious/server'
import { defineEventHandler, getQuery } from 'h3'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const page = await query('pages').create({ path: nanoid() })
  const block = getQuery(event).block

  if (page.success) {
    if (block === 'Button') {
      ;(await db()).model('pages').update(
        {
          blocks: JSON.stringify([
            { block: { name: 'Button', fields: { label: true, foo: 'bar' } } },
            { block: { name: 'Foo', fields: {} } },
            { block: { name: 'Button', fields: {} } },
            { block: { name: 'Button' } },
            { block: null },
            { block: {} },
            { block: true },
            {},
            [],
            true,
            null,
            undefined,
            'foo',
            123,
          ]),
        },
        { where: { id: page.record.id } },
      )
    } else if (block === 'Container') {
      ;(await db()).model('pages').update(
        {
          blocks: JSON.stringify([
            {
              block: {
                name: 'Container',
                fields: {},
                slots: { default: ['foo', null, {}, { block: {} }, { block: { name: 'foo', fields: {} } }] },
              },
            },
            { block: { name: 'Container', fields: {}, slots: { bar: 'baz' } } },
            {
              block: {
                name: 'Container',
                fields: {},
                slots: {
                  default: [
                    { block: { name: 'Button', fields: {} } },
                    { block: { name: 'ConditionalLogic', fields: { baz: 'baz' } } },
                  ],
                  foo: [],
                },
              },
            },
          ]),
        },
        { where: { id: page.record.id } },
      )
    }

    return page.record.id
  }

  return 0
})
