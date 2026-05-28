# Custom pages

The dashboard is extensible. Any Vue component you drop into `app/pages/dashboard/` becomes a dashboard route, and a single `defineDashboardPage(...)` call wires it into the sidebar and the auth guard.

This page covers:

- Adding a custom page and giving it a URL.
- Customizing the menu entry.
- Protecting a page with permissions.
- Embedding Pruvious fields and helpers in your own UI.
- Composables you can use inside dashboard pages.
- A worked example: a "Statistics" page.

## File locations

Custom pages live next to the standard dashboard routes:

```
app/
  pages/
    dashboard/
      crm-integration.vue   # /dashboard/crm-integration
      reports/
        weekly.vue          # /dashboard/reports/weekly
```

The path segment after `/dashboard/` matches the file path on disk (kebab-cased automatically). You can override it explicitly through `defineDashboardPage`.

Pages are also resolved across Nuxt layers, so a base layer can ship a default set of dashboard pages and apps can add their own.

## `defineDashboardPage`

`defineDashboardPage` is a compiler macro - call it once inside `<script setup>`. It returns nothing at runtime; instead, the Pruvious module extracts the options at build time and registers the page in the dashboard menu.

```vue
<!-- app/pages/dashboard/crm-integration.vue -->
<template>
  <PruviousDashboardPage>
    <h1>CRM integration</h1>
    <!-- Your custom UI here -->
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { dashboardMiddleware, defineDashboardPage } from '#pruvious/dashboard'

defineDashboardPage({
  label: ({ __ }) => __('pruvious-dashboard', 'CRM integration'),
  icon: 'bolt',
  group: 'utilities',
  order: 10,
})

definePageMeta({
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
  ],
})

useHead({
  title: __('pruvious-dashboard', 'CRM integration'),
})
</script>
```

All options to `defineDashboardPage` are optional:

| Option | Description |
| --- | --- |
| `path` | URL segment after `/dashboard/`. Defaults to the kebab-cased filename. |
| `label` | Menu label. Either a string or a `({ __ }) => __('pruvious-dashboard', '...')` callback. Defaults to the Title-cased filename, translated with the `pruvious-dashboard` domain. |
| `icon` | Tabler icon name. Defaults to `tools`. See [Icons](./icons.md). |
| `group` | Sidebar group: `general`, `collections`, `management`, or `utilities`. Defaults to `general`. |
| `order` | Position inside the group; lower values come first. Items with the same order are sorted alphabetically. Defaults to `10`. |
| `permissions` | Visibility filter for the menu entry. See below. |

> [!TIP]
> The `label` callback must be a simple anonymous function with no closure over outer variables - the Pruvious build pipeline extracts it as a literal at compile time.

## Wiring the middleware

Each custom dashboard page must register two middlewares so it behaves like a built-in page:

```ts
definePageMeta({
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
  ],
})
```

- `default` initialises the dashboard state (auth, translations, toasts, layouts).
- `auth-guard` redirects unauthenticated visitors to the login page and blocks users without `access-dashboard`.

You can chain additional middlewares of your own as long as they come after `auth-guard`.

## Permissions

There are two layers of permission control:

### 1. Menu visibility

The `permissions` option on `defineDashboardPage` controls whether the menu entry appears, not whether the page is reachable. The structure is `(Permission | Permission[])[]`:

- The outer array is `AND` - all entries must match.
- An inner array is `OR` - at least one permission must match.

```ts
defineDashboardPage({
  // Visible to users that have ('foo' OR 'bar') AND 'baz'.
  permissions: [['foo', 'bar'], 'baz'],
})
```

### 2. Page access

To block access to the page itself, add a custom middleware that checks permissions and redirects when needed:

```ts
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'

definePageMeta({
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, hasPermission, puiQueueToast }) => {
        if (!hasPermission('manage-crm')) {
          puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
            type: 'error',
            description: __('pruvious-dashboard', 'You do not have access to this page'),
            showAfterRouteChange: true,
          })
          return navigateTo(dashboardBasePath + 'overview')
        }
      }),
  ],
})
```

## Working with fields

Custom pages are plain Vue components, but you can reuse the same field renderer the dashboard uses for collection forms.

### `<PruviousFields>`

Render an entire field set with `<PruviousFields>`. The component is the same renderer the built-in dashboard pages use, so it requires the full wiring (data container metadata, conditional logic resolver, errors object). The simplest working pattern mirrors the dashboard's own "My account" page:

```vue
<template>
  <PruviousDashboardPage>
    <PruviousFields
      v-if="data"
      v-model:conditionalLogic="conditionalLogic"
      v-model:modelValue="data"
      :conditionalLogicResolver="conditionalLogicResolver"
      :data="data"
      :errors="errors"
      :fields="fields"
      :layout="[{ card: ['subject', 'body'] }]"
      :syncedFields="[]"
      :translatable="false"
      dataContainerName="MyForm"
      dataContainerType="collection"
      operation="update"
    />

    <button class="pui-btn" @click="save">Save</button>
  </PruviousDashboardPage>
</template>
```

`<PruviousFields>` is a complex component - see `packages/pruvious/app/pages/dashboard/me.vue` for the canonical end-to-end example (history, conditional logic queueing, save handler).

`<PruviousFields>` honours the layout descriptors you would normally pass to `createPage.fieldsLayout` (rows, cards, tabs, `'---'` separators) via the `layout` prop.

### Frontend helpers

The same component family used by your storefront also works inside custom dashboard pages:

- `<PruviousEditableText>` - Inline editable text bound to a record field.
- `<PruviousHTML>` - Renders a rich text or HTML field value, sanitised.
- `<PruviousImage>` and `<PruviousPicture>` - Render images from the Uploads collection with automatic variants.
- `<PruviousBlocks>` - Renders a blocks field value (useful for previews).
- `<PruviousRichText>` - Stand-alone rich text renderer.

## Composables

Custom dashboard pages must explicitly import the helpers they use - Pruvious does not register these as Nuxt auto-imports. The ones most relevant for custom dashboard pages are:

| Helper | Description |
| --- | --- |
| `useAuth()` | Returns a `Ref` with `{ isLoggedIn, user, permissions }`. The user object is the populated `Users` record minus the `password` and `tokenSubject` fields. |
| `hasPermission(perm)` | Returns `true` when the current user has every requested permission. Pass a string or an array. |
| `useLanguage()` | Reactive `Ref<LanguageCode>` holding the active language for the page. |
| `__(domain, key, params?)` / `_(key, params?)` | Translation helpers - `__` takes a domain such as `pruvious-dashboard`, `_` uses the default domain. |
| `puiToast()` / `puiQueueToast()` | Show a toast immediately (`puiToast`) or queue one to be shown after the next route change (`puiQueueToast`, useful inside middleware). Both come from `@pruvious/ui/pui/toast`. |
| `pruviousGet`, `pruviousPost`, `pruviousPatch`, `pruviousDelete` | Typed wrappers around `$fetch` that hit the Pruvious REST API and attach the auth token. |
| `dashboardBasePath` | The resolved dashboard base path - use it when building dashboard URLs. |
| `dashboardMiddleware` | Helper to register Pruvious dashboard middlewares (see above). |

Imports come from three modules:

- `#pruvious/app` - Client-side helpers (`useAuth`, `hasPermission`, `useLanguage`, `__`, `_`, `pruviousGet`, ...).
- `#pruvious/dashboard` - Dashboard-specific helpers (`dashboardBasePath`, `dashboardMiddleware`, ...).
- `@pruvious/ui/pui/toast` - Toast helpers (`puiToast`, `puiQueueToast`).

A typical import block for a custom dashboard page:

```ts
import { __, useAuth, useLanguage, hasPermission, pruviousGet } from '#pruvious/app'
import { dashboardBasePath, dashboardMiddleware, defineDashboardPage } from '#pruvious/dashboard'
import { puiToast, puiQueueToast } from '@pruvious/ui/pui/toast'
```

## Example: a "Statistics" page

The page below counts records across a handful of collections, renders the totals as cards, and lets the user re-fetch on demand.

```vue
<!-- app/pages/dashboard/statistics.vue -->
<template>
  <PruviousDashboardPage>
    <header class="pui-stack-row pui-justify-between">
      <h1>{{ __('pruvious-dashboard', 'Statistics') }}</h1>
      <button class="pui-btn" :disabled="loading" @click="load">
        {{ __('pruvious-dashboard', 'Refresh') }}
      </button>
    </header>

    <section class="pui-grid pui-grid-cols-4 pui-gap-4">
      <article v-for="card in cards" :key="card.label" class="pui-card">
        <Icon :name="`tabler:${card.icon}`" class="pui-text-2xl" />
        <h2>{{ card.label }}</h2>
        <p class="pui-text-3xl">{{ card.value }}</p>
      </article>
    </section>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { dashboardMiddleware, defineDashboardPage, selectFrom } from '#pruvious/dashboard'
import { ref, onMounted, computed } from 'vue'

defineDashboardPage({
  label: ({ __ }) => __('pruvious-dashboard', 'Statistics'),
  icon: 'chart-bar',
  group: 'general',
  order: 4,
})

definePageMeta({
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
  ],
})

useHead({ title: __('pruvious-dashboard', 'Statistics') })

const loading = ref(false)
const totals = ref({ pages: 0, users: 0, uploads: 0, patterns: 0 })

const cards = computed(() => [
  { label: __('pruvious-dashboard', 'Pages'), icon: 'file', value: totals.value.pages },
  { label: __('pruvious-dashboard', 'Users'), icon: 'users', value: totals.value.users },
  { label: __('pruvious-dashboard', 'Uploads'), icon: 'photo', value: totals.value.uploads },
  { label: __('pruvious-dashboard', 'Patterns'), icon: 'puzzle', value: totals.value.patterns },
])

async function load() {
  loading.value = true
  try {
    const [pages, users, uploads, patterns] = await Promise.all([
      selectFrom('Pages').limit(1).paginate(),
      selectFrom('Users').limit(1).paginate(),
      selectFrom('Uploads').limit(1).paginate(),
      selectFrom('Patterns').limit(1).paginate(),
    ])
    totals.value = {
      pages: pages.success ? pages.data.total : 0,
      users: users.success ? users.data.total : 0,
      uploads: uploads.success ? uploads.data.total : 0,
      patterns: patterns.success ? patterns.data.total : 0,
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
```

The page reuses the dashboard's design tokens (`pui-*` classes), pulls an icon from Tabler via Nuxt Icon, and routes its API calls through `pruviousGet` so the auth token is attached automatically.

## Tips

- Wrap the page body in `<PruviousDashboardPage>` to inherit the standard padding, title bar, and breadcrumbs.
- Use `useHead({ title })` so the browser tab matches the menu label.
- Keep `defineDashboardPage` and `definePageMeta` next to each other - it makes the page intent obvious to other contributors.
- If you reference your own Vue components inside collection or singleton field options, use `resolvePruviousComponent('~/components/...')` so the component is registered with the dashboard build pipeline.
