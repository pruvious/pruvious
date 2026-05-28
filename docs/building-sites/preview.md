# Live preview

Pruvious ships a live preview mode that lets editors see their changes inside the real front-end - same layout, same blocks, same CSS - while they edit. No separate "preview render" template.

## How it works

When an editor opens a record in the dashboard, the dashboard mounts your site in an iframe. The iframe loads a special path (`/_pruviousPreview`) and hydrates the page with the in-progress edit buffer rather than the saved database row. Mutations in the dashboard (typing, dragging blocks, picking media) are messaged into the iframe in real time.

The flow:

1. The dashboard opens `<your site>/_pruviousPreview` inside an iframe.
2. The iframe runs the `pruvious` middleware, which detects preview mode via `isPreview(route)`.
3. `resolvePruviousRoute` skips the normal route fetch and runs `initializePreview()` instead.
4. `initializePreview()` wires up event listeners and `postMessage` channels between the iframe and its parent (the dashboard).
5. The dashboard pushes the edit buffer into the iframe, the iframe renders it, and edits flow back via `commitData()`.

Your page component does not need to know any of this. Render the route as usual and the same template renders in preview.

## The `isPreview()` check

If you need to branch on preview mode (e.g. disable analytics, show a "preview" banner, suppress click handlers), import `isPreview()`:

```vue
<template>
  <div>
    <div v-if="preview" class="preview-banner">
      Editing preview
    </div>
    <PruviousBlocks field="blocks" />
  </div>
</template>

<script lang="ts" setup>
import { isPreview } from '#pruvious/app'

definePageMeta({ middleware: ['pruvious'] })

const preview = isPreview()
</script>
```

`isPreview()` returns `true` only when:

- The current path is `/_pruviousPreview`, AND
- The page is loaded inside an iframe whose parent's origin matches the current origin AND its pathname starts with the configured dashboard base path (default `/dashboard/`).

This prevents anyone from forcing the site into preview mode from the outside.

## `noindex` for preview

The middleware always emits `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">` for preview pages. Even if the path leaks into Google's crawler somehow, it will not be indexed.

If you also pass `seo: false` to `resolvePruviousRoute()` (e.g. from a custom middleware), the robots tag is suppressed - you are on your own for indexability.

## Token-based preview access

The dashboard authenticates editors via the standard auth token (cookies by default). For an editor to see drafts inside the preview iframe on the initial HTML response, the token has to be readable by the server on first paint - so the auth config must use cookies, not `localStorage`:

```ts
export default defineNuxtConfig({
  pruvious: {
    auth: {
      tokenStorage: 'cookies', // required for live preview
    },
  },
})
```

With `localStorage`, the server cannot see the token on the first request, the page cache may serve an anonymous (published-only) response, and the editor will not see drafts until client-side hydration replaces it. Cookies avoid that flash.

The `preview-drafts` permission controls who can see drafts in preview. Pruvious does not seed any roles - assign `preview-drafts` to any role you create whose members should see in-progress content. The page cache bypasses caching whenever any auth token is present, so logged-in editors always see fresh content.

## Using the preview composable

If you build custom block-aware UI (sidebars, inspectors, overlays) that need to live inside the preview iframe, use `usePreview()`:

```ts
import { usePreview } from '#pruvious/dashboard'

const preview = usePreview()

preview.isPreview // Ref<boolean>
preview.isEditable // can the editor mutate blocks?
preview.focusedBlocks // currently focused blocks
preview.highlightedBlocks // currently highlighted blocks
preview.selectBlock(path) // select a block by dot-path
preview.commitData() // push current data to the dashboard
```

The composable exposes block management (`insertBlock`, `moveBlock`, `duplicateBlock`, `deleteBlock`, ...), focus management (`focusEditableField`, `focusNextEditableField`, ...), DOM helpers, and the `messageDashboard()` channel. See the source of `usePreview()` and its `UsePreview` interface for the full surface area.

For ordinary page templates you do not need any of this - `PruviousBlocks`, `PruviousImage`, and the rest already integrate with preview.

## Disabling preview for a page

If a route should never be opened in preview (e.g. an external-only thank-you page), there is nothing to do at the route level - the dashboard simply will not offer a preview button for collections without `dashboardLayout: 'live-preview'`.

If you have a `live-preview` collection but want to suppress preview behavior for a specific page template, branch on `isPreview()`:

```vue
<template>
  <NuxtLayout>
    <div v-if="preview" class="empty-preview">
      Preview not supported for this page.
    </div>
    <ExternalEmbed v-else :data="proute?.data" />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { isPreview, usePruviousRoute } from '#pruvious/app'

definePageMeta({ middleware: ['pruvious'] })

const proute = usePruviousRoute()
const preview = isPreview()
</script>
```

## See also

- [Routing](./routing.md) - how the middleware decides whether to run preview or the regular resolver
- [Layouts](./layouts.md) - the layout chosen by `routing.layout` is the same one preview renders
- [SEO](./seo.md) - preview always emits a `noindex` robots tag
