# Icons

Pruvious ships with the [Tabler icon set](https://tabler-icons.io) preinstalled. Every icon name you see in the dashboard - on collections, singletons, custom pages, menu items, fields, and block previews - is a Tabler icon name.

## Where icons appear

| Use case | Option |
| --- | --- |
| Collection sidebar entry | `ui.icon` on `defineCollection`. |
| Singleton sidebar entry | `ui.icon` on `defineSingleton`. |
| Custom dashboard page | `icon` on `defineDashboardPage`. |
| Block preview | `ui.icon` on `defineBlock`. |
| Field UI (prefix icons, indicators) | `ui.icon` on the field options, when supported. |
| Ad-hoc icon inside a Vue template | `<Icon name="tabler:..." />` (Nuxt Icon). |

Defaults when no icon is set:

- Collections fall back to `folder`.
- Custom dashboard pages fall back to `tools`.

## Browsing the catalogue

Visit [tabler-icons.io](https://tabler-icons.io) to browse and search the available icons. Pruvious bundles the JSON definitions through `@iconify-json/tabler`, so the dashboard renders icons offline without making any network requests.

## Naming convention

Icon names are written in kebab-case and stripped of the `tabler:` prefix when used in Pruvious configuration:

```ts
defineCollection({
  ui: {
    icon: 'cube',           // tabler-icons.io/i/cube
    // or
    // icon: 'clipboard-list',
    // icon: 'photo',
    // icon: 'users',
  },
})
```

Examples of common picks:

| Concept | Icon name |
| --- | --- |
| Pages and articles | `file`, `news`, `article` |
| Media library | `photo`, `library-photo`, `camera` |
| Users and roles | `users`, `user-circle`, `shield` |
| Patterns and components | `puzzle`, `puzzle-2` |
| Settings and tools | `settings`, `tools`, `adjustments` |
| Statistics | `chart-bar`, `chart-line`, `report` |
| Data structures | `cube`, `database`, `box` |
| SEO and search | `eye-search`, `search` |
| Logs | `list`, `clipboard-list` |

## Using icons in custom Vue templates

The dashboard uses [Nuxt Icon](https://nuxt.com/modules/icon) under the hood. Inside any Vue component - including custom dashboard pages - you can render an arbitrary Tabler icon with the `<Icon>` component. Use the Iconify collection prefix `tabler:NAME`:

```vue
<template>
  <button class="pui-btn">
    <Icon name="tabler:bolt" class="pui-text-lg" />
    {{ __('pruvious-dashboard', 'Synchronise') }}
  </button>
</template>
```

You can use other icon collections in your own UI by installing their `@iconify-json/*` packages, but stick to Tabler for anything that surfaces in Pruvious config (`icon` options expect a Tabler name and the TypeScript types reject anything else).

## Type-safe icon names

The `icon` option on `defineDashboardPage`, `defineCollection`, and friends is typed against the union of valid Tabler names exported from `@iconify-json/tabler`. Your editor will autocomplete the list and TypeScript will reject typos before you ever run the build.
