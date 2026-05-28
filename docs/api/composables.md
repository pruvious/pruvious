# Composables

Pruvious exposes a small set of Vue composables and utility functions that wrap the [REST API](./rest.md) with typed clients, reactive state, and SSR-aware fetching. They live in three import paths:

| Import | Use in |
| :--- | :--- |
| `#pruvious/app` | Application code (pages, layouts, components) |
| `#pruvious/dashboard` | Dashboard-only code (custom pages, components) |
| `#pruvious/server` | Server handlers and jobs |

This page covers the client-side helpers from `#pruvious/app`.

## `useAuth()`

Reactive state for the current user.

```ts
const useAuth: () => Ref<{
  isLoggedIn: boolean
  user: User | null
  permissions: string[]
}>
```

The state is resolved automatically by the `pruvious` and `pruvious-auth` middleware.

```vue
<template>
  <p v-if="auth.isLoggedIn">Welcome, {{ auth.user.firstName }}</p>
  <NuxtLink v-else to="/login">Log in</NuxtLink>
</template>

<script setup lang="ts">
import { useAuth } from '#pruvious/app'

const auth = useAuth()
</script>
```

### `isLoggedIn()` and `getUser()`

Non-reactive helpers for procedural code:

```ts
import { getUser, isLoggedIn } from '#pruvious/app'

if (isLoggedIn()) {
  const user = getUser()
  console.log(user?.email)
}
```

### `hasPermission(...)`

Check one or many permissions:

```ts
import { hasPermission } from '#pruvious/app'

hasPermission('collection:articles:create')
hasPermission(['collection:users:read', 'collection:users:update'])
```

Returns `true` only when **all** listed permissions are present.

### Login / logout

The login endpoint is wrapped by `pruviousPost`:

```vue
<script setup lang="ts">
import { pruviousPost, refreshAuthState } from '#pruvious/app'

const body = ref({ email: '', password: '', remember: false })
const isDisabled = ref(false)
const inputErrors = ref<Record<string, string>>({})

async function submit() {
  const { success } = await pruviousPost('auth/login', {
    body,
    isDisabledRef: isDisabled,
    inputErrors,
  })

  if (success) {
    await refreshAuthState(true)
    await navigateTo('/dashboard')
  }
}
</script>
```

`refreshAuthState(force?)` re-fetches `/api/auth/state` and updates `useAuth()`. When called without `force`, it short-circuits when the token has not changed.

### Token management

The following utilities let you inspect or remove the current token:

```ts
import {
  getAuthTokenPayload,
  getAuthTokenExpiresIn,
  storeAuthToken,
  removeAuthToken,
} from '#pruvious/app'

getAuthTokenPayload()    // { sub, exp, iat } | null
getAuthTokenExpiresIn()  // milliseconds until expiry, or 0 if expired, or null if no token

storeAuthToken(token)    // Only used when `auth.tokenStorage` is 'localStorage'
removeAuthToken()        // Logs out client-side without a network call
```

To rotate the token on a schedule (e.g. before it expires), call `pruviousPost('auth/renew-token', ...)`.

## `usePruviousRoute()`

Reactive access to the resolved Pruvious route data for the current page.

```ts
const usePruviousRoute: <TRef = RouteReferenceName>() =>
  Ref<ResolvedRoute<TRef> | null>
```

The route is resolved by the `pruvious-route` (or `pruvious`) middleware against `/api/routes/...`. By the time your page renders, `usePruviousRoute()` contains the matched collection record (or singleton), its blocks, its SEO data, and metadata about the language.

```vue
<template>
  <article v-if="route">
    <h1>{{ route.data.title }}</h1>
    <pre>{{ route.language }} - {{ route.seo.url }}</pre>
  </article>
</template>

<script setup lang="ts">
import { usePruviousRoute } from '#pruvious/app'

const route = usePruviousRoute()
</script>
```

### `isPreview(route?)`

Check whether the current page is being rendered inside the dashboard preview iframe.

```ts
import { isPreview } from '#pruvious/app'

if (isPreview()) {
  // Disable analytics, fade in transitions, etc.
}
```

When called without arguments, `isPreview()` reads `useRoute()` automatically.

## `useLanguage()`

The active language code for the page.

```ts
const useLanguage: () => Ref<LanguageCode>
```

```vue
<script setup lang="ts">
import { useLanguage } from '#pruvious/app'

const language = useLanguage()
</script>
```

The language is resolved by middleware based on the URL prefix and the configured [`i18n` options](../reference/configuration.md#i18n).

### `extractLanguageCode(path)`

Pure function variant that picks the language out of a path string:

```ts
import { extractLanguageCode } from '#pruvious/app'

extractLanguageCode('/de/about') // 'de'
extractLanguageCode('/about')    // primary language
```

### Translations

```ts
import { __, preloadTranslatableStrings } from '#pruvious/app'

// In Vue components
const greeting = __('default', 'Welcome, $name!', { name: 'Alice' })

// Ahead of time, e.g. inside <script setup>
await preloadTranslatableStrings('shop', useLanguage().value)
```

`__('domain', 'key', placeholders?)` returns the translated string. If the domain has not been preloaded for the current language, call `preloadTranslatableStrings(domain, language)` first (or configure [`i18n.preloadTranslatableStrings`](../reference/configuration.md#i18n) so Pruvious does it for you).

## API client - `pruviousGet` / `pruviousPost` / `pruviousPatch` / `pruviousDelete`

Typed wrappers around Nuxt's `$fetch` for known Pruvious endpoints. They handle:

- The configured `pruvious.api.basePath`
- The `Accept-Language` header (from `useLanguage()`)
- The `Authorization: Bearer` header (when `auth.tokenStorage` is `localStorage`)
- Form-disabling via `isDisabledRef`
- Field-level error mapping via `inputErrors`

The signature for each is the same:

```ts
function pruviousPost<TRoute extends PruviousPostRoute>(
  route: TRoute,
  options: PruviousPostOptions<TRoute>,
): Promise<{
  success: true; data: PostResponse[TRoute]; error: undefined
} | {
  success: false; data: undefined; error: PruviousFetchError
}>
```

```vue
<script setup lang="ts">
import { pruviousPost } from '#pruvious/app'

const body = ref({ email: '', password: '', remember: false })
const isDisabled = ref(false)
const inputErrors = ref<Record<string, string>>({})

const { success, data, error } = await pruviousPost('auth/login', {
  body,
  isDisabledRef: isDisabled,
  inputErrors,
})

if (success) {
  console.log('Token:', data.token)
} else if (error.statusCode === 422) {
  // Field errors are also automatically written to `inputErrors`.
  console.warn(error.data)
}
</script>
```

The route argument is autocomplete-aware - if you have a typo, TypeScript catches it.

### `$pfetch` / `pruviousFetch`

For any route Pruvious does not already know about - your own endpoints under `server/api/` or `server/pruvious-api/`, third-party URLs, etc. - use `$pfetch`. The route type is `CustomRoutes` (anything that is not a built-in Pruvious endpoint). It applies the same headers but does not enforce a known route type:

```ts
import { $pfetch } from '#pruvious/app'

const result = await $pfetch('/api/my-custom-endpoint', {
  method: 'POST',
  body: { foo: 'bar' },
})
```

### `pruviousFetchHeaders(headers?)`

Generate the standard headers manually, useful if you are using `$fetch` directly:

```ts
import { pruviousFetchHeaders } from '#pruvious/app'

await $fetch('/api/something', { headers: pruviousFetchHeaders() })
```

## Collection query builder - client side

You can run reads from custom dashboard pages using the typed query builder. Imports come from `#pruvious/dashboard`:

```vue
<script setup lang="ts">
import { selectFrom } from '#pruvious/dashboard'

const { data: result } = await useAsyncData('articles', () =>
  selectFrom('Articles')
    .select(['id', 'title'])
    .where('status', '=', 'published')
    .orderBy('createdAt', 'desc')
    .all(),
)

// `result.value` is the QueryBuilderResult envelope { success, data, runtimeError, inputErrors }.
const articles = computed(() => (result.value?.success ? result.value.data : []))
</script>
```

This builder is intended for dashboard custom pages - it relies on dashboard-authenticated requests, not general app code. The same builder is also available from `#pruvious/server` for SSR-only access (where it skips the HTTP round-trip and talks to the database directly).

## Uploads - `upload()` and `useUpload()`

Both helpers live in `#pruvious/dashboard` because file uploads always go through dashboard-authenticated requests.

### `upload(files, options?)`

Promise-based upload. Returns the upload result(s). Automatically switches to multipart for files over the `multipartThreshold` (default `8 MB`).

```vue
<template>
  <input ref="input" type="file" multiple @change="onChange" />
</template>

<script setup lang="ts">
import { upload } from '#pruvious/dashboard'

const input = useTemplateRef('input')

async function onChange() {
  if (!input.value?.files?.length) return

  const results = await upload([...input.value.files], { returning: ['id', 'path'] })

  for (const result of results) {
    if (result.success) {
      console.log('Uploaded:', result.data.path)
    } else {
      console.warn(result.runtimeError)
    }
  }
}
</script>
```

### `useUpload(files, options?)`

Reactive wrapper. Returns refs for `status`, `progress`, and `result` so you can render progress bars and abort buttons.

```vue
<template>
  <div v-for="u in uploads" :key="u.file.file.name">
    <p>{{ u.file.file.name }} - {{ u.status.value }} - {{ (u.progress.value * 100).toFixed(0) }}%</p>
    <button :disabled="u.status.value !== 'uploading'" @click="u.abort">Abort</button>
  </div>
</template>

<script setup lang="ts">
import { useUpload, type UseUploadResult } from '#pruvious/dashboard'

const uploads = ref<UseUploadResult[]>([])

function start(files: FileList) {
  uploads.value = useUpload([...files])
}
</script>
```

### Other upload helpers

```ts
import {
  createUploadDirectory,
  moveUpload,
  updateUpload,
  deleteUpload,
  uploadExists,
} from '#pruvious/dashboard'

await createUploadDirectory('/blog/images')
await moveUpload('/old.jpg', '/new.jpg')
await updateUpload('/photo.jpg', { description: { en: 'Sunset' } })
await deleteUpload('/photo.jpg')
await uploadExists('/photo.jpg') // boolean
```

## Live preview - `usePreview()`

For block components that need to participate in the dashboard's live preview, import `usePreview` from `#pruvious/dashboard`. It returns refs and helpers for inserting, moving, duplicating, and selecting blocks; for managing focus; and for posting messages back to the dashboard window.

```vue
<script setup lang="ts">
import { usePreview } from '#pruvious/dashboard'

const preview = usePreview()
// preview.isPreview, preview.isEditable, preview.isFocused
// preview.insertBlock, preview.moveBlock, preview.deleteBlock
// preview.commitData, preview.undo, preview.redo
// ... and many more
</script>
```

See [Live preview](../building-sites/preview.md) for a guided tour.

## Next steps

- [REST API](./rest.md) - The endpoints behind these composables
- [Configuration reference](../reference/configuration.md) - Configure auth, i18n, uploads
- [Routing](../building-sites/routing.md) - Combine composables in real pages
