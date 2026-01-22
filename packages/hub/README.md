# @pruvious/hub

A CLI tool for managing Pruvious Hub dashboard applications. Install, register, and launch dashboard instances to manage your Pruvious websites and deployments.

## Quick Start

Install a new Pruvious Hub app:

```sh
npx @pruvious/hub install [dir]
```

Start the dashboard:

```sh
npx @pruvious/hub start
```

## Commands

### `add`

Register an existing Pruvious Hub app directory. You'll be prompted to enter the directory path if not provided.

```sh
npx @pruvious/hub add [dir]
```

### `install`

Install a new Pruvious Hub app. You'll be prompted to specify the installation directory if not provided.

```sh
npx @pruvious/hub install [dir]
```

### `list`

Display all registered Pruvious Hub apps on your machine.

```sh
npx @pruvious/hub list
```

### `remove`

Unregister a Pruvious Hub app. You'll be prompted to select an app directory if not specified. By default, this removes both the registry entry and all app files.

```sh
# Interactive selection
npx @pruvious/hub remove [dir]

# Keep files (only remove from registry)
npx @pruvious/hub remove [dir] --soft
```

### `start`

Launch a registered Pruvious Hub app. If multiple apps are registered, you'll be prompted to choose one. You can also specify the app's directory path directly.

```sh
npx @pruvious/hub start [dir]
```

### `update`

Update an existing Pruvious Hub app to the latest version. You'll be prompted to specify the app directory if not provided.

```sh
npx @pruvious/hub update [dir]
```

## License

This repository is licensed under the [MIT License](./LICENSE).
