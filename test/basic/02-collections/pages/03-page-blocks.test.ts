import { $fetch } from '@nuxt/test-utils'
import { nanoid } from 'nanoid'
import { describe, expect, it } from 'vitest'

describe('page blocks', async () => {
  /*
  |--------------------------------------------------------------------------
  | Button
  |--------------------------------------------------------------------------
  |
  */
  it('creates a button', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: '/search',
        blocks: [{ block: { name: 'Button', fields: { label: 'Button label (+search test)' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [{ block: { name: 'Button', fields: { label: 'Button label (+search test)' }, slots: {} } }],
    })
  })

  it('requires block', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{}], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block': 'This field is required' })
  })

  it('validates block type', async () => {
    const response1 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: {} }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response1).toEqual({ 'blocks.0.block': 'Invalid input type' })

    const response2 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: true }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response2).toEqual({ 'blocks.0.block': 'Invalid input type' })

    const response3 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: { name: 'Button' } }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response3).toEqual({ 'blocks.0.block': 'Invalid input type' })

    const response4 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: { fields: {} } }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response4).toEqual({ 'blocks.0.block': 'Invalid input type' })

    const response5 = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: { name: 'Button', fields: [] } }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response5).toEqual({ 'blocks.0.block': 'Invalid input type' })
  })

  it('requires block field', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: { name: 'Button', fields: {} } }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.fields.label': 'This field is required' })
  })

  it('validates block name', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: { name: 'Foo', fields: { label: true } } }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      'blocks.0': 'Invalid input type',
      'blocks.0.block.name': 'Unrecognized block name',
    })
  })

  it('validates block field names', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'Button', fields: { label: 'baz', foo: 'bar' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.fields.foo': 'Unrecognized field name' })
  })

  it('validates block field type', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: { path: nanoid(), blocks: [{ block: { name: 'Button', fields: { label: true } } }], layout: 'default' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.fields.label': 'Invalid input type' })
  })

  it('fallbacks block field to default value', async () => {
    const pageId = await $fetch('/api/fields/create-invalid-page-block-field?block=Button', { method: 'post' })
    const response = await $fetch(`/api/collections/pages/${pageId}?select=blocks&populate=1`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [
        { block: { name: 'Button', fields: { label: 'Default label!' }, slots: {} } },
        { block: { name: 'Button', fields: { label: 'Default label!' }, slots: {} } },
      ],
    })
  })

  /*
  |--------------------------------------------------------------------------
  | Conditional logic
  |--------------------------------------------------------------------------
  |
  */
  it('creates a block with conditional logic (foo=true)', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: true, bar: 'bar' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: true, bar: 'bar', baz: '' }, slots: {} } }],
    })
  })

  it('creates a block with conditional logic (foo=false)', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: false, baz: 'baz' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: false, bar: '', baz: 'baz' }, slots: {} } }],
    })
  })

  it('requires bar to be bar', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: true, bar: 'baz' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.fields.bar': 'Must be bar' })
  })

  it('requires baz to be baz', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: false, baz: 'bar' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.fields.baz': 'Must be baz' })
  })

  it('sanitizes and populates BAR to bar!', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks&populate=true', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: true, bar: 'BAR', baz: true } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: true, bar: 'bar!', baz: '' }, slots: {} } }],
    })
  })

  it('sanitizes and populates BAZ to baz!', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks&populate=true', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: false, bar: 'bar', baz: 'BAZ' } } }],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [{ block: { name: 'ConditionalLogic', fields: { foo: false, bar: '', baz: 'baz!' }, slots: {} } }],
    })
  })

  it('generates block keywords', async () => {
    const response = await $fetch(
      `/api/collections/pages?select=path&search=${encodeURIComponent('(+search test)!')}&order=id:desc`,
      { headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response.records).toEqual([{ path: '/search' }])
  })

  /*
  |--------------------------------------------------------------------------
  | Container (slots)
  |--------------------------------------------------------------------------
  |
  */
  it('creates a container with slots', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Button', fields: { label: 'Button label' } } }] },
            },
          },
        ],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [
        {
          block: {
            name: 'Container',
            fields: {},
            slots: { default: [{ block: { name: 'Button', fields: { label: 'Button label' }, slots: {} } }] },
          },
        },
      ],
    })
  })

  it('validates slot name', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { foo: [{ block: { name: 'Button', fields: { label: 'Button label' } } }] },
            },
          },
        ],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.slots.foo': 'Unrecognized slot name' })
  })

  it('requires slot to be an array', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: { block: { name: 'Button', fields: { label: 'Button label' } } } },
            },
          },
        ],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.slots.default': 'Invalid input type' })
  })

  it('validates inner blocks in slots', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Foo', fields: { label: 'Button label' } } }] },
            },
          },
        ],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      'blocks.0.block.slots.default.0': 'Invalid input type',
      'blocks.0.block.slots.default.0.block.name': 'Unrecognized block name',
    })
  })

  it('validates inner block fields in slots', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Button', fields: { label: true } } }] },
            },
          },
        ],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.slots.default.0.block.fields.label': 'Invalid input type' })
  })

  it('validates allowed inner block fields in slots', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'ConditionalLogic', fields: { baz: 'baz' } } }] },
            },
          },
        ],
        layout: 'default',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0.block.slots.default.0': "This block is not allowed in the slot 'Default'" })
  })

  it('fallbacks block field to default value', async () => {
    const pageId = await $fetch('/api/fields/create-invalid-page-block-field?block=Container', { method: 'post' })
    const response = await $fetch(`/api/collections/pages/${pageId}?select=blocks`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [
        { block: { name: 'Container', fields: {}, slots: { default: [] } } },
        { block: { name: 'Container', fields: {}, slots: { default: [] } } },
        {
          block: {
            name: 'Container',
            fields: {},
            slots: { default: [{ block: { name: 'Button', fields: { label: 'Default label' }, slots: {} } }] },
          },
        },
      ],
    })
  })

  /*
  |--------------------------------------------------------------------------
  | Nested repeaters
  |--------------------------------------------------------------------------
  |
  */
  it('falls back values in nested repeaters (1)', async () => {
    const page = await $fetch('/api/insert-anything', {
      method: 'post',
      body: {
        collection: 'pages',
        data: {
          path: nanoid(),
          language: 'en',
          translations: nanoid(),
          blocks: JSON.stringify([
            {
              block: {
                name: 'NestedRepeaters',
                fields: {
                  repeater: [{}],
                },
              },
            },
          ]),
        },
      },
    })

    const response = await $fetch(`/api/collections/pages/${page.id}?select=blocks`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [
        {
          block: {
            name: 'NestedRepeaters',
            fields: {
              repeater: [{ text: 'foo', repeater: [] }],
            },
            slots: {},
          },
        },
      ],
    })
  })

  it('falls back values in nested repeaters (2)', async () => {
    const page = await $fetch('/api/insert-anything', {
      method: 'post',
      body: {
        collection: 'pages',
        data: {
          path: nanoid(),
          language: 'en',
          translations: nanoid(),
          blocks: JSON.stringify([
            {
              block: {
                name: 'NestedRepeaters',
                fields: {
                  repeater: [{ repeater: [{}] }],
                },
              },
            },
          ]),
        },
      },
    })

    const response = await $fetch(`/api/collections/pages/${page.id}?select=blocks`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      blocks: [
        {
          block: {
            name: 'NestedRepeaters',
            fields: {
              repeater: [{ text: 'foo', repeater: [{ text: 'bar' }] }],
            },
            slots: {},
          },
        },
      ],
    })
  })

  /*
  |--------------------------------------------------------------------------
  | Layouts
  |--------------------------------------------------------------------------
  |
  */
  it('requires layout when blocks are present', async () => {
    const response = await $fetch('/api/collections/pages/1?select=blocks', {
      method: 'patch',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'Button', fields: { label: 'Button label' } } }],
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ layout: 'This field is required' })
  })

  it('does not accept button block in special layout', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'Button', fields: { label: 'Button label' } } }],
        layout: 'special',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ 'blocks.0': "The block 'Button' is not allowed in the layout 'Special layout'" })
  })

  it('does not accept conditional logic block as root block in special layout', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [{ block: { name: 'ConditionalLogic', fields: { baz: 'baz' } } }],
        layout: 'special',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      'blocks.0': "The block 'Conditional logic' is not allowed as a root block in the layout 'Special layout'",
    })
  })

  it('does not accept button block as child block in special layout', async () => {
    const response = await $fetch('/api/collections/pages?select=blocks', {
      method: 'post',
      body: {
        path: nanoid(),
        blocks: [
          {
            block: {
              name: 'Container',
              fields: {},
              slots: { default: [{ block: { name: 'Button', fields: { label: 'Button label' } } }] },
            },
          },
        ],
        layout: 'special',
      },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      'blocks.0.slots.default.0': "The block 'Button' is not allowed in the layout 'Special layout'",
    })
  })
})
