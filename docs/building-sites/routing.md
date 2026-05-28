# Routing

Pruvious owns the URL space of your site. Every public URL is a row in the `Routes` collection - and every row points at either a singleton (for one-off pages like a home page or contact page) or one or more collections (for dynamic content like blog posts, products, or docs).

This means you have one place to manage URLs, redirects, drafts, scheduled publishing, and per-language paths - no `[slug].vue` file in `app/pages` required.

## How a request becomes a page

When a browser requests `/blog/hello-world`, here is what happens:

1. The `pruvious-route` middleware (or the combined `pruvious` middleware) runs on the matched Nuxt page.
2. It calls `resolvePruviousRoute(route)` which fetches `{apiBasePath}routes/blog/hello-world` (e.g. `/api/routes/blog/hello-world` with the default `apiBasePath` of `/api/`; the base path is configurable).
3. The server walks the `Routes` collection looking for the best matching path, resolves the language, applies any redirects, and returns a `ResolvedRoute`.
4. The result is stored in the `usePruviousRoute()` composable.
5. Your page component reads it and renders.

```vue
<template>
  <NuxtLayout :name="proute?.layout">
    <h1>{{ proute?.seo.title }}</h1>
    <PruviousBlocks field="blocks" />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/app'

definePageMeta({
  middleware: ['pruvious'],
})

const proute = usePruviousRoute()
</script>
```

404s, redirects, trailing-slash normalization, and SEO head-tag emission all happen inside `resolvePruviousRoute()`, which the middleware invokes - see [SEO](./seo.md) for the head-tag details.

## The `Routes` collection

`Routes` is a built-in collection that ships with Pruvious. Each row represents one URL path (or a base path that records hang off of) and stores:

- `path{LANG}` - the per-language URL path (e.g. `/blog`, `/de/blog`)
- `isPublic{LANG}` - whether the route is published in that language
- `scheduledAt{LANG}` - optional publish-at timestamp. Route resolution and sitemap inclusion only check `isPublic{LANG}` directly. A built-in 60-second sweep job (`pruvious-publish-scheduled-pages`) flips `isPublic{LANG}` to `true` once the timestamp elapses, which is what actually makes the route visible.
- `seo{LANG}` - per-language SEO overrides
- `redirects{LANG}` - regex-based redirect rules
- `cacheRules{LANG}` - per-route [page-cache](../features/caching.md) overrides
- `referencedSingleton` - the singleton this route renders (e.g. `Home`)
- `referencedCollections` - the collections this route exposes (e.g. `Pages`, `Articles`)

You manage routes in the dashboard at `/dashboard/collections/routes`. The list view doubles as a sitemap.

## Routable singletons

A singleton serves a single URL. Add `routing` to the singleton definition and link a `Routes` row to it via `referencedSingleton`.

```ts
// server/singletons/Home.ts
import { blocksField, defineSingleton } from '#pruvious/server'

export default defineSingleton({
  fields: {
    blocks: blocksField({}),
  },
  routing: {
    publicFields: ['blocks'],
    layout: 'page',
  },
})
```

Then create a `Routes` row in the dashboard, set the path to `/`, and pick `Home` from the singleton dropdown. Done.

## Routable collections

A collection serves many URLs - one per record. Add `routing` to the collection definition and set up a base `Routes` row that lists the collection under `referencedCollections`.

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
    subpath: { allowEmptyString: false },
    isPublic: true,
    scheduledAt: true,
    seo: true,
    layout: 'article',
  },
})
```

What this enables:

- A `subpath` field is added to every record (the last segment of the URL, like `hello-world`).
- An `isPublic` boolean controls draft/published state.
- An optional `scheduledAt` timestamp delays publication.
- An `seo` object lets editors override SEO per record.
- The `layout` key is exposed on the resolved route so your page component can pick the right `<NuxtLayout>`.

In the dashboard, you would then create a `Routes` row with `path` = `/blog` and `referencedCollections` = `['Articles']`. From that point on, each `Articles` record with `subpath = 'hello-world'` resolves at `/blog/hello-world`.

> [!TIP]
> A collection and a singleton can share the same content shape. The difference is cardinality - one URL vs. many.

## `usePruviousRoute()`

This composable returns the resolved route as a `Ref<ResolvedRoute | null>`. It is populated by the `pruvious` and `pruvious-route` middleware - you typically just read it.

```ts
import { usePruviousRoute } from '#pruvious/app'

const proute = usePruviousRoute()
```

You can constrain the reference type for stronger typing on `data`:

```ts
import { usePruviousRoute } from '#pruvious/app'

const proute = usePruviousRoute<'Articles'>()
// proute.value.data is now typed as the public fields of Articles
```

When the reference name collides with a same-named singleton, the singleton is suffixed: `usePruviousRoute<'Pages:Singleton'>()`.

## The `ResolvedRoute` shape

```ts
interface ResolvedRoute<TRef> {
  // Language code of the current route (e.g. 'en', 'de-AT').
  language: LanguageCode

  // URLs of this route in other languages. `null` when the translation does not exist, or when it is unpublished and the viewer does not have the `preview-drafts` permission.
  translations: Record<LanguageCode, string | null>

  // Resolved SEO data - see the SEO guide.
  seo: ResolvedRouteSEO

  // The reference name. `Pages`, `Articles`, `Home`, ...
  ref: TRef

  // The `routing.publicFields` of the matched singleton or record.
  data: PopulatedFields

  // The layout key from the matched collection or singleton.
  layout?: LayoutKey

  // A 302 path used to normalize letter case (issued by the middleware automatically).
  softRedirect?: string
}
```

Use it freely in your page component:

```vue
<template>
  <NuxtLayout :name="proute?.layout">
    <article>
      <h1>{{ proute?.data.title }}</h1>
      <p>{{ proute?.seo.description }}</p>

      <nav v-if="hasTranslations">
        <template v-for="(href, code) in proute?.translations" :key="code">
          <NuxtLink v-if="href" :to="href">{{ code }}</NuxtLink>
        </template>
      </nav>
    </article>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/app'

definePageMeta({ middleware: ['pruvious'] })

const proute = usePruviousRoute<'Articles'>()
const hasTranslations = computed(() => Object.values(proute.value?.translations ?? {}).some(Boolean))
</script>
```

## Redirects

Each `Routes` row carries a `redirects{LANG}` repeater field. Each entry has:

- `match` - a RegExp pattern matched against the path tail (the portion after the route's `path`). Leave empty to match the route itself.
- `to` - the destination. Absolute URLs go to external sites, paths starting with `/` become root-relative, and bare strings are joined to the current route path.
- `code` - `301` or `302`.
- `forwardQueryParams` - when `true`, the incoming query string is appended to the destination.

`$1`, `$2`, ... in `to` reference capture groups from `match`. For example:

- `match`: `^report-(\d+)-2024$`
- `to`: `archive/reports/2024/$1`

routes `/blog/report-7-2024` to `/blog/archive/reports/2024/7`.

By default the client middleware follows redirects via `navigateTo`. Set `routing.followRedirects: false` to disable automatic redirects - in that case `usePruviousRoute()` is cleared and the composable will not expose the redirect data. To inspect the `SimpleRedirect` yourself, call `resolvePruviousRoute()` directly from your own middleware or page setup.

## Internal links: the `rel://` protocol

Pruvious internal links are stored as `rel://` URLs so that records survive when paths change. The format is:

```
rel://Routes:{routeId}/{Collection}:{recordId}@{language}?{query}#{hash}
```

Example: `rel://Routes:1/Articles:42@de` resolves to `/de/blog/mein-artikel`.

These get auto-resolved when populated by the query builder. You rarely write them by hand - the link field picker handles the bookkeeping in the dashboard. See the link field documentation for the full story.

## `routing` config options

Tune routing behavior in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    routing: {
      // Add or strip a trailing slash on all routes. Defaults to `false` (no slash).
      // Mismatched requests are 301'd to the canonical form.
      trailingSlash: false,

      // Whether the client middleware should automatically follow redirects via `navigateTo`.
      // Disable if your app wants to handle redirects manually.
      followRedirects: true,

      // Whether to emit SEO head tags via `useHead()`. See the SEO guide.
      seo: true,

      // The `/sitemap.xml` and `/robots.txt` handlers - see the SEO guide.
      sitemap: { perPage: 5000 },
      robots: true,
    },
  },
})
```

## Page caching

Anonymous responses for public routes are cached at the edge of Pruvious's request pipeline. Per-route overrides live on the `cacheRules{LANG}` field of each `Routes` row, and global defaults live in `cache.page`. See the caching guide for the full picture.

## See also

- [Layouts](./layouts.md) - how the `routing.layout` key plugs into Nuxt layouts
- [SEO](./seo.md) - the SEO singleton, per-route SEO, and the sitemap
- [Preview](./preview.md) - live editor preview that reuses the same routing pipeline
