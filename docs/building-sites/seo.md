# SEO, sitemap, robots

Pruvious ships an SEO singleton, per-route and per-record SEO overrides, automatic head-tag injection, JSON-LD structured data, a `/sitemap.xml`, and a `/robots.txt`. Most sites need zero custom code.

## The SEO singleton

The `SEO` singleton is a built-in record that holds site-wide defaults. Editors fill it in once via the dashboard at `/dashboard/singletons/seo`. Its fields:

- `baseURL` - the root URL of your site (e.g. `https://example.com`). Required for absolute URLs in `og:image`, `canonical`, `hreflang`, and the sitemap.
- `baseTitle` - the site title appended to (or prepended to) every page title.
- `titleSeparator` - the string between `pageTitle` and `baseTitle`. Defaults to `' | '`.
- `baseTitlePosition` - `'before'` or `'after'`. Controls where the base title goes relative to the page title.
- `isIndexable` - the master switch. When `false`, every page emits `noindex, nofollow` regardless of per-route settings.
- `sharingImage` - the default Open Graph / Twitter image.
- `metaTags` - additional `<meta>` tags applied to every page.
- `logo` - used in JSON-LD `Organization.logo`.
- `favicon` - rendered as `<link rel="icon">`.
- `socialLinks` - public profile URLs, emitted as `sameAs` entries in JSON-LD.

When you run a multi-language site each language has its own SEO settings, except for `baseURL`, `logo`, `favicon`, and `socialLinks`, which are synced across languages.

## Per-route SEO

The `Routes` collection has a `seo{LANG}` field. Editors can override the page title, description, sharing image, indexability, canonical URL, and meta tags for a specific route.

## Per-record SEO

Routable collections opt in by setting `routing.seo` on the collection:

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
    isPublic: true,
    seo: true, // adds a per-record `seo` field
  },
})
```

Each record then gets its own `seo` object. Per-record SEO wins over per-route SEO, which wins over the SEO singleton.

You can also pass an object to `routing.seo` to configure how the SEO field appears in the dashboard data table - see the SEO field preset documentation.

## How head tags are emitted

When `pruvious.routing.seo` is `true` (the default), the `pruvious` and `pruvious-route` middleware call `useHead()` with:

- `title` - composed from `pageTitle`, `titleSeparator`, and `baseTitle`.
- `htmlAttrs.lang` - the resolved language code.
- `meta` - description, `og:*`, `twitter:*`, `robots`, plus any custom entries.
- `link` - `canonical`, `alternate` hreflangs, and `icon`.
- `script` - JSON-LD blocks for `Organization`, `WebSite`, and `WebPage` / `Article`.

If you want to manage the head yourself for a specific page, pass `seo: false` to `resolvePruviousRoute()`, or set `routing.seo: false` globally.

## Open Graph and Twitter

The middleware emits a baseline of Open Graph (`og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`, `og:locale`, `og:image*`) and Twitter (`twitter:title`, `twitter:description`, `twitter:card`, `twitter:image*`) tags.

When `sharingImage` is set, the card type is automatically `summary_large_image`. The Open-Graph-family keys are emitted with the `property` attribute and Twitter keys with `name` - the normalizer fixes the attribute if an editor picked the wrong one in the dashboard, so meta tags never silently get ignored.

Adding a custom `metaTags` entry with the same `attribute:key` pair overrides the baseline. For example, setting `property:og:image` from a custom field replaces the auto-derived image and suppresses its companion `og:image:width`, `og:image:height`, `og:image:type`, and `og:image:alt` tags.

## Canonical URLs and indexability

`isIndexable` is patched across three layers:

- SEO singleton's `isIndexable` (master switch per language)
- `Routes` row's `seo{LANG}.isIndexable`
- The record's `seo.isIndexable` (when `routing.seo` is enabled)

If any layer says `false`, the route emits `noindex, nofollow`.

Setting a `canonicalURL` on a route or record:

- changes the `<link rel="canonical">` target
- drops `hreflang` alternates from the head (a canonical override is a duplicate declaration)
- excludes the URL from the sitemap

Canonical can be an external URL or an internal `rel://` link.

## Alternates and hreflang

When the SEO singleton has `baseURL` configured and the route is not flagged as a canonical duplicate, the middleware emits `<link rel="alternate" hreflang>` for every configured language, plus an `x-default` pointing at the primary language. Translations resolve through the `Routes` collection - missing translations are skipped.

## JSON-LD structured data

Every page gets a `WebPage` (or `Article` when `og:type=article`) entry. Pages also get an `Organization` and `WebSite` entry when the SEO singleton has `baseURL` and `baseTitle` set. The `Organization` includes `logo` (if uploaded) and `sameAs` (from `socialLinks`).

You can append your own JSON-LD via `useHead({ script: [...] })` from your page component - the auto entries do not get in the way.

## `/sitemap.xml`

Pruvious serves a sitemap at the site root. By default it is paginated with up to 5,000 URLs per file - if your site grows past that, `/sitemap.xml` becomes a sitemap index linking `/sitemap-1.xml`, `/sitemap-2.xml`, ...

```ts
// Disable the built-in sitemap and serve your own.
export default defineNuxtConfig({
  pruvious: {
    routing: {
      sitemap: false,
    },
  },
})
```

```ts
// Or tune the page size (Google rejects single files over 50,000 URLs).
export default defineNuxtConfig({
  pruvious: {
    routing: {
      sitemap: { perPage: 10000 },
    },
  },
})
```

The sitemap automatically excludes:

- Routes flagged `noindex` at any layer
- Routes/records with a `canonicalURL` override (those advertise themselves as duplicates)
- Routes/records in languages where the SEO singleton's master switch is off
- Unpublished records (`isPublic` is `false`). The sitemap does not gate on `scheduledAt` itself - records become eligible the moment the 60-second `pruvious-publish-scheduled-pages` job flips their `isPublic` to `true`.

URLs include `<lastmod>` when the source record or route has an `updatedAt` timestamp.

## `/robots.txt`

```ts
export default defineNuxtConfig({
  pruvious: {
    routing: {
      // Disable the built-in /robots.txt and serve your own.
      robots: false,
    },
  },
})
```

The default `/robots.txt` is generated from the SEO singleton's `isIndexable` per language:

- If at least one language is visible, it emits `Allow: /`.
- If every language is hidden, it emits `Disallow: /`.
- When `baseURL` is set on the SEO singleton and `routing.sitemap` is not `false`, a `Sitemap:` line points at `/sitemap.xml`. Both conditions must be met.

## Configuration recap

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    routing: {
      seo: true, // emit head tags via useHead (default: true)
      sitemap: { perPage: 5000 }, // or `false` to disable
      robots: true, // or `false` to disable
    },
  },
})
```

Per-page opt-out, from a page component:

```ts
import { resolvePruviousRoute } from '#pruvious/app'

definePageMeta({
  middleware: defineNuxtRouteMiddleware(async (to) => {
    const redirect = await resolvePruviousRoute(to, { seo: false })
    if (redirect) return navigateTo(redirect.to, redirect)
  }),
})
```

## See also

- [Routing](./routing.md) - the route resolution pipeline and the `ResolvedRoute` shape
- [Preview](./preview.md) - preview routes are always `noindex, nofollow, noarchive`
