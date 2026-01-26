# @pruvious/plugin

Provides CLI commands for building and packaging Pruvious plugins.

This package is designed specifically for plugin developers to simplify the build process. If you are creating a local plugin as a Nuxt layer, you do not need this package, as a plugin is essentially just a standard Nuxt layer. This tool is required only if you intend to publish or distribute your plugin.

## Installation

If you initialized your project using `npm create pruvious-plugin`, you can skip this step as this package is already included.

### Manual installation

You only need to install this package manually if you are setting up a custom plugin environment from scratch. Install it as a development dependency:

```sh
npm i -D @pruvious/plugin
```

## Commands

### `build`

Builds your plugin project using the following command:

```sh
npx @pruvious/plugin build [dir]
```

You can omit the `[dir]` argument to build the current directory.

This command copies files from the `src` directory into `dist` and automatically adds `// @ts-nocheck` comments where applicable. This ensures that the plugin code does not interfere with type checks run from parent Nuxt layers.

For convenience, you can add this to your `package.json` scripts. Note that the exposed binary name is simply `plugin`:

```json
{
  ...
  "scripts": {
    "build": "plugin build",
    ...
  },
  ...
}
```

## License

This repository is licensed under the [MIT License](./LICENSE).
