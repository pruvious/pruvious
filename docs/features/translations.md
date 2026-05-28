# Translations

Pruvious i18n covers two related but distinct concerns:

1. **Translatable content** - per-language fields on collection records and singletons (the title of a blog post, the body of a marketing page, the value of a settings field).
2. **Translatable strings** - the UI strings you sprinkle through your app and the dashboard (labels, error messages, button text).

Both share the same languages list and the same fallback rules, but they are stored differently and consumed through different APIs.

## Configuring languages

Languages live under `pruvious.i18n` in `nuxt.config.ts`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  pruvious: {
    i18n: {
      languages: [
        { name: 'English', code: 'en' },
        { name: 'Deutsch', code: 'de' },
        { name: 'Français', code: 'fr' },
      ],
      primaryLanguage: 'en',
      prefixPrimaryLanguage: false,
      fallbackLanguages: ['en'],
    },
  },
})
```

- **languages** - The full set of supported languages. The order matters: the first entry is treated as primary unless you override with `primaryLanguage`. Each language has a display `name` (shown in the dashboard and language switchers) and a `code` (used in URLs, the `lang` HTML attribute, and APIs).
- **primaryLanguage** - The default language. Must match one of the codes above. When `null`, the first language in `languages` is used.
- **prefixPrimaryLanguage** - When `false` (default), the primary language has no URL prefix (`/about`) and other languages do (`/de/about`). When `true`, every language is prefixed (`/en/about`, `/de/about`).
- **fallbackLanguages** - The languages to fall back to when content or a string is missing in the current language. Defaults to the hard-coded `['en']` - the primary language is never substituted automatically. Set this explicitly if you want a different fallback chain. An empty array disables fallbacks.

### Language codes

Codes must follow a BCP-47 subset matching `^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$`:

- Lowercase 2 or 3 letter base: `en`, `de`, `fil`.
- Optional Title-case script subtag: `zh-Hant`, `sr-Latn`.
- Optional UPPERCASE region or 3-digit M.49: `de-AT`, `es-419`, `sr-Latn-RS`.

> [!WARNING]
> Renaming a code in this list is destructive. Per-language columns on the `Routes` collection (and any other per-language fields) are dropped on the next database sync. If you need to preserve content across a rename, write a migration.

### Resolving the active language

Pruvious decides the active language for each request through:

- The URL prefix when the request matches a routable page (`/de/about`).
- The `Accept-Language` header for API calls and unmatched paths. The header is parsed loosely, so `de-AT` matches a configured `de`, and a configured `de-AT` is also matched by a `de` header. When several regional variants tie, the order in `pruvious.i18n.languages` is used as the tie-breaker.
- The primary language as the final fallback.

On the server, the resolved code is at `event.context.pruvious.language`. On the client, use the `useLanguage()` composable:

```ts
import { useLanguage } from '#pruvious/app'

const language = useLanguage()
console.log(language.value) // 'en', 'de', etc.
```

## Translatable content

A collection or singleton becomes translatable by setting `translatable: true`. This is the default for `defineCollection`, so you usually only mention it to opt out.

```ts
// server/collections/Pages.ts
import { defineCollection, textField, wysiwygField } from '#pruvious/server'

export default defineCollection({
  translatable: true,
  fields: {
    title: textField({}),
    body: wysiwygField({}),
  },
})
```

When a collection is translatable, Pruvious automatically adds two fields:

- **language** - The language code of this record (`en`, `de`, ...).
- **translations** - A shared key linking the record to its counterparts in other languages.

Each translation lives in its own row. Two records with the same `translations` value but different `language` codes are translations of each other. The dashboard renders a language switcher on every translatable record so editors can jump between counterparts and create missing ones.

### Synced fields

Some fields should stay identical across languages. A slug, a featured image, a publication date, or a tag list often makes sense to keep in lockstep. Declare them with `syncedFields`:

```ts
export default defineCollection({
  translatable: true,
  fields: {
    title: textField({}),
    slug: textField({}),
    featuredImage: imageField({}),
    body: wysiwygField({}),
  },
  syncedFields: ['slug', 'featuredImage'],
})
```

Updating a synced field on any translation propagates the change to every other translation automatically.

> [!TIP]
> Synced fields must not depend on other fields via `conditionalLogic` or `dependencies`. The sync runs without the surrounding input, so cross-field dependencies will fail.

### Singletons

Singletons accept the same `translatable` and `syncedFields` options. When `translatable: true`, the singleton stores one row per language and you query it with a language code:

```ts
import { selectSingleton } from '#pruvious/server'

const seo = await selectSingleton('SEO').language('de').get()
```

## Translatable strings

UI strings are organized by **domain**. A domain is a namespace for related messages - typically one per package or feature area. Pruvious ships with three built-in domains:

- **`pruvious-api`** - Strings returned by the REST API (validation errors, status messages).
- **`pruvious-dashboard`** - Strings used inside the dashboard UI.
- **`pruvious-orm`** - Strings used for ORM-level validation messages.

Your own apps usually use the **`default`** domain, but you can create as many domains as you need.

### Defining strings

Strings live in `server/translations/`. The filename pattern is `{domain}.{language}.ts`, in kebab-case. For the `default` domain you can skip the domain part and write `{language}.ts`.

```
server/translations/
  en.ts                    # default domain, English
  de.ts                    # default domain, German
  shop.en.ts               # shop domain, English
  shop.de.ts               # shop domain, German
  pruvious-dashboard.de.ts # override built-in dashboard strings
```

Define strings with `defineTranslation`:

```ts
// server/translations/de.ts
import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  // Plain text
  'Welcome': 'Willkommen',
  'Sign in': 'Anmelden',

  // Pattern with placeholders
  'Hello, $name!': createPattern('Hallo, $name!', { name: 'string' }),

  // Pattern with conditional replacements (plurals)
  'Displayed: $count entries': createPattern(
    'Angezeigt: $count $entries',
    { count: 'number' },
    {
      entries: [
        { conditions: [{ count: 1 }], output: 'Eintrag' },
        'Einträge',
      ],
    },
  ),
})
```

The first argument of `createPattern` is the translated text with `$placeholders`. The second is the type map of expected inputs. The third lets you swap placeholder values based on conditions; the last entry without `conditions` is the default.

More elaborate conditions are supported:

```ts
'$count items': createPattern(
  '$count $items',
  { count: 'number' },
  {
    count: [
      { conditions: [{ count: 0 }], output: 'No' },
      { conditions: [{ count: { '>': 99 } }], output: '99+' },
      '$count',
    ],
    items: [
      { conditions: [{ count: 1 }], output: 'item' },
      'items',
    ],
  },
),

// Usage:
// _('$count items', { count: 0 })   -> 'No items'
// _('$count items', { count: 1 })   -> '1 item'
// _('$count items', { count: 500 }) -> '99+ items'
```

### Using strings

On the server, two functions are available from `#pruvious/server`:

- `__(domain, handle, input?)` - Translate `handle` from `domain`, using the current request language.
- `_(handle, input?)` - Shorthand for the `default` domain.

```ts
import { __ } from '#pruvious/server'

export default defineEventHandler(() => {
  return {
    message: __('pruvious-api', 'Resource not found'),
    count: __('default', 'Displayed: $count entries', { count: 5 }),
  }
})
```

In Vue components, import the same names from `#pruvious/app`:

```vue
<script setup lang="ts">
import { __, _, useLanguage } from '#pruvious/app'

const language = useLanguage()
</script>

<template>
  <h1>{{ _('Welcome') }}</h1>
  <p>{{ __('shop', '$count items', { count: cart.length }) }}</p>
  <small>Current language: {{ language }}</small>
</template>
```

Both `__` and `_` are fully typed: handles, domains, and input parameters autocomplete from your `defineTranslation` definitions.

### Fallbacks

When a handle is missing in the active language, Pruvious walks the `fallbackLanguages` list in order. If none has the handle, the handle string itself is returned. This means English-source apps can ship without any translation files - the handle and the English text are the same, so missing locales degrade to English automatically.

## Preloading strings

Pruvious only ships the strings the page actually needs. By default, the `default` domain is preloaded for every path, and other domains are loaded on demand.

Configure preloading per domain in `nuxt.config.ts`:

```ts
pruvious: {
  i18n: {
    preloadTranslatableStrings: {
      // Preload every dashboard string for every path
      'pruvious-dashboard': true,

      // Preload shop strings only on shop pages
      'shop': {
        include: ['/products/**', '/cart'],
        exclude: ['/products/internal/**'],
      },

      // Disable preloading for the blog domain
      'blog': false,
    },
  },
},
```

When a domain is not preloaded for the current path, you can request it on demand inside a Vue component:

```vue
<script setup lang="ts">
import { __, preloadTranslatableStrings, useLanguage } from '#pruvious/app'

const language = useLanguage()

await preloadTranslatableStrings('shop', language.value)

const cartLabel = __('shop', 'Cart')
</script>
```

`preloadTranslatableStrings` is safe to call repeatedly. It dedupes the fetch and reuses the cached strings on subsequent calls.

## Language switcher

Reading the active language and listing the configured ones is enough to build a switcher. Use Nuxt's `navigateTo` to swap the URL prefix:

```vue
<script setup lang="ts">
import { useLanguage } from '#pruvious/app'

const language = useLanguage()
const { languages, primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const route = useRoute()

function localizedPath(code: string) {
  // Strip any current language prefix
  const stripped = route.path.replace(
    new RegExp(`^/(${languages.join('|')})(?=/|$)`),
    '',
  )
  const path = stripped || '/'

  if (code === primaryLanguage && !prefixPrimaryLanguage) {
    return path
  }

  return `/${code}${path}`
}
</script>

<template>
  <nav>
    <NuxtLink
      v-for="code in languages"
      :key="code"
      :to="localizedPath(code)"
      :class="{ active: code === language }"
    >
      {{ code.toUpperCase() }}
    </NuxtLink>
  </nav>
</template>
```

For routable collections, Pruvious also resolves the matching translated route automatically when you call `resolveRoute()`, so language switchers on content pages can link straight to the translated record.
