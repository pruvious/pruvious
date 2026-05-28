# create-pruvious

Scaffold a new [Nuxt](https://nuxt.com) project with [Pruvious](https://pruvious.com) preconfigured.

## Usage

> Pruvious v4 is in alpha. Until it is stable, scaffold from the alpha channel by adding `@alpha`.

```sh
npm create pruvious@alpha
```

Or with another package manager:

```sh
pnpm create pruvious@alpha
yarn create pruvious@alpha
bun create pruvious@alpha
```

You can pass the target directory directly:

```sh
npm create pruvious@alpha my-app
```

## What it does

1. Creates the project directory and copies a minimal Nuxt + Pruvious starter: `extends: ['pruvious']`, a `.gitignore`, a `page` layout, a catch-all page renderer, and a set of prose blocks.
2. Lets you pick a package manager (defaulting to the one that invoked the command) and, after confirming, installs dependencies.
3. Optionally (after confirming) initializes a git repository.

The first time the site is requested, the starter seeds a homepage at `/` (a `Pages` record plus a `Routes` entry pointing to the `Pages` collection), so there is something to see right away.

When it finishes, start the dev server and open
[http://localhost:3000/dashboard](http://localhost:3000/dashboard) to create your first admin user.

## Options

| Flag | Default | Description |
|:--|:--|:--|
| `[dir]` | (prompted) | Target directory for the new project. |
| `--pruvious <version>` | `alpha` | Pruvious version to install from npm (a dist-tag like `alpha` or a version). Pass a commit hash to install a [pkg.pr.new](https://pkg.pr.new) build instead. |
| `--pm <name>` | (detected) | Package manager to use (`npm`, `pnpm`, `yarn`, `bun`). |
| `--no-install` | | Skip installing dependencies. |
| `--no-git` | | Skip initializing a git repository. |
| `--force` | | Overwrite the target directory if it already exists. |

## License

This repository is licensed under the [MIT License](./LICENSE).
