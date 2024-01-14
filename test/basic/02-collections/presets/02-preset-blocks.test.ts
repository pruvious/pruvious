import { $fetch } from '@nuxt/test-utils'
import { nanoid } from 'nanoid'
import { describe, expect, it } from 'vitest'
import { sleep } from '../../../../src/runtime/utils/function'

describe('preset blocks', async () => {
  let presetId = 0

  it('creates a button block in a preset', async () => {
    const response = await $fetch('/api/collections/presets?select=id,blocks', {
      method: 'post',
      body: {
        name: nanoid(),
        blocks: [{ block: { name: 'Button', fields: { label: 'Button label (+search test)' } } }],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      blocks: [{ block: { name: 'Button', fields: { label: 'Button label (+search test)' }, slots: {} } }],
    })

    presetId = response.id
  })

  it('validates preset id in block', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'Preset', fields: { preset: 9001 } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.fields.preset': 'The preset does not exist' })
  })

  it('creates a preset block with a button', async () => {
    const response1 = await $fetch('/api/collections/pages?select=id,blocks&populate=1', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'Preset', fields: { preset: presetId } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({
      id: expect.any(Number),
      blocks: [
        {
          block: {
            name: 'Preset',
            fields: {
              preset: {
                blocks: [{ block: { name: 'Button', fields: { label: 'Button label (+search test)!' }, slots: {} } }],
              },
            },
            slots: {},
          },
        },
      ],
    })

    await sleep(500)

    const response2 = await $fetch('/api/collections/pages', {
      query: {
        select: 'id',
        search: '(+search test)!',
        order: 'createdAt:desc',
        limit: 1,
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response2.records).toEqual([{ id: response1.id }])
  })

  it('does not accept button block from preset in special layout', async () => {
    const response1 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          { block: { name: 'Container', fields: {} } },
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Preset', fields: { preset: presetId } } }] },
            },
          },
        ],
        layout: 'special',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toEqual({
      'blocks.1.slots.default.0': "The block 'Button' is not allowed in the layout 'Special layout'",
    })

    // Nested example
    const response2 = await $fetch('/api/collections/presets', {
      method: 'post',
      body: {
        name: nanoid(),
        blocks: [
          { block: { name: 'Container', fields: {} } },
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Preset', fields: { preset: presetId } } }] },
            },
          },
        ],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response3 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          { block: { name: 'Container', fields: {} } },
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Preset', fields: { preset: response2.id } } }] },
            },
          },
          { block: { name: 'Preset', fields: { preset: presetId } } },
          { block: { name: 'Preset', fields: { preset: response2.id } } },
        ],
        layout: 'special',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response3).toEqual({
      'blocks.1.slots.default.0': "The block 'Button' is not allowed in the layout 'Special layout'",
      'blocks.2': "The block 'Button' is not allowed in the layout 'Special layout'",
      'blocks.3': "The block 'Button' is not allowed in the layout 'Special layout'",
    })
  })

  it('does not exceed max population depth', async () => {
    const response1 = await $fetch('/api/collections/presets', {
      method: 'post',
      body: { name: nanoid() },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response2 = await $fetch('/api/collections/presets', {
      method: 'post',
      body: {
        name: nanoid(),
        blocks: [{ block: { name: 'Preset', fields: { preset: response1.id } } }],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const response3 = await $fetch(`/api/collections/presets/${response2.id}?select=blocks&populate=1`, {
      method: 'patch',
      body: { blocks: [{ block: { name: 'Preset', fields: { preset: response2.id } } }] },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3).toEqual({
      blocks: [
        {
          block: {
            name: 'Preset',
            fields: {
              preset: {
                blocks: [
                  {
                    block: {
                      name: 'Preset',
                      fields: {
                        preset: {
                          blocks: [
                            {
                              block: {
                                name: 'Preset',
                                fields: {
                                  preset: {
                                    blocks: [expect.any(Object)],
                                  },
                                },
                                slots: {},
                              },
                            },
                          ],
                        },
                      },
                      slots: {},
                    },
                  },
                ],
              },
            },
            slots: {},
          },
        },
      ],
    })
  })
})
