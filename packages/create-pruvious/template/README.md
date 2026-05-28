# Pruvious app

A [Nuxt](https://nuxt.com) project powered by [Pruvious](https://pruvious.com).

## Setup

Install dependencies:

```sh
npm install
```

> Using pnpm 10+? If the install reports that build scripts were ignored, run `pnpm approve-builds`
> (or `pnpm rebuild better-sqlite3`) so the native SQLite driver compiles.

## Development

Start the dev server on [http://localhost:3000](http://localhost:3000):

```sh
npm run dev
```

Then open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) and follow the
installer to create your first admin user.

## What's included

- A SQLite database at `./database.sqlite`
- Local uploads in `./.uploads`
- The dashboard at `/dashboard`
- The API mounted under `/api/`
- A `page` layout and a catch-all route that renders pages created in the dashboard

## Production

Build the application for production:

```sh
npm run build
```

Locally preview the production build:

```sh
npm run preview
```

See the [Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment) and the
[Pruvious docs](https://pruvious.com/docs) for more.
