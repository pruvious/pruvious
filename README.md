[![Pruvious banner](https://raw.githubusercontent.com/pruvious/pruvious/main/.github/assets/banner.png)](https://pruvious.com)

# Pruvious

<p>
  <a href="https://www.npmjs.com/package/pruvious"><img src="https://img.shields.io/npm/v/pruvious.svg?style=flat&colorA=030712&colorB=0652dd" alt="Version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/pruvious/pruvious.svg?style=flat&colorA=030712&colorB=0652dd" alt="License"></a>
</p>

**Website:** [https://pruvious.com/](https://pruvious.com/)\
**Documentation:** [https://pruvious.com/docs](https://pruvious.com/docs)

## Getting started

Pruvious is a free and open-source CMS that seamlessly integrates with the [Nuxt](https://nuxt.com) framework, allowing you to utilize Nuxt as you normally would without worrying about compatibility issues.

### Installation

To start a new project, use the `pruvious init` command. This command will install Nuxt and Pruvious, and configure all the necessary settings.

```shell
# pnpm
pnpm dlx pruvious@latest init <dir>

# npm
npx pruvious@latest init <dir>
```

Replace `<dir>` with the path (relative or absolute) to an empty directory where you want to initialize the project.

### Getting started

Visit the Pruvious [documentation](https://pruvious.com/docs) for detailed information on its features and usage. Alternatively, you can explore our [tutorial](https://pruvious.com/tutorial) for a practical demonstration of building a website from scratch using Pruvious.

## Playground

Explore and experiment with Pruvious in a Nuxt test environment located in the `playground` folder. Within this environment, you can create new collections, fields, blocks, and more to test various configurations and functionalities. The `playground` is automatically loaded when you run `pnpm dev`.

## Testing

### SQLite

```shell
pnpm test
```

### PostgreSQL

```shell
pnpm test:pg
```

To perform this test, you need to connect to a local PostgreSQL database named `pruvious_test` running on the default port `5432`.
Use the username `pruvious` and password `12345678` to establish the connection.

Connection URI: `postgresql://pruvious:12345678@127.0.0.1:5432/pruvious_test`

#### Set up PostgreSQL database

1. Install PostgreSQL (e.g., `brew install postgresql@16` and then `brew services start postgresql@16`).
2. Run `psql -d postgres`.
3. Create the database and user

   ```sql
   CREATE DATABASE pruvious_test;
   CREATE USER pruvious WITH PASSWORD '12345678';
   ALTER DATABASE pruvious_test OWNER TO pruvious;
   ```

### Redis

```shell
pnpm test:redis
```

The tests are performed on the Redis database `1`, using a local connection on the default port `6379`.

Connection URI: `redis://127.0.0.1:6379/1`

#### Setting up Redis

For MacOS, install Redis by running the commands `brew install redis` and `brew services start redis`.

### S3

```shell
pnpm test:s3
```

To perform this test, you need an S3-like local object storage server.
We recommend using [Minio](https://github.com/minio/minio).
On MacOS, you can install Minio by running `brew install minio/stable/minio`, and then start the server with `minio server ~/minio`.
After that, open the Minio admin dashboard at [http://127.0.0.1:9000](http://127.0.0.1:9000) and create a new public bucket called `pruvious`.
In the region settings, set the server location to `pruvious`.
Finally, create a new access key named `pruvious` with `pruvious` as its secret key.
