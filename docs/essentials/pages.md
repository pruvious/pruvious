# Pages

Most CMS sites are organized around pages: a URL, a title, some SEO metadata, a body assembled from blocks, and a flag for whether it is published. Pruvious ships with a ready-made `Pages` collection that gives you all of that out of the box, and a `Patterns` collection for reusable chunks of blocks.

This page covers the standard `Pages` collection, how to customize it via templates, and how it pairs with [Blocks](./blocks.md), [Routing](../building-sites/routing.md), and [SEO](../building-sites/seo.md).

## The standard Pages collection

A fresh Pruvious project comes with a `Pages` collection wired up by default at `server/collections/Pages.ts`:

```ts
import { defineCollectionFromTemplate } from '#pruvious/server'

export default defineCollectionFromTemplate('Pages', (template) => template)
```

That one-liner pulls in the `Pages` template provided by Pruvious. The template defines:

- A `blocks` field (a [`blocksField({})`](./blocks.md#using-blocks-in-a-collection) that excludes `Button` and `ProseNode` from the root, since those only make sense inside other blocks).
- Routing fields enabled via `routing`: `subpath`, `seo`, `isPublic`, `scheduledAt`.
- Authorship fields enabled by the template: `author` and `editors`.
- Auto-managed timestamps: `createdAt`, `updatedAt`.
- Translation fields auto-added because collections are `translatable` by default: `language`, `translations`.
- A `layout` of `'page'`, which tells the router which `NuxtLayout` under `app/layouts/` to render.

Concretely, that gives every page record:

- A URL derived from `subpath` (an empty string means the front page).
- An ordered array of blocks in `blocks`.
- SEO data via the `seo` object field (title, description, indexability, ...).
- Publishing controls: `isPublic` and `scheduledAt`.
- Authorship: who created it, who can edit it.
- Multilingual variants linked via `translations` when languages are configured.

You do not have to do anything for any of this to work - the default Pages collection is already enabled.

## How routing works

Every page in the `Pages` collection becomes a route automatically. The router looks at the incoming URL, finds the page whose `subpath` matches, and renders the `NuxtLayout` named by the collection's `routing.layout`.

You wire this up with two files: a catch-all Nuxt page that opts into the `pruvious` middleware, and one Nuxt layout per `routing.layout` value.

Create the catch-all page at `app/pages/[...slug].vue`:

```vue
<template>
  <NuxtLayout :name="proute?.layout">
    <PruviousBlocks field="blocks" />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/app'

definePageMeta({ middleware: ['pruvious'] })

const proute = usePruviousRoute()
</script>
```

For the default `Pages` collection the layout key is `'page'`, so create `app/layouts/page.vue`:

```vue
<template>
  <main>
    <slot />
  </main>
</template>
```

`usePruviousRoute()` exposes the matched record. In the templates above, `<PruviousBlocks field="blocks">` reads the blocks array from that record automatically. You can also reach for the record directly:

```vue
<template>
  <NuxtLayout :name="proute?.layout">
    <h1>{{ proute?.data?.seo?.title }}</h1>
    <PruviousBlocks field="blocks" />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/app'

definePageMeta({ middleware: ['pruvious'] })

const proute = usePruviousRoute()
</script>
```

See [Routing](../building-sites/routing.md) for how subpaths are resolved, how 404s are handled, and how to mix routable collections.

## Customizing the Pages collection

You customize `Pages` by editing `server/collections/Pages.ts`. The second argument to `defineCollectionFromTemplate` lets you spread the template options and override anything you need:

```ts
import {
  defineCollectionFromTemplate,
  selectField,
  textField,
} from '#pruvious/server'

export default defineCollectionFromTemplate('Pages', (template) => ({
  ...template,
  fields: {
    ...template.fields,
    summary: textField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Summary'),
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Shown in list views and feeds.'),
      },
    }),
    audience: selectField({
      choices: [
        { value: 'public', label: 'Public' },
        { value: 'members', label: 'Members only' },
      ],
      default: 'public',
    }),
  },
  ui: {
    ...template.ui,
    indexPage: {
      dataTable: {
        columns: [
          'seo',
          'subpath | 16rem',
          'audience | 10rem',
          'isPublic | 8rem',
          'updatedAt | 12rem',
        ],
      },
    },
  },
}))
```

Anything you do not override - the `blocks` field, routing, `isPublic`, `scheduledAt`, `author`, `editors`, SEO - keeps the template's defaults.

To customize the editor layout, override `ui.updatePage.fieldsLayout`:

```ts
import { defineCollectionFromTemplate } from '#pruvious/server'

export default defineCollectionFromTemplate('Pages', (template) => ({
  ...template,
  ui: {
    ...template.ui,
    updatePage: {
      fieldsLayout: [
        'blocks',
        '---',
        {
          tabs: [
            {
              label: ({ __ }) => __('pruvious-dashboard', 'SEO'),
              fields: ['seo'],
            },
            {
              label: ({ __ }) => __('pruvious-dashboard', 'Publishing'),
              fields: ['subpath', 'isPublic', 'scheduledAt'],
            },
          ],
        },
      ],
    },
  },
}))
```

See [Collections](./collections.md) for the full set of options you can pass to a collection definition.

## Multiple page-like collections

Templates are reusable. If you want, say, a `LandingPages` collection that uses the same routing and block setup but lives at a different URL prefix, define another collection from the same template:

```ts
// server/collections/LandingPages.ts
import { defineCollectionFromTemplate } from '#pruvious/server'

export default defineCollectionFromTemplate('Pages', (template) => ({
  ...template,
  routing: {
    ...template.routing,
    layout: 'landing-page',
  },
  ui: {
    ...template.ui,
    label: ({ __ }) => __('pruvious-dashboard', 'Landing pages'),
    icon: 'rocket',
  },
}))
```

Make sure the matching `app/layouts/landing-page.vue` layout exists - the layout name is the value you set in `routing.layout`, not a Nuxt page path. You can write your own templates under `server/templates/` too - see [Standard collections](../reference/standard-collections.md).

## Patterns

`Patterns` is a second collection that ships with Pruvious. It is a place to store reusable groups of blocks - a CTA, a footer, a pricing table - that can be embedded in pages without copy-pasting.

The default definition mirrors `Pages`:

```ts
// server/collections/Patterns.ts
import { defineCollectionFromTemplate } from '#pruvious/server'

export default defineCollectionFromTemplate('Patterns', (template) => template)
```

The template gives each pattern:

- A required `title` (used to identify the pattern in the dashboard).
- An optional `description` (notes for editors).
- A `blocks` field that denies `Pattern` and `ProseNode` at the root, and denies `Pattern` for nested blocks too (so patterns cannot recursively embed themselves).
- Routing fields, but with `isPublic` always forced to `false` - patterns are not directly browsable URLs.

Use a pattern from a page in two ways:

1. **Inside the editor** - The `Pattern` block (provided out of the box) lets editors pick a pattern record and inline its blocks. No code required.
2. **From a field** - Use [`linkedBlocksField({})`](./blocks.md#linked-blocks) on a collection or block to attach a specific pattern's blocks to a field:

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

   When populated, the field returns the linked pattern's blocks array, ready to render with `<PruviousBlocks :blocks="article.footer" />`.

## A typical page lifecycle

Putting it all together, the steps to add a page to a fresh project are:

1. Build the blocks editors will use. Drop Vue components into `app/blocks/` - see [Blocks](./blocks.md).
2. Create the catch-all Nuxt page at `app/pages/[...slug].vue`:

   ```vue
   <template>
     <NuxtLayout :name="proute?.layout">
       <PruviousBlocks field="blocks" />
     </NuxtLayout>
   </template>

   <script lang="ts" setup>
   import { usePruviousRoute } from '#pruvious/app'

   definePageMeta({ middleware: ['pruvious'] })

   const proute = usePruviousRoute()
   </script>
   ```

3. Create the matching layout at `app/layouts/page.vue`:

   ```vue
   <template>
     <main>
       <slot />
     </main>
   </template>
   ```

4. Open `/dashboard/collections/pages`, add a page, fill in the `subpath`, drop blocks into the content area, set `isPublic` to `true`, and save.
5. Visit the URL - the page is live. The `pruvious` middleware already takes care of SEO meta tags via `resolvePruviousRoute()`.

Nothing else is required. The `Pages` collection, the blocks field, the routing, the API endpoints, and the dashboard form are all generated from the four lines of `server/collections/Pages.ts`.

## Next steps

- [Blocks](./blocks.md) - design the components editors will assemble pages from.
- [Routing](../building-sites/routing.md) - how subpaths, redirects, and 404s are resolved.
- [SEO](../building-sites/seo.md) - meta tags, structured data, and the sitemap.
- [Collections](./collections.md) - the underlying primitive that `Pages` is built on.
- [Standard collections](../reference/standard-collections.md) - reuse the `Pages` template for other page-like collections.
