import { castToBoolean, isString, isUndefined } from '@pruvious/utils'
import { getRandomPort } from 'get-port-please'
import { Miniflare } from 'miniflare'
import fs from 'node:fs'
import { DatabaseOptions, QueryBuilderOutput } from '../src'

/**
 * Generates a SQLite connection string by appending the suffix to the filename.
 * This function deletes the database file if it already exists.
 */
export function sqliteConnectionString(suffix: string): `sqlite://${string}` {
  if (fs.existsSync(`packages/orm/tmp/test_${suffix}.sqlite`)) {
    fs.rmSync(`packages/orm/tmp/test_${suffix}.sqlite`)
  }

  return `sqlite://packages/orm/tmp/test_${suffix}.sqlite`
}

/**
 * Generates a PostgreSQL connection string by appending the suffix to the database name.
 * This function creates a new database and deletes it if it already exists.
 *
 * @returns the connection string and a function to delete the newly created database.
 */
export async function pgConnection(suffix: string) {
  if (isUndefined(process.env.VITE_PG_USER)) {
    throw new Error('`VITE_PG_USER` is not defined')
  }

  const prefix = process.env.VITE_PG_DATABASE_PREFIX ?? 'pruvious_test_'
  const database = prefix + suffix
  const host = process.env.VITE_PG_HOST ?? 'localhost'
  const port = process.env.VITE_PG_PORT ? +process.env.VITE_PG_PORT : 5432
  const user = process.env.VITE_PG_USER
  const password = process.env.VITE_PG_PASSWORD
  const pg = await import('pg')
  const client = new pg.Pool({ user, password, database: 'postgres' })

  await client.query(`drop database if exists "${database}"`)
  await client.query(`create database "${database}" owner = "${user}"`)
  await client.end()

  const pgConnectionString: `postgres://${string}` = `postgres://${user}:${password}@${host}:${port}/${database}${process.env.VITE_PG_APPEND ?? ''}`

  return {
    pgConnectionString,
    PGPool: pg.Pool,
    drop: async () => {
      // Usage: `pnpm test --config.preserve`
      if (!castToBoolean(process.env.npm_config_preserve)) {
        const client = new pg.Pool({ user, password, database: 'postgres' })
        await client.query(`drop database if exists "${database}"`)
        await client.end()
      }
    },
  }
}

/**
 * Creates a new Miniflare to simulate a Cloudflare worker environment.
 *
 * @returns the Miniflare instance and the associated D1 database.
 */
export async function createMiniflare() {
  const mf = new Miniflare({
    d1Databases: { db: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    modules: true,
    port: await getRandomPort(),
    script: 'export default { async fetch(request, env, ctx) { return Response() } }',
  })

  return { mf, db: await mf.getD1Database('db') }
}

/**
 * Initializes all drivers with the specified `database` name.
 */
export async function initAllDrivers(database: string): Promise<
  {
    driver: DatabaseOptions<any, any>['driver']
    PGPool: DatabaseOptions<any, any>['PGPool']
    close?: () => Promise<any>
  }[]
> {
  const sqlite = sqliteConnectionString(database)
  const pg = await pgConnection(database)
  const d1 = await createMiniflare()

  return [
    { driver: sqlite, PGPool: undefined },
    { driver: pg.pgConnectionString, PGPool: pg.PGPool, close: () => pg.drop() },
    { driver: d1.db, PGPool: undefined, close: () => d1.mf.dispose() },
  ]
}

/**
 * A utility function to create a successful query builder output.
 */
export function qbo<T>(data: T): QueryBuilderOutput<T> {
  return {
    success: true,
    data,
    runtimeError: undefined,
    inputErrors: undefined,
  }
}

/**
 * A utility function to create a failed query builder output.
 */
export function qbe(error: string | Record<string, string> | (Record<string, string> | undefined)[]) {
  return {
    success: false,
    data: undefined,
    runtimeError: isString(error) ? error : undefined,
    inputErrors: !isString(error) ? error : undefined,
  }
}
