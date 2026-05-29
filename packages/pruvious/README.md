# pruvious

The Nuxt module that powers Pruvious - a free and open-source CMS for [Nuxt](https://nuxt.com).

Installing this package gives you collections, singletons, fields, a typed query builder, an admin dashboard, and a full HTTP API as a Nuxt layer.

> [!WARNING]
> Version 4 is under active development. Do not use it in production yet.

## Install

Scaffold a new project:

```sh
npm create pruvious@alpha
```

Or add it to an existing Nuxt project:

```sh
npm i pruvious@alpha
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['pruvious'],
})
```

See the [manual installation guide](../../docs/guide/installation.md#manual-installation) for the full setup.

## Documentation

This package is the main entry point for Pruvious. For an overview of what it does, the surrounding packages, and the development workflow, see the [repository README](../../README.md).

Full documentation lives in [`../../docs`](../../docs/README.md).

## License

This package is licensed under the [MIT License](./LICENSE).
