# Blocks

Blocks are Vue components with their own fields. They are the building bricks of Pruvious's content builder: editors pick blocks from a list, arrange them in a tree, fill in the fields, and your front end renders the result.

A page, a singleton's hero section, or any record with a `blocksField({})` is just an ordered list of blocks. Each block ships its own schema and its own template, so the editor sees a typed form and your site renders a real Vue component.

## Where blocks live

Block components live in `blocks/` relative to your `srcDir` (so `app/blocks/` in a standard Nuxt 4 layout). Every `.vue` file in that directory becomes a block, named after the file in PascalCase:

```
app/blocks/
  Hero.vue          -> Hero
  TwoColumns.vue    -> TwoColumns
  Cards/Item.vue    -> CardsItem
```

You can change the directory via `pruvious.dir.blocks` in `nuxt.config.ts`, and avoid name collisions with regular components via `pruvious.blocksPrefix`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    dir: { blocks: 'cms-blocks' },
    blocksPrefix: 'B',
  },
})
```

With `blocksPrefix: 'B'`, the block at `blocks/Hero.vue` is auto-registered as `<BHero />`.

## Anatomy of a block

A block is a single-file Vue component that calls `defineBlock` (for block metadata) and `defineProps` (for fields). Props defined with field functions become both the editor form and the runtime props your template receives.

```vue
<template>
  <section class="hero">
    <h1>{{ title }}</h1>
    <p v-if="subtitle">{{ subtitle }}</p>
    <PruviousImage v-if="image" :image="image" />
  </section>
</template>

<script lang="ts" setup>
import { defineBlock, imageField, textField } from '#pruvious/app'

defineBlock({
  ui: {
    icon: 'photo',
    label: ({ __ }) => __('pruvious-dashboard', 'Hero'),
    description: ({ __ }) =>
      __('pruvious-dashboard', 'A large headline with an optional image and subtitle.'),
  },
})

defineProps({
  title: textField({ required: true }),
  subtitle: textField({}),
  image: imageField({}),
})
</script>
```

That is the whole block. Pruvious will:

- Add an entry to the block picker labelled "Hero" with the `photo` icon.
- Generate a typed form (`title`, `subtitle`, `image`) when the block is inserted.
- Pass the populated field values as props to the component when the page is rendered.

> [!TIP]
> `defineBlock` is a compiler macro - it has no runtime value. All metadata lives in the macro call, and all field definitions live in `defineProps`.

See [Fields](../fields/index.md) for the list of field functions you can use inside `defineProps`.

## The `ui` options

The `ui` object controls how a block appears in the dashboard.

```ts
defineBlock({
  ui: {
    icon: 'photo',
    label: ({ __ }) => __('pruvious-dashboard', 'Hero'),
    description: ({ __ }) => __('pruvious-dashboard', 'A large headline.'),
  },
})
```

### `ui.icon`

A [Tabler icon](https://tabler-icons.io) name, or an object for dynamic icons based on a field value:

```ts
defineBlock({
  ui: {
    icon: {
      fieldName: 'type',
      iconMap: {
        image: 'photo',
        video: 'movie',
        embed: 'code',
      },
      defaultIcon: 'cube',
    },
  },
})

defineProps({
  type: selectField({
    choices: [
      { value: 'image', label: 'Image' },
      { value: 'video', label: 'Video' },
      { value: 'embed', label: 'Embed' },
    ],
  }),
})
```

With a dynamic icon, the block tree updates its icon as the editor changes the `type` field. The `defaultIcon` is used in the block picker popup and when no value matches.

### `ui.label`

A string or a translatable function. If you omit it, Pruvious converts the block's file name to Title case (`TwoColumns` becomes "Two columns") and wraps it in `__('pruvious-dashboard', ...)`.

```ts
// Non-translatable
ui: { label: 'Theme options' }

// Translatable
ui: { label: ({ __ }) => __('pruvious-dashboard', 'Theme options') }
```

### `ui.description`

A short blurb shown in the block picker, useful for explaining when to reach for the block.

### `ui.itemLabelConfiguration`

Controls how the block appears in the dashboard's block tree. Setting `fieldValue` makes the tree show the value of a field next to (or instead of) the block label - very useful for navigating large trees:

```ts
defineBlock({
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Hero'),
    itemLabelConfiguration: {
      showBlockLabel: true,
      fieldValue: 'title',
      stripHTML: true,
    },
  },
})
```

A "Hero" block whose `title` is "Welcome" would now appear as `Hero (Welcome)` in the tree.

## Block groups

Groups categorize blocks in the picker. Assign a block to a group via `defineBlock({ group })`:

```vue
<script lang="ts" setup>
import { defineBlock, textField } from '#pruvious/app'

defineBlock({
  group: 'heroes',
  ui: { icon: 'photo' },
})

defineProps({
  title: textField({ required: true }),
})
</script>
```

Groups split the block picker into sections, and let you reference a whole bunch of blocks with a single name when configuring `blocksField({})`.

### Defining custom groups

Custom groups are registered with the `blocks:groups` filter. Place the filter anywhere under `server/filters/`:

```ts
// server/filters/blockGroups.ts
import { addFilter } from '#pruvious/server'

export default addFilter('blocks:groups', (groups) => [
  ...groups,
  {
    name: 'heroes',
    label: ({ __ }) => __('pruvious-dashboard', 'Heroes'),
  },
  {
    name: 'special-offers',
    label: ({ __ }) => __('pruvious-dashboard', 'Special offers'),
  },
])
```

Group names use kebab-case. If you skip the `label`, the name is converted to Title case automatically.

## Block tags

Tags are similar to groups, but a block can have many of them. They are used to filter the block picker and to allow or deny blocks in a `blocksField({})`.

```ts
defineBlock({
  group: 'heroes',
  tags: ['layout', 'light-blue'],
})
```

Register custom tags with the `blocks:tags` filter:

```ts
// server/filters/blockTags.ts
import { addFilter } from '#pruvious/server'

export default addFilter('blocks:tags', (tags) => [
  ...tags,
  { name: 'layout' },
  { name: 'light-blue', label: ({ __ }) => __('pruvious-dashboard', 'Light blue') },
])
```

## Using blocks in a collection

To add a block-driven content area to a collection or singleton, add a `blocksField({})` to its fields:

```ts
// server/collections/Articles.ts
import { blocksField, defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({ required: true }),
    blocks: blocksField({}),
  },
})
```

You can filter which blocks are usable. The options accept block names, group names prefixed with `group:`, or tag names prefixed with `tag:`:

```ts
blocks: blocksField({
  allowRootBlocks: ['Hero', 'group:content', 'tag:layout'],
  denyRootBlocks: ['ProseNode'],
  allowNestedBlocks: '*',
  denyNestedBlocks: ['Hero'],
})
```

- `allowRootBlocks` and `denyRootBlocks` apply to the first level of the field (the blocks editors can add directly).
- `allowNestedBlocks` and `denyNestedBlocks` propagate down to every nested `blocksField({})` inside any of the root blocks.
- Set `allowRootBlocks` to `'*'` (the default) to allow every block.

Other useful options:

```ts
blocks: blocksField({
  minItems: 1,
  maxItems: 20,
  allowEmptyArray: false,
  deduplicateItems: false,
  enforceUniqueItems: false,
})
```

See [Fields](../fields/index.md) for the full list of common field options like `required`, `nullable`, and `conditionalLogic`.

## Nested blocks

A block can host its own children by declaring a `blocksField({})` inside `defineProps`. Render them with `<PruviousBlocks>` and the `field` prop pointing at the nested field name:

```vue
<template>
  <section class="columns">
    <div class="column">
      <PruviousBlocks field="left" />
    </div>
    <div class="column">
      <PruviousBlocks field="right" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock } from '#pruvious/app'

defineBlock({
  ui: { icon: 'columns' },
})

defineProps({
  left: blocksField({
    denyRootBlocks: ['TwoColumns'],
  }),
  right: blocksField({
    denyRootBlocks: ['TwoColumns'],
  }),
})
</script>
```

The `field` prop on `<PruviousBlocks>` is resolved relative to the parent block, so the children automatically pick up the right data from the current route. The deny lists set on a parent are merged into every nested `blocksField({})` underneath.

## Linked blocks

When you want to reuse a chunk of blocks across pages - a footer, a CTA, a marketing banner - store the blocks in a separate collection and reference them with `linkedBlocksField({})`. The Pruvious-provided [Patterns](./pages.md#patterns) collection is the typical target.

```ts
// server/collections/Articles.ts
import { defineCollection, linkedBlocksField, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({ required: true }),
    footer: linkedBlocksField({
      collection: 'Patterns',
      ui: {
        displayFields: ['title', 'description'],
        searchFields: ['title'],
      },
    }),
  },
})
```

The field stores a record id from the linked collection. When populated, it returns the linked record's `blocks` field inlined as if it lived on the current record - so on the front end you render it exactly the same way:

```vue
<template>
  <PruviousBlocks :blocks="article.footer" />
</template>
```

The default `blocksField` name on the target collection is `'blocks'`. Override it with the `blocksField` option if the target uses a different name.

## Rendering blocks

Use `<PruviousBlocks>` to render a list, and (less commonly) `<PruviousBlock>` to render a single block.

```vue
<template>
  <main>
    <PruviousBlocks field="blocks" />
  </main>
</template>
```

When you pass `field` (a dot-notation path), `<PruviousBlocks>` reads the blocks from the current route data via `usePruviousRoute()` and wires up the live editing data attributes used by the dashboard preview. This is the recommended usage inside page templates.

Alternatively, you can pass the blocks array yourself - useful for blocks coming from a query you ran by hand:

```vue
<template>
  <PruviousBlocks :blocks="page?.blocks ?? []" />
</template>

<script lang="ts" setup>
import { selectFrom } from '#pruvious/server'

const { data: page } = await useAsyncData('hero-page', async () => {
  const result = await selectFrom('Pages').where('id', '=', 1).populate().first()
  return result.success ? result.data : null
})
</script>
```

This pattern works in any server-rendered Nuxt page. The same `selectFrom` is also available from `#pruvious/dashboard` for custom dashboard pages.

Passing `:blocks` directly disables live editing for that area, since Pruvious can no longer map the rendered DOM back to a field path.

## Block component props

Inside a block's `<script setup>`, every field name defined in `defineProps` is available as a regular prop. In addition, Pruvious injects a few helpers prefixed with `_`:

- `_blockName` - the block's name (e.g. `'Hero'`).
- `_fieldPath` - the full dot-notation path to this block (e.g. `'blocks.0.left.2'`).
- `_parentBlocks` - an array of the parent blocks, root first.
- `_index` - the index of this block within its parent list.

You will rarely need these in normal templates, but they are handy when writing utilities that depend on the block's position in the tree.

## Next steps

- [Pages](./pages.md) - build full pages with blocks and the standard Pages collection.
- [Fields](../fields/index.md) - the full reference for `textField`, `imageField`, and the rest.
- [Collections](./collections.md) - learn how the `blocksField({})` fits into a wider schema.
