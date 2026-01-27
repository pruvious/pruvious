# @pruvious/local-path

A Pruvious plugin that enables server-side file system browsing and selection directly within the dashboard.

It provides a `localPathField()` for your blocks, collections, and singletons, a standalone Vue component for custom dashboard pages, and a secure API for listing directory contents.

> **⚠️ Node.js environment required**
>
> This plugin relies on the native Node.js `fs` module to access the file system. It **will not work** on Cloudflare Workers, Vercel Edge, or other serverless/edge platforms where the file system cannot be accessed. Ensure your deployment target runs a standard Node.js environment.

## Installation

Install the plugin in your Pruvious project:

```sh
npm i @pruvious/local-path
```

Add the plugin layer to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious', '@pruvious/local-path'],
})
```

## Configuration

Optionally, you can customize the security settings in `⁠nuxt.config.ts`. The values shown below are the defaults:

```ts
export default defineNuxtConfig({
  extends: ['pruvious', '@pruvious/local-path'],
  pruviousLocalPath: {
    /**
     * Defines whether users must be logged in to access the `/api/local-path` endpoint.
    */
    requireAuth: true,

    /**
     * An array of Pruvious permissions required to access the file system API.
     * Set to `false` to skip this check.
     */
    requirePermissions: ['access-dashboard'],
  },
})
```

## Usage

### Field

Use the `localPathField()` within your blocks, collection, or singleton definitions.

**Options:**

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `initialDirectory` | `string` | - | The directory to display when the finder popup first opens. |
| `selectionType` | `'any' \| 'file' \| 'directory'` | `'any'` | Restricts what the user can select. |
| ...Standard | | | All standard Pruvious field options (required, label, description, etc.) |

**Example:**

```ts
import { defineCollection, localPathField } from '#pruvious/server'

export default defineCollection({
  name: 'imports',
  fields: {
    sourcePath: localPathField({
      selectionType: 'directory', // Only allow selecting folders
      initialDirectory: '~', // Sets the starting directory to the user's home folder
      required: true,
      ui: {
        label: 'Source Directory',
        description: 'Select the local folder containing the raw assets.',
      },
    }),
  },
})
```

### Standalone Component

You can use the selector UI as a standalone component (`<PruviousDashboardLocalPathSelector />`) inside custom dashboard pages or components.

**Props:**

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `modelValue` | `string` | **Yes** | - | The current selected path (v-model). |
| `selectionType` | `'any' \| 'file' \| 'directory'` | No | `'any'` | Controls selectable types. |
| `selectLabel` | `string` | No | *(Auto)* | Custom label for the picker. |
| `disabled` | `boolean` | No | `false` | Disables any input interaction. |

**Events:**

| Event | Type | Description |
| :--- | :--- | :--- |
| `update:modelValue` | `string` | Emits the selected path string. |

**Example:**

```vue
<template>
  <PruviousDashboardLocalPathSelector
    v-model="dir"
    initialDirectory="~/Projects"
    selectionType="directory"
    selectLabel="Select project"
  />
</template>

<script lang="ts" setup>
const dir = ref('')
</script>
```

### API Access

You can query the directory listing endpoint directly if you need to build custom logic.

**Endpoint:** GET `/api/local-path?dir=<dir>`

**Example:**

```vue
<template>
  <input v-model="dir" placeholder="Enter directory to scan" type="text" />
  <pre>{{ data }}</pre>
</template>

<script setup lang="ts">
import { $pfetch, type PruviousFetchError } from '#pruvious/app'
import { computedAsync } from '@vueuse/core'

const dir = ref('')
const data = computedAsync(() =>
  $pfetch('/api/local-path', { query: { dir: dir.value } }).catch((error: PruviousFetchError) => error.message),
)
</script>
```

## Filters

You can filter the file list returned from the API by using the `local-path:files` server hook.

**Example:**

```ts
// server/filters/hide-node-modules.ts
import { addFilter } from '#pruvious/server'

addFilter('local-path:files', (files) => {
  return files.filter((file) => file.name !== 'node_modules')
})
```

## License

This repository is licensed under the [MIT License](./LICENSE).
