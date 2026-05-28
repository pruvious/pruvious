# Layouts

Pruvious does not replace Nuxt layouts - it just gives you a hook to pick one per route. Everything you already know about [Nuxt layouts](https://nuxt.com/docs/4.x/guide/directory-structure/app/layouts) works as-is.

## How it fits together

Every routable collection and singleton can declare a `routing.layout` key. The resolved route exposes that key as `proute.layout`, and you pass it to `<NuxtLayout>`:

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

That is it. The middleware picks the route, the route knows its layout, and Nuxt does the rest.

## Setting the layout per collection

Add `routing.layout` to your collection or singleton definition. The value must match the name of a Vue file in `app/layouts/`.

```ts
// server/collections/Articles.ts
import { blocksField, defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({ required: true }),
    blocks: blocksField({}),
  },
  routing: {
    publicFields: ['title', 'blocks'],
    layout: 'article',
  },
})
```

With a layout file at `app/layouts/article.vue`:

```vue
<template>
  <div class="article-shell">
    <SiteHeader />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
```

The `routing.layout` field is typed against `LayoutKey` from `nuxt/app`, so your editor autocompletes it from the layouts you actually have. Adding a new file in `app/layouts/` automatically extends the type.

Singletons work the same way:

```ts
// server/singletons/Home.ts
import { blocksField, defineSingleton } from '#pruvious/server'

export default defineSingleton({
  fields: { blocks: blocksField({}) },
  routing: {
    publicFields: ['blocks'],
    layout: 'home',
  },
})
```

## Creating custom layouts

Put any Vue file in `app/layouts/`. Use `<slot />` for the page content - that is where `<NuxtLayout :name="proute?.layout">` will inject your page's template.

```vue
<!-- app/layouts/marketing.vue -->
<template>
  <div class="marketing">
    <NuxtLink to="/">
      <SiteLogo />
    </NuxtLink>
    <slot />
    <SiteFooter compact />
  </div>
</template>
```

Then reference it from any collection or singleton:

```ts
routing: {
  publicFields: ['blocks'],
  layout: 'marketing',
}
```

Multiple collections can share a layout, and different routes within the same collection can pick different layouts only if you split them into separate collections - one `layout` key per collection/singleton definition.

## Default Nuxt behavior still applies

If you do not set `routing.layout`, `proute.layout` is `undefined` and `<NuxtLayout :name="undefined">` picks the `default` layout (`app/layouts/default.vue` if present). You can also hardcode a layout:

```vue
<template>
  <NuxtLayout name="marketing">
    <PruviousBlocks field="blocks" />
  </NuxtLayout>
</template>
```

This is useful when you do not need per-route flexibility - for example, a single landing-page route.

## The dashboard layout

Pruvious ships three layouts that wrap the dashboard at `/dashboard`. They live under `app/layouts/pruvious/dashboard/` in the Pruvious layer and Nuxt registers them as `pruvious-dashboard-default-layout`, `pruvious-dashboard-blank-layout`, and `pruvious-dashboard-auth-layout`. You do not need to touch them for site building - they are only used by the dashboard itself. Mention them here purely so you do not get surprised by a `layouts/pruvious/` directory under the Pruvious layer.

If you want to change the dashboard's chrome (sidebar, header, branding), see the dashboard customization guide instead - it lives outside the routing pipeline.

## Per-collection dashboard layout

The `routing.layout` option is for your public site. Collections also accept `ui.indexPage.dashboardLayout`, `ui.createPage.dashboardLayout`, and `ui.updatePage.dashboardLayout` - those control how the dashboard renders the list, create, and edit pages of the collection. They are not Nuxt layouts; they are dashboard presets. The accepted values differ per page:

- `ui.indexPage.dashboardLayout` - `'standard'` or a path to a custom Vue component.
- `ui.createPage.dashboardLayout` and `ui.updatePage.dashboardLayout` - `'auto'`, `'standard'`, `'live-preview'`, or a path to a custom Vue component.

See the dashboard customization guide for details.

## See also

- [Routing](./routing.md) - how routes resolve and how `proute.layout` ends up populated
- [Nuxt layouts documentation](https://nuxt.com/docs/4.x/guide/directory-structure/app/layouts)
- [Preview](./preview.md) - if you use the `'live-preview'` dashboard layout, your public layout still renders inside the preview iframe
