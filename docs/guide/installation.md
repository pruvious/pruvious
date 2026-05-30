# Installation

The fastest way to start a new Pruvious project is the `create-pruvious` scaffolder. If you would rather add Pruvious to an existing Nuxt project - or want to understand exactly what the scaffolder does - follow the [manual installation](#manual-installation) steps instead.

## Prerequisites

- **Node.js 24** or newer (see `.nvmrc`)
- **npm** or **pnpm**
- A terminal

> [!TIP]
> If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root to switch to the right Node version automatically.

## Quick start (recommended)

Scaffold a new project with your package manager of choice:

```sh
npm create pruvious@alpha
```

```sh
pnpm create pruvious@alpha
```

You can pass the target directory directly:

```sh
npm create pruvious@alpha my-app
```

> [!NOTE]
> Pruvious v4 is published as an alpha, so the commands above use the `@alpha` channel. Once v4 is stable you will be able to drop it and run `npm create pruvious`.

The scaffolder prompts for a directory and a package manager, copies a minimal Nuxt + Pruvious starter (a `page` layout, a catch-all page renderer, and a set of prose blocks), installs dependencies, and optionally initializes a git repository.

Then start the dev server:

```sh
npm run dev
```

The first time the site is requested, the starter seeds a homepage at `/`, so open [http://localhost:3000](http://localhost:3000) to see it. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) and follow the installer to create your first admin user.

That is it. You now have:

- A SQLite database at `./database.sqlite`
- Local uploads in `./.uploads`
- The dashboard at `/dashboard`
- The API mounted under `/api/`
- A seeded homepage at `/`

## Manual installation

These are the steps the scaffolder automates. Follow them to add Pruvious to an existing Nuxt project.

### 1. Create a Nuxt project

```sh
npm create nuxt
```

Follow the prompts. Any default Nuxt setup works.

### 2. Install Pruvious

```sh
npm i https://pkg.pr.new/pruvious/pruvious/pruvious@v4
```

> [!NOTE]
> Version 4 is published as a continuous build via [pkg.pr.new](https://pkg.pr.new). You can pin a specific commit instead of `@v4`:
>
> ```sh
> npm i https://pkg.pr.new/pruvious/pruvious/pruvious@b2cbc6afe7f2c2e8a80a1366ee20629e3583bc21
> ```

### 3. Extend the Pruvious layer

Add Pruvious to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
})
```

That single line wires up the schema, the API, the dashboard, and the database.

### 4. Update `.gitignore`

Add the following lines so build artifacts, uploads, and the local SQLite database stay out of git:

```text
.pruvious
.uploads
*.sqlite
*.sqlite-*
```

- `.pruvious` is the generated build directory (types, runtime files, dashboard manifests).
- `.uploads` is the default local storage for uploaded files.
- `*.sqlite` and `*.sqlite-*` cover the default SQLite database and its journal files.

### 5. Remove `app.vue`

Pruvious provides its own root component. Delete the `app.vue` file that `npm create nuxt` generated:

```sh
rm app.vue
```

> [!WARNING]
> If you keep `app.vue`, Nuxt will use it instead of the Pruvious-provided root and the dashboard will not render.

### 6. Render pages

Pruvious does not auto-mount a public page renderer. To display the pages you create in the dashboard, add one catch-all Nuxt page that hands the route off to Pruvious, plus a matching layout.

The default `Pages` collection renders with `layout: 'page'`, so create `app/layouts/page.vue`:

```vue
<template>
  <slot />
</template>
```

Then create `app/pages/[...slug].vue`:

```vue
<template>
  <NuxtLayout :name="proute?.layout">
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

That is the minimum. The `pruvious` middleware resolves the URL to a record, `usePruviousRoute()` exposes the resolved data, and `<PruviousBlocks>` renders the page's blocks. Wrap the layout with your own header and footer when you are ready.

### 7. Start the dev server

```sh
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) and follow the installer to create your first admin user.

That is it. You now have:

- A SQLite database at `./database.sqlite`
- Local uploads in `./.uploads`
- The dashboard at `/dashboard`
- The API mounted under `/api/`

## Next steps

- [Tour the project structure](./project-structure.md)
- [Define your first collection](../essentials/collections.md)
- [Configure database, uploads, and auth](../reference/configuration.md)
