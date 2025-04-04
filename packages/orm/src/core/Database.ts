import type { D1Database } from '@cloudflare/workers-types'
import type { I18n } from '@pruvious/i18n'
import {
  castToBoolean,
  clearArray,
  defu,
  isBoolean,
  isDatabaseIdentifier,
  isDefined,
  isEmpty,
  isFunction,
  isIdentifier,
  isObject,
  isString,
  omit,
  randomIdentifier,
  remove,
  sleep,
  toForeignKey,
  toIndex,
  toSQLDateTime,
  type ExtractSQLParams,
  type HasReturningClause,
  type IsSelectQuery,
} from '@pruvious/utils'
import SQLite from 'better-sqlite3'
import { dirname } from 'pathe'
import type pg from 'pg'
import { i18n, QueryBuilder } from '../query-builder'
import type { GenericCollection } from './Collection'
import { ExecError } from './ExecError'
import type { DataType, ReferentialActions } from './types'
import { prepareQuery } from './utils'

export interface DatabaseOptions<TCollections extends Record<string, object>, TI18n extends I18n> {
  /**
   * The database driver to use.
   *
   * For **SQLite**, you can use one of the following:
   *
   * - Connection string (e.g., `sqlite://relative/path/to/database.sqlite`)
   * - [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) instance
   *
   * For **PostgreSQL**:
   *
   * - Connection string (e.g., `postgres://user:password@localhost:5432/database?ssl=true`)
   *   - You must install the [`pg`](https://www.npmjs.com/package/pg) package (or equivalent) as a project dependency
   *     in order to use PostgreSQL with a connection string.
   *   - The `PGPool` constructor must be provided in the options.
   * - `Pool` instance from the [`pg`](https://www.npmjs.com/package/pg) package
   *
   * For **D1**:
   *
   * - Connection string (e.g., `d1://DB`)
   * - `D1Database` instance (e.g., from a [Cloudflare](https://developers.cloudflare.com/d1/get-started/) Worker binding)
   *
   * Note: Connection strings are resolved from the current working directory.
   *
   * @default 'sqlite://database.sqlite'
   */
  driver?: DatabaseDriver

  /**
   * The `pg.Pool` constructor from the [`pg`](https://www.npmjs.com/package/pg) package
   * or any other client that implements the PostgreSQL connection pooling interface.
   *
   * Required when using PostgreSQL with a connection string.
   */
  PGPool?: typeof pg.Pool

  /**
   * A key-value object of `Collection` instances representing the database schema.
   *
   * - Object keys represent the collection names (used as table names in the database).
   * - Object values are instances of the `Collection` class.
   *
   * @example
   * ```ts
   * {
   *   Users: new Collection({
   *     fields: {
   *       email: new Field({ model: textFieldModel(), options: {} }),
   *       role: new Field({ model: textFieldModel(), options: {} }),
   *     },
   *     indexes: [{ fields: {'email'], unique: true }],
   *     foreignKeys: [
   *       {
   *         field: 'role',
   *         referencedCollection: 'Roles',
   *         referencedField: 'name',
   *         action: ['ON UPDATE RESTRICT', 'ON DELETE SET NULL'],
   *       },
   *     ],
   *   }),
   *   Roles: new Collection({
   *     fields: {
   *       name: new Field({ model: textFieldModel(), options: {} }),
   *       permissions: new Field({ model: textFieldModel(), options: {} }),
   *     },
   *     indexes: [{ fields: {'name'], unique: true }],
   *   }),
   * }
   * ```
   */
  collections?: TCollections

  /**
   * Controls whether to synchronize the database to match the collection models.
   *
   * When set to `true` (default), the database schema is updated to match the collection models.
   * Additionally:
   *
   * - Existing tables not defined in the collection models are dropped.
   * - Existing columns not defined in the field models of the collections are dropped.
   *
   * Provide an object to customize the sync behavior or set to `false` to disable the sync feature.
   *
   * @default true
   */
  sync?:
    | {
        /**
         * Indicates whether to drop existing tables not defined in the collection models.
         *
         * @default true
         */
        dropNonCollectionTables?: boolean

        /**
         * Indicates whether to drop existing columns not defined in the field models of the collections.
         *
         * @default true
         */
        dropNonFieldColumns?: boolean
      }
    | boolean

  /**
   * Determines the level of logging output.
   *
   * - `true` - Enables full logging of all operations.
   * - `false` - Disables all logging output.
   * - `exec` - Logs only executed SQL query statements.
   * - `sync` - Logs only database schema synchronization operations.
   *
   * @default false
   */
  verbose?: boolean | 'exec' | 'sync'

  /**
   * A custom logger function for verbose output.
   *
   * @default console.log
   */
  logger?: (message: string, ...optionalParams: any[]) => void

  /**
   * An `I18n` instance for translating error messages and other text in the query builder.
   * This allows customization of language and wording for user-facing strings.
   *
   * If omitted, the default `i18n` instance from this package is used.
   */
  i18n?: TI18n
}

export type DatabaseDriver =
  | `sqlite://${string}`
  | SQLite.Database
  | `postgres://${string}`
  | pg.Pool
  | `d1://${string}`
  | D1Database

export interface SchemaMap {
  [collectionKey: string]: {
    table: string
    fields: { [fieldKey: string]: { column: string; type: DataType; nullable: boolean } }
    indexes: string[]
    foreignKeys: string[]
  }
}

export type ExecResult = any

export type Exec = <T extends string>(
  sql: T,
  params?: ExtractSQLParams<T>,
  suppress?: boolean,
) => IsSelectQuery<T> extends true
  ? Promise<Record<string, any>[]>
  : HasReturningClause<T> extends true
    ? Promise<Record<string, any>[]>
    : Promise<number>

export type ExecWithDuration = <T extends string>(
  sql: T,
  params?: ExtractSQLParams<T>,
  suppress?: boolean,
) => IsSelectQuery<T> extends true
  ? Promise<{ result: Record<string, any>[]; duration: number }>
  : HasReturningClause<T> extends true
    ? Promise<{ result: Record<string, any>[]; duration: number }>
    : Promise<{ result: number; duration: number }>

export type GenericDatabase = Database<Record<string, GenericCollection>>

/**
 * The database manager class.
 *
 * @example
 * ```ts
 * new Database({
 *   driver: 'sqlite://database.sqlite',
 *   collections: {
 *     Users: new Collection({
 *       fields: {
 *         email: new Field({ model: textFieldModel(), options: {} }),
 *         role: new Field({ model: textFieldModel(), options: {} }),
 *       },
 *       indexes: [{ fields: {'email'], unique: true }],
 *       foreignKeys: [
 *         {
 *           field: 'role',
 *           referencedCollection: 'Roles',
 *           referencedField: 'name',
 *           action: ['ON UPDATE RESTRICT', 'ON DELETE SET NULL'],
 *         },
 *       ],
 *     }),
 *     Roles: new Collection({
 *       fields: {
 *         name: new Field({ model: textFieldModel(), options: {} }),
 *         permissions: new Field({ model: textFieldModel(), options: {} }),
 *       },
 *       indexes: [{ fields: {'name'], unique: true }],
 *     }),
 *   },
 *   sync: {
 *     dropNonCollectionTables: true,
 *     dropNonFieldColumns: true,
 *   },
 * )
 * ```
 */
export class Database<TCollections extends Record<string, object> = {}, TI18n extends I18n = typeof i18n> {
  /**
   * The database dialect to be used.
   * Supported options:
   *
   * - `sqlite` - SQLite database.
   * - `postgres` - PostgreSQL database.
   * - `d1` - Cloudflare D1 database.
   */
  readonly dialect: 'sqlite' | 'postgres' | 'd1'

  /**
   * The current connection status.
   */
  get connectionStatus() {
    return this._connectionStatus
  }
  protected _connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected'

  /**
   * A key-value object of `Collection` instances representing the database schema.
   *
   * - Object keys represent the collection names (used as table names in the database).
   * - Object values are instances of the `Collection` class.
   */
  get collections(): Readonly<TCollections> {
    return this._collections as TCollections
  }
  protected _collections: Record<string, GenericCollection>

  /**
   * The `I18n` instance for translating error messages and other text in the query builder.
   * This allows customization of language and wording for user-facing strings.
   */
  readonly i18n: TI18n

  protected options: Required<Omit<DatabaseOptions<TCollections, TI18n>, 'PGPool' | 'collections' | 'sync' | 'i18n'>>
  protected PGPool?: typeof pg.Pool
  protected sqliteDatabase?: SQLite.Database
  protected pgPool?: pg.Pool
  protected d1?: D1Database
  protected schemaMap: SchemaMap = {}
  protected syncOptions: Required<DatabaseOptions<TCollections, TI18n>['sync']> & object & { enabled: boolean } = {
    enabled: true,
    dropNonCollectionTables: true,
    dropNonFieldColumns: true,
  }
  protected instanceLocks: string[] = []

  /**
   * Executes an SQL query.
   *
   * - The `params` parameter is optional and can be used to pass query parameters.
   * - The `suppress` parameter can be used to prevent throwing an error on query failure (defaults to `false`).
   *
   * @returns the `number` of rows affected by the query or an `array` of rows if the query is returning data.
   *
   * @example
   * ```ts
   * const changes = await this.exec(
   *   'insert into "Houses" ("name", "founder") values ($name, $founder)',
   *   { name: 'Gryffindor', founder: 'Godric Gryffindor' },
   * )
   * console.log(changes) // 1
   *
   * const rows = await this.exec('select "name" from "Houses" limit 1')
   * console.log(rows) // [{ name: 'Gryffindor' }]
   * ```
   *
   * @throws an `ExecError` if the query fails.
   */
  exec!: Exec

  /**
   * Executes an SQL query and return the result with the query duration in milliseconds.
   *
   * - The `params` parameter is optional and can be used to pass query parameters.
   * - The `suppress` parameter can be used to prevent throwing an error on query failure (defaults to `false`).
   *
   * @returns the `number` of rows affected by the query or an `array` of rows if the query is returning data.
   *
   * @example
   * ```ts
   * const changes = await this.execWithDuration(
   *   'insert into "Houses" ("name", "founder") values ($name, $founder)',
   *   { name: 'Gryffindor', founder: 'Godric Gryffindor' },
   * )
   * console.log(changes) // { result: 1, duration: 1 }
   *
   * const rows = await this.execWithDuration('select "name" from "Houses" limit 1')
   * console.log(rows) // { result: [{ name: 'Gryffindor' }], duration: 1 }
   * ```
   *
   * @throws an `ExecError` if the query fails.
   */
  execWithDuration!: ExecWithDuration

  constructor(options: DatabaseOptions<TCollections, TI18n>) {
    this.options = defu(omit(options, ['collections', 'sync', 'i18n']), {
      driver: 'sqlite://database.sqlite' as const,
      verbose: false,
      logger: console.log,
    })
    this.PGPool = options.PGPool
    this._collections = { ...(options.collections ?? ({} as any)) } // Allow sorting without modifying the original object
    this.i18n = options.i18n ?? (i18n as TI18n)

    if (isString(this.options.driver)) {
      if (this.options.driver.startsWith('sqlite://')) {
        this.dialect = 'sqlite'
      } else if (this.options.driver.startsWith('postgres://')) {
        this.dialect = 'postgres'
      } else if (this.options.driver.startsWith('d1://')) {
        this.dialect = 'd1'
      } else {
        throw new Error('Invalid driver connection string')
      }
    } else if (this.options.driver instanceof SQLite) {
      this.dialect = 'sqlite'
    } else if (
      isObject(this.options.driver) &&
      isObject((this.options.driver as pg.Pool).options) &&
      isDefined((this.options.driver as pg.Pool).options.maxUses)
    ) {
      this.dialect = 'postgres'
    } else if (isObject(this.options.driver) && isFunction((this.options.driver as D1Database).prepare)) {
      this.dialect = 'd1'
    } else {
      throw new Error('Invalid driver')
    }

    if (isObject(options.sync)) {
      this.syncOptions = { ...this.syncOptions, ...options.sync }
    } else if (options.sync === false) {
      this.syncOptions.enabled = false
    }

    this.resolveSchemaMap()
  }

  /**
   * Resolves collection and field schema identifiers.
   *
   * @throws an error if an invalid identifier is found.
   */
  protected resolveSchemaMap() {
    for (const [collectionName, collectionDefinition] of Object.entries(this._collections)) {
      const collectionKey = collectionDefinition.key ?? collectionName

      // Check if the table name is a valid database identifier
      if (!isDatabaseIdentifier(collectionName)) {
        throw new Error(`Invalid collection name: ${collectionName}`)
      }

      // Check if the collection key is a valid identifier
      if (!isIdentifier(collectionKey)) {
        throw new Error(`Invalid collection key: ${collectionKey}`)
      }

      // Check if the collection key is already used
      if (this.schemaMap[collectionKey]) {
        throw new Error(`Duplicate collection key: ${collectionKey}`)
      }

      // Map collection identifier
      this.schemaMap[collectionKey] = { table: collectionName, fields: {}, indexes: [], foreignKeys: [] }

      // Resolve field identifiers
      for (const [fieldName, fieldDefinition] of Object.entries(collectionDefinition.fields)) {
        const fieldKey = fieldDefinition.key ?? fieldName

        // Check if the column name is a valid database identifier
        if (!isDatabaseIdentifier(fieldName)) {
          throw new Error(`Invalid field name: ${fieldName}`)
        }

        // Check if the field key is a valid identifier
        if (!isIdentifier(fieldKey)) {
          throw new Error(`Invalid field key in collection '${collectionName}': ${fieldKey}`)
        } else if (fieldKey === 'id') {
          throw new Error(`Invalid field key in collection '${collectionName}': ${fieldKey} (reserved)`)
        }

        // Check if the field key is already used
        if (this.schemaMap[collectionKey].fields[fieldKey]) {
          throw new Error(`Duplicate field key in collection '${collectionName}': ${fieldKey}`)
        }

        // Map field identifier
        this.schemaMap[collectionKey].fields[fieldKey] = {
          column: fieldName,
          type: fieldDefinition.model.dataType,
          nullable: fieldDefinition.nullable,
        }
      }
    }

    for (const [collectionName, collectionDefinition] of Object.entries(this._collections)) {
      const collectionKey = collectionDefinition.key ?? collectionName

      // Resolve indexe identifiers
      for (const { fields, unique } of collectionDefinition.indexes) {
        // Check if the index `fields` are valid field names
        for (const field of fields) {
          if (!Object.values(this.schemaMap[collectionKey].fields).some(({ column }) => column === field)) {
            throw new Error(`Invalid field for index in collection '${collectionName}': ${field}`)
          }
        }

        // Map indexes
        this.schemaMap[collectionKey].indexes.push(toIndex(collectionName, fields, unique))
      }

      // Resolve foreign key identifiers
      for (const { field, referencedCollection, referencedField } of collectionDefinition.foreignKeys) {
        // Check if the field is a valid field identifier
        if (!Object.values(this.schemaMap[collectionKey].fields).some(({ column }) => column === field)) {
          throw new Error(`Invalid field for foreign key in collection '${collectionName}': ${field}`)
        }

        // Check if the referenced collection is a valid collection identifier
        if (!this.schemaMap[referencedCollection]) {
          throw new Error(`Invalid referenced collection in collection '${collectionName}': ${referencedCollection}`)
        }

        // Check if the referenced field is a valid field identifier
        if (
          isDefined(referencedField) &&
          referencedField !== 'id' &&
          !Object.values(this.schemaMap[referencedCollection].fields).some(({ column }) => column === referencedField)
        ) {
          throw new Error(`Invalid referenced field in collection '${collectionName}': ${referencedField}`)
        }

        // Map foreign key identifier
        this.schemaMap[collectionKey].foreignKeys.push(toForeignKey(collectionName, field))

        // Ensure that the referenced collection is registered before the current collection
        this._collections = Object.fromEntries(
          Object.entries(this._collections).sort(([a], [b]) =>
            a === referencedCollection ? -1 : b === referencedCollection ? 1 : 0,
          ),
        )
      }
    }
  }

  /**
   * Logs a message if the `verbose` option is enabled.
   */
  protected log(message: string, type: 'exec' | 'sync') {
    if (this.options.verbose === true || this.options.verbose === type) {
      this.options.logger(message)
    }
  }

  /**
   * Connects to the database and synchronize the schema with the collection models.
   * To disable the sync feature, set the `sync` option to `false`.
   *
   * @throws an error if the connection fails or is already established.
   */
  async connect(): Promise<{ createdOptionsTable: boolean; synced: boolean }> {
    if (this._connectionStatus !== 'disconnected') {
      throw new Error('Database connection is already established')
    }

    this._connectionStatus = 'connecting'
    const results = { createdOptionsTable: false, synced: false }

    if (this.dialect === 'sqlite') {
      if (isString(this.options.driver)) {
        const dbPath = this.options.driver.slice(9)
        const dbDir = dirname(dbPath)
        const fs = await import('node:fs')

        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true })
        }

        this.sqliteDatabase = new SQLite(dbPath)
      } else {
        this.sqliteDatabase = this.options.driver as SQLite.Database
      }

      this.execWithDuration = this.createExecWithDurationFn()
      this.exec = this.createExecFn(this.execWithDuration)

      await this.exec('pragma journal_mode = wal')
      await this.exec(';pragma case_sensitive_like = true') // does not return data
    } else if (this.dialect === 'postgres') {
      if (isString(this.options.driver)) {
        if (!this.PGPool) {
          throw new Error(
            'You must provide the "pg" instance in the options when using PostgreSQL with a connection string',
          )
        }
        const url = new URL(this.options.driver)
        const ssl = castToBoolean(url.searchParams.get('ssl'))
        this.pgPool = new this.PGPool({ connectionString: this.options.driver, ssl: isBoolean(ssl) ? ssl : undefined })
      } else {
        this.pgPool = this.options.driver as pg.Pool
      }

      this.execWithDuration = this.createExecWithDurationFn()
      this.exec = this.createExecFn(this.execWithDuration)
    } else if (this.dialect === 'd1') {
      if (isString(this.options.driver)) {
        const dbBinding = this.options.driver.slice(5)
        this.d1 = process.env[dbBinding] || (globalThis as any).__env__?.[dbBinding] || (globalThis as any)[dbBinding]
      } else {
        this.d1 = this.options.driver as D1Database
      }
      this.execWithDuration = this.createExecWithDurationFn()
      this.exec = this.createExecFn(this.execWithDuration)

      await this.exec('pragma case_sensitive_like = true')
    }

    // Ensure that the `Options` table exists
    results.createdOptionsTable = isDefined(
      await this.exec(
        `create table "Options" (key text, value text, constraint "UX_Options__key" unique (key))`,
        {},
        true,
      ),
    )

    // Synchronize the schema with the collection models
    if (this.syncOptions.enabled) {
      results.synced = await this.sync()
    }

    this._connectionStatus = 'connected'
    return results
  }

  /**
   * Checks if the database connection is currently established.
   */
  isConnected() {
    return this._connectionStatus === 'connected'
  }

  /**
   * Creates a lock on a `key` in the `Options` table.
   * If the lock already exists, the method will wait until it is released.
   * The lock is released when the connection is closed.
   *
   * The `timeout` parameter is optional and defaults to 30000 milliseconds.
   * To disable the timeout, set it to `0`.
   *
   * The `interval` parameter defines the time in milliseconds between each lock check.
   * It is optional and defaults to 25 milliseconds.
   *
   * Note: The `timeout` parameter is not supported for D1 databases due to Cloudflare Workers limitations.
   *
   * @returns `true` if the lock was created, `false` if the timeout was reached.
   */
  async lock(key: string, timeout = 30000, interval = 25): Promise<boolean> {
    const start = this.dialect === 'd1' ? 0 : performance.now()

    while (true) {
      const changes = await this.exec(
        'insert into "Options" (key, value) values ($key, $value) on conflict (key) do nothing',
        { key: `_lock:${key}`, value: toSQLDateTime() },
      )

      if (changes > 0) {
        this.instanceLocks.push(key)
        return true
      } else if (timeout && this.dialect !== 'd1' && performance.now() - start >= timeout) {
        return false
      }

      await sleep(interval)
    }
  }

  /**
   * Checks if a lock exists on a `key` in the `Options` table.
   */
  async isLocked(key: string): Promise<boolean> {
    const rows = await this.exec('select value from "Options" where key = $key', { key: `_lock:${key}` })
    return rows.length > 0
  }

  /**
   * Lists all locks in the `Options` table.
   */
  async listLocks(): Promise<string[]> {
    const rows = await this.exec('select key from "Options" where key like $key', { key: '_lock:%' })
    return rows.map(({ key }) => key.slice(6))
  }

  /**
   * Releases a lock on a `key` in the `Options` table.
   */
  async unlock(key: string): Promise<boolean> {
    const changes = await this.exec('delete from "Options" where key = $key', { key: `_lock:${key}` })

    if (changes === 1) {
      remove(key, this.instanceLocks, true)
      return true
    }

    return false
  }

  /**
   * Releases all locks in the `Options` table.
   *
   * @returns the number of locks released.
   */
  async unlockAll(): Promise<number> {
    const changes = await this.exec('delete from "Options" where key like $key', { key: '_lock:%' })
    clearArray(this.instanceLocks)
    return changes
  }

  /**
   * Synchronizes the database schema with the collection models.
   *
   * @returns `true` if the schema was synchronized, `false` if the schema is up to date.
   */
  protected async sync(): Promise<boolean> {
    this.log('Synchronizing database schema...', 'sync')

    // Preflight check to avoid locking
    const _schemaMapOptions = await this.exec(`select value from "Options" where key = '_schemaMap'`)
    const _currentSchemaMap: SchemaMap = _schemaMapOptions.length === 1 ? JSON.parse(_schemaMapOptions[0].value) : {}
    if (_schemaMapOptions.length === 1 && JSON.stringify(_currentSchemaMap) === JSON.stringify(this.schemaMap)) {
      this.log('Database schema is up to date', 'sync')
      return false
    }

    // Lock
    await this.lock('sync')

    try {
      // Get current schema map from the `Options` table
      const schemaMapOptions = await this.exec(`select value from "Options" where key = '_schemaMap'`)
      const currentSchemaMap: SchemaMap = schemaMapOptions.length === 1 ? JSON.parse(schemaMapOptions[0].value) : {}

      // Return if schema is up to date
      if (schemaMapOptions.length === 1 && JSON.stringify(currentSchemaMap) === JSON.stringify(this.schemaMap)) {
        this.log('Database schema is up to date', 'sync')
        await this.unlock('sync')
        return false
      }

      // Store current client instance
      const _exec = this.exec

      await this.transaction(async (exec) => {
        // Ensure that the transaction uses the same client instance
        this.exec = exec

        // Remove existing indexes and foreign keys
        for (const table of await this.listTables()) {
          for (const name of await this.listIndexes(table)) {
            this.log(`Dropping index "${name}"`, 'sync')
            await this.dropIndex(name)
          }

          for (const name of await this.listForeignKeys(table)) {
            this.log(`Dropping foreign key "${name}"`, 'sync')
            await this.dropForeignKey(table, name, false)
          }
        }

        const conflictingTableNames: { tmpName: string; name: string }[] = []

        // Rename tables with matching collection keys
        for (const [collectionKey, { table }] of Object.entries(currentSchemaMap)) {
          if (this.schemaMap[collectionKey] && this.schemaMap[collectionKey].table !== table) {
            if (
              Object.values(currentSchemaMap).some(
                ({ table: existingTable }) => existingTable === this.schemaMap[collectionKey].table,
              )
            ) {
              const tmpTableName = `TMP_${randomIdentifier()}`
              this.log(`Renaming table "${table}" to "${tmpTableName}"`, 'sync')
              await this.renameTable(table, tmpTableName)
              conflictingTableNames.push({ tmpName: tmpTableName, name: this.schemaMap[collectionKey].table })
            } else {
              this.log(`Renaming table "${table}" to "${this.schemaMap[collectionKey].table}"`, 'sync')
              await this.renameTable(table, this.schemaMap[collectionKey].table)
            }
          }
        }

        // Rename tables with conflicting names
        for (const { tmpName, name } of conflictingTableNames) {
          this.log(`Renaming table "${tmpName}" to "${name}"`, 'sync')
          await this.renameTable(tmpName, name)
        }

        // Remove existing tables that are not in the collection models
        if (this.syncOptions.dropNonCollectionTables) {
          for (const table of await this.listTables()) {
            if (
              table !== 'Options' &&
              !Object.keys(this._collections).some((collectionName) => collectionName === table)
            ) {
              this.log(`Dropping table "${table}"`, 'sync')
              await this.dropTable(table)
            }
          }
        }

        // Create non-existing tables
        for (const table of Object.keys(this._collections)) {
          if (!(await this.listTables()).includes(table)) {
            this.log(`Creating table "${table}"`, 'sync')
            const idType = this.dialect === 'postgres' ? 'bigserial primary key' : 'integer primary key autoincrement'
            await exec(`create table "${table}" ("id" ${idType})`)
          }
        }

        // Resolve columns
        for (const [table, { key, fields }] of Object.entries(this._collections)) {
          const collectionKey = key ?? table

          if (currentSchemaMap[collectionKey]) {
            const conflictingColumnNames: { tmpName: string; name: string }[] = []

            // Rename columns with matching field keys
            for (const [fieldKey, { column }] of Object.entries(currentSchemaMap[collectionKey].fields)) {
              if (
                this.schemaMap[collectionKey].fields[fieldKey] &&
                this.schemaMap[collectionKey].fields[fieldKey].column !== column
              ) {
                if (
                  Object.values(currentSchemaMap[collectionKey].fields).some(
                    ({ column: existingColumn }) =>
                      existingColumn === this.schemaMap[collectionKey].fields[fieldKey].column,
                  )
                ) {
                  const tmpColumnName = `TMP_${randomIdentifier()}`
                  this.log(`Renaming column "${table}.${column}" to "${table}.${tmpColumnName}"`, 'sync')
                  await this.renameColumn(table, column, tmpColumnName)
                  conflictingColumnNames.push({
                    tmpName: tmpColumnName,
                    name: this.schemaMap[collectionKey].fields[fieldKey].column,
                  })
                } else {
                  this.log(
                    `Renaming column "${table}.${column}" to "${table}.${this.schemaMap[collectionKey].fields[fieldKey].column}"`,
                    'sync',
                  )
                  await this.renameColumn(table, column, this.schemaMap[collectionKey].fields[fieldKey].column)
                }
              }
            }

            // Rename columns with conflicting names
            for (const { tmpName, name } of conflictingColumnNames) {
              this.log(`Renaming column "${table}.${tmpName}" to "${table}.${name}"`, 'sync')
              await this.renameColumn(table, tmpName, name)
            }
          }

          // Remove existing columns that are not in the field models
          if (this.syncOptions.dropNonFieldColumns) {
            for (const column of await this.listColumns(table)) {
              if (column !== 'id' && !Object.keys(fields).some((fieldName) => fieldName === column)) {
                this.log(`Dropping column "${table}.${column}"`, 'sync')
                await this.dropColumn(table, column)
              }
            }
          }

          for (const [column, { key, model, nullable }] of Object.entries(fields)) {
            const fieldKey = key ?? column
            const existingColumns = await this.listColumns(table)
            const exists = existingColumns.includes(column)

            // Alter column if it exists
            if (exists) {
              const oldDataType = currentSchemaMap[collectionKey]?.fields[fieldKey]?.type
              const wasNullable = currentSchemaMap[collectionKey]?.fields[fieldKey]?.nullable ?? true

              // Change column type or recreate column if not possible
              if (oldDataType !== model.dataType) {
                this.log(
                  oldDataType
                    ? `Changing type of column "${table}.${column}" from ${oldDataType ?? 'unknown'} to ${model.dataType}`
                    : `Changing type of column "${table}.${column}" to ${model.dataType}`,
                  'sync',
                )
                if (
                  ((oldDataType === 'bigint' || oldDataType === 'numeric') && model.dataType === 'text') ||
                  (oldDataType === 'bigint' && model.dataType === 'numeric')
                ) {
                  if (nullable !== wasNullable) {
                    await this.changeColumnNullable(table, column, oldDataType, nullable)
                  }
                  await this.changeColumnType(table, column, model.dataType, nullable)
                } else {
                  await this.dropColumn(table, column)
                  if (!nullable && (await this.exec(`select count(*) as count from "${table}"`))[0].count > 0) {
                    await this.createColumn(table, column, model.dataType, true)
                    await this.changeColumnNullable(table, column, model.dataType, false)
                  } else {
                    await this.createColumn(table, column, model.dataType, nullable)
                  }
                }
              }

              // Change column nullability
              else if (nullable !== wasNullable) {
                this.log(
                  nullable
                    ? `Making column "${table}.${column}" nullable`
                    : `Making column "${table}.${column}" non-nullable`,
                  'sync',
                )
                await this.changeColumnNullable(table, column, oldDataType, nullable)
              }
            }

            // Create column if it does not exist
            else {
              this.log(`Creating column "${table}.${column}"`, 'sync')
              if (!nullable && (await this.exec(`select count(*) as count from "${table}"`))[0].count > 0) {
                await this.createColumn(table, column, model.dataType, true)
                await this.changeColumnNullable(table, column, model.dataType, false)
              } else {
                await this.createColumn(table, column, model.dataType, nullable)
              }
            }
          }
        }

        // Create indexes
        for (const [table, { indexes }] of Object.entries(this._collections)) {
          for (const { fields, unique } of indexes) {
            this.log(`Creating index "${toIndex(table, fields, unique)}"`, 'sync')
            await this.createIndex(table, fields, unique)
          }
        }

        // Create foreign keys
        for (const [table, { foreignKeys }] of Object.entries(this._collections)) {
          for (const { field, referencedCollection, referencedField, action } of foreignKeys) {
            this.log(`Creating foreign key "${toForeignKey(table, field)}"`, 'sync')
            await this.createForeignKey(table, field, referencedCollection, referencedField ?? 'id', action, false)
          }
        }
      })

      // Restore client instance
      this.exec = _exec

      // Store new schema map
      await this.exec(
        `insert into "Options" (key, value) values ('_schemaMap', $value) on conflict (key) do update set value = $value`,
        { value: JSON.stringify(this.schemaMap) },
      )

      // Finish
      this.log('Database schema synchronized', 'sync')
      await this.unlock('sync')
      return true
    } catch (error) {
      await this.unlock('sync')
      throw error
    }
  }

  /**
   * Creates a new `QueryBuilder` instance for building and executing database queries.
   *
   * @example
   * ```ts
   * const db = new Database({ collections: { ... } })
   * await db.connect()
   *
   * const qb = db.queryBuilder()
   *
   * const students = await qb.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Ron', lastName: 'Weasley' },
   * //     // ...
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const spells = await qb.insertInto('Spells')
   *   .values([
   *     { name: 'Expecto Patronum', type: 'Charm', difficulty: 'Advanced' },
   *     { name: 'Lumos', type: 'Charm', difficulty: 'Beginner' },
   *   ])
   *   .returning(['name'])
   *   .run()
   *
   * console.log(spells)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Expecto Patronum' },
   * //     { name: 'Lumos' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  queryBuilder<TCustomCollections = TCollections>(options?: {
    /**
     * The target language code for translations provided by the `i18n` instance.
     *
     * @default 'en'
     */
    contextLanguage?: string
  }) {
    // @ts-expect-error
    return new QueryBuilder<TCustomCollections, TI18n>(
      this.collections,
      this.i18n,
      this,
      options?.contextLanguage ?? 'en',
      this.options.logger,
    )
  }

  /**
   * Executes grouped queries in a transaction.
   */
  async transaction(callback: (exec: Exec) => any) {
    if (this.dialect === 'sqlite') {
      this.sqliteDatabase!.prepare('begin').run()

      try {
        await callback(this.exec)
        this.sqliteDatabase!.prepare('commit').run()
      } catch (error) {
        if (this.sqliteDatabase!.inTransaction) {
          this.sqliteDatabase!.prepare('rollback').run()
        }

        throw error
      }
    } else if (this.dialect === 'postgres') {
      const client = await this.pgPool!.connect()
      const execWithDuration = this.createExecWithDurationFn(client)

      try {
        await client.query('begin')
        await callback(this.createExecFn(execWithDuration))
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    } else if (this.dialect === 'd1') {
      await callback(this.exec) // D1 transactions are not supported
    }
  }

  /**
   * Lists all tables in the database.
   */
  async listTables(): Promise<string[]> {
    if (this.dialect === 'postgres') {
      const rows = await this.exec("select table_name from information_schema.tables where table_schema = 'public'")
      return rows.map(({ table_name }) => table_name)
    } else {
      const rows = await this.exec("select name from sqlite_master where type = 'table'")
      return rows.map(({ name }) => name).filter((name) => name !== 'sqlite_sequence' && !name.startsWith('_cf_'))
    }
  }

  /**
   * Lists all columns for a table.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   *
   * @throws an error if the table does not exist.
   */
  async listColumns(tableName: string): Promise<string[]> {
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table "${tableName}" does not exist`)
    }

    if (this.dialect === 'postgres') {
      const rows = await this.exec(`select column_name from information_schema.columns where table_name = $tableName`, {
        tableName,
      })
      return rows.map(({ column_name }) => column_name)
    } else {
      const rows = await this.exec(`pragma table_info("${tableName}")` as 'select ')
      return rows.map(({ name }) => name)
    }
  }

  /**
   * Lists all indexes for a table.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   *
   * @throws an error if the table does not exist.
   */
  async listIndexes(tableName: string): Promise<string[]> {
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table "${tableName}" does not exist`)
    }

    if (this.dialect === 'postgres') {
      const rows = await this.exec(
        `select indexname from pg_indexes where tablename = $tableName and indexname != $indexName`,
        { tableName, indexName: `${tableName}_pkey` },
      )
      return rows.map(({ indexname }) => indexname).filter((name) => name !== 'UX_Options__key')
    } else {
      const rows = await this.exec(
        `select name from sqlite_master where tbl_name = $tableName and type = 'index' and sql is not null`,
        { tableName },
      )
      return rows
        .map(({ name }) => name)
        .filter((name) => name !== 'UX_Options__key' && !name.startsWith('sqlite_autoindex_'))
    }
  }

  /**
   * Lists all foreign keys for a table.
   *
   * @throws an error if the table does not exist.
   */
  async listForeignKeys(tableName: string): Promise<string[]> {
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table "${tableName}" does not exist`)
    }

    if (this.dialect === 'postgres') {
      const rows = await this.exec(
        `select constraint_name from information_schema.table_constraints where table_name = $tableName and constraint_type = 'FOREIGN KEY'`,
        { tableName },
      )
      return rows.map(({ constraint_name }) => constraint_name)
    } else {
      const rows = await this.exec(`select sql from sqlite_master where name = $tableName`, {
        tableName,
      })
      return rows[0]?.sql.match(/constraint "(.+?)" foreign key/g)?.map((match: string) => match.slice(12, -13)) ?? []
    }
  }

  /**
   * Checks if a table exists in the database.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   */
  async tableExists(tableName: string) {
    return (await this.listTables()).includes(tableName)
  }

  /**
   * Checks if a column exists in a table.
   *
   * WARNING: The `tableName` and `columnName` parameters are not sanitized and should be validated before calling this method.
   */
  async columnExists(tableName: string, columnName: string) {
    return (await this.listColumns(tableName)).includes(columnName)
  }

  /**
   * Checks if an index exists in a table.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   */
  async indexExists(tableName: string, indexName: string) {
    return (await this.listIndexes(tableName)).includes(indexName)
  }

  /**
   * Checks if a foreign key constraint exists in a table.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   */
  async foreignKeyExists(tableName: string, constraintName: string) {
    return (await this.listForeignKeys(tableName)).includes(constraintName)
  }

  /**
   * Creates a table in the database.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   */
  async createTable(tableName: string) {
    const idType = this.dialect === 'postgres' ? 'bigserial primary key' : 'integer primary key autoincrement'
    await this.exec(`create table "${tableName}" ("id" ${idType})`)
  }

  /**
   * Creates a column in a table.
   * The `nullable` parameter is optional and defaults to `true`.
   *
   * WARNING: The `tableName` and `columnName` parameters are not sanitized and should be validated before calling this method.
   */
  async createColumn(tableName: string, columnName: string, type: DataType, nullable = true) {
    if (this.dialect === 'postgres') {
      await this.exec(`alter table "${tableName}" add column "${columnName}" ${type} ${nullable ? 'null' : 'not null'}`)
    } else {
      const checkTypes = this.getSQLiteCheckTypes(columnName, type)

      if (!checkTypes) {
        await this.exec(
          `alter table "${tableName}" add column "${columnName}" ${type} ${nullable ? 'null' : 'not null'}`,
        )
      } else if (nullable) {
        await this.exec(
          `alter table "${tableName}" add column "${columnName}" ${type} check (${checkTypes} or "${columnName}" is null)`,
        )
      } else {
        await this.exec(`alter table "${tableName}" add column "${columnName}" ${type} not null check (${checkTypes})`)
      }
    }
  }

  protected getSQLiteCheckTypes(columnName: string, type: DataType) {
    return (type === 'bigint' || type === 'boolean' ? ['integer'] : type === 'numeric' ? ['integer', 'real'] : [])
      .map((checkType) => `typeof("${columnName}") = '${checkType}'`)
      .join(' or ')
  }

  /**
   * Creates an index in a table.
   * The `unique` parameter is optional and defaults to `false`.
   *
   * WARNING: The `tableName` and `columnNames` parameters are not sanitized and should be validated before calling this method.
   */
  async createIndex(tableName: string, columnNames: string[], unique = false) {
    await this.exec(
      `create ${unique ? 'unique ' : ''}index "${toIndex(tableName, columnNames, unique)}" on "${tableName}" (${columnNames
        .map((columnName) => `"${columnName}"`)
        .join(', ')})`,
    )
  }

  /**
   * Creates a foreign key constraint in a table.
   *
   * - The `referencedColumn` parameter is optional and defaults to `'id'`.
   * - The `action` parameter is optional and defaults to `['ON UPDATE RESTRICT', 'ON DELETE CASCADE']`.
   * - The `transaction` is applicable only for SQLite databases (not D1) and defaults to `true`.
   *
   * WARNING: The table and column names are not sanitized and should be validated before calling this method.
   */
  async createForeignKey(
    tableName: string,
    columnName: string,
    referencedTable: string,
    referencedColumn = 'id',
    action: ReferentialActions = ['ON UPDATE RESTRICT', 'ON DELETE CASCADE'],
    transaction = true,
  ) {
    if (this.dialect === 'postgres') {
      await this.exec(
        `alter table "${tableName}" add constraint "${toForeignKey(tableName, columnName)}" foreign key ("${columnName}") references "${referencedTable}" ("${referencedColumn}") ${action.join(' ')}`,
      )
    } else {
      if (transaction && this.dialect === 'sqlite') {
        await this.transaction((exec) =>
          this.createSQLiteForeignKey(exec, tableName, columnName, referencedTable, referencedColumn, action),
        )
      } else {
        await this.createSQLiteForeignKey(this.exec, tableName, columnName, referencedTable, referencedColumn, action)
      }
    }
  }

  protected async createSQLiteForeignKey(
    exec: Exec,
    tableName: string,
    columnName: string,
    referencedTable: string,
    referencedColumn = 'id',
    action: ReferentialActions = ['ON UPDATE RESTRICT', 'ON DELETE CASCADE'],
  ) {
    const tmpTableName = `TMP_${randomIdentifier()}`
    const tableInfo = await exec(`select sql from sqlite_master where type = 'table' and name = $tableName`, {
      tableName,
    })
    const indexes = await exec(`select sql from sqlite_master where type = 'index' and tbl_name = $tableName`, {
      tableName,
    })

    await exec(
      tableInfo[0].sql.slice(0, -1).replace(tableName, tmpTableName) +
        `, constraint "${toForeignKey(tableName, columnName)}" foreign key ("${columnName}") references "${referencedTable}" ("${referencedColumn}") ${action.join(' ')})`,
    )
    await exec(`insert into "${tmpTableName}" select * from "${tableName}"`)
    await exec(`drop table "${tableName}"`)
    await exec(`alter table "${tmpTableName}" rename to "${tableName}"`)
    await Promise.all(indexes.map(async ({ sql }) => exec(sql)))
  }

  /**
   * Renames a table in the database.
   *
   * WARNING: The `tableName` and `newTableName` parameters are not sanitized and should be validated before calling this method.
   */
  async renameTable(tableName: string, newTableName: string) {
    await this.exec(`alter table "${tableName}" rename to "${newTableName}"`)
  }

  /**
   * Renames a column in a table.
   *
   * WARNING: The `tableName`, `columnName`, and `newColumnName` parameters are not sanitized and should be validated before calling this method.
   */
  async renameColumn(tableName: string, columnName: string, newColumnName: string) {
    await this.exec(`alter table "${tableName}" rename column "${columnName}" to "${newColumnName}"`)
  }

  /**
   * Changes the type of a column in a table.
   *
   * WARNING: The `tableName`, `columnName`, and `type` parameters are not sanitized and should be validated before calling this method.
   *
   * @throws an error if the column type cannot be changed.
   */
  async changeColumnType(tableName: string, columnName: string, type: DataType, nullable: boolean) {
    if (this.dialect === 'postgres') {
      await this.exec(
        `alter table "${tableName}" alter column "${columnName}" set data type ${type} using "${columnName}"::${type}, alter column "${columnName}" ${
          nullable ? 'drop not null' : 'set not null'
        }`,
      )
    } else {
      await this.changeSQLiteColumnType(this.exec, tableName, columnName, type, nullable)
    }
  }

  protected async changeSQLiteColumnType(
    exec: Exec,
    tableName: string,
    columnName: string,
    type: DataType,
    nullable: boolean,
  ) {
    const tmpTableName = `TMP_${randomIdentifier()}`
    const tableInfo = await exec(`select sql from sqlite_master where type = 'table' and name = $tableName`, {
      tableName,
    })
    const regexp = new RegExp(`"${columnName}" .+?(,|\\)$)`)
    const indexes = await exec(`select sql from sqlite_master where type = 'index' and tbl_name = $tableName`, {
      tableName,
    })
    const checkTypes = this.getSQLiteCheckTypes(columnName, type)

    if (!regexp.test(tableInfo[0].sql)) {
      throw new Error(`Column "${tableName}.${columnName}" does not exist`)
    }

    let sql = tableInfo[0].sql.replace(tableName, tmpTableName)

    if (!checkTypes) {
      sql = sql.replace(regexp, `"${columnName}" ${type} ${nullable ? 'null' : 'not null'}$1`)
    } else if (nullable) {
      sql = sql.replace(regexp, `"${columnName}" ${type} check (${checkTypes} or "${columnName}" is null)$1`)
    } else {
      sql = sql.replace(regexp, `"${columnName}" ${type} not null check (${checkTypes})$1`)
    }

    await exec(sql)
    await exec(`insert into "${tmpTableName}" select * from "${tableName}"`)
    await exec(`drop table "${tableName}"`)
    await exec(`alter table "${tmpTableName}" rename to "${tableName}"`)
    await Promise.all(indexes.map(async ({ sql }) => exec(sql)))
  }

  /**
   * Changes the nullability of a column in a table.
   *
   * When changing a nullable column to non-nullable, all values that are `null` will be replaced with the default value of the new column type.
   *
   * WARNING: The `tableName`, `columnName`, and `type` parameters are not sanitized and should be validated before calling this method.
   *
   * @throws an error if the column nullability cannot be changed.
   */
  async changeColumnNullable(tableName: string, columnName: string, type: DataType, nullable: boolean) {
    if (!nullable) {
      await this.exec(
        `update "${tableName}" set "${columnName}" = ${type === 'text' ? "''" : type === 'boolean' ? false : 0} where "${columnName}" is null`,
      )
    }

    if (this.dialect === 'postgres') {
      await this.exec(
        `alter table "${tableName}" alter column "${columnName}" ${nullable ? 'drop not null' : 'set not null'}`,
      )
    } else {
      await this.changeSQLiteColumnType(this.exec, tableName, columnName, type, nullable)
    }
  }

  /**
   * Drops a table from the database.
   *
   * WARNING: The `tableName` parameter is not sanitized and should be validated before calling this method.
   */
  async dropTable(tableName: string) {
    await this.exec(`drop table "${tableName}"`)
  }

  /**
   * Drops a column from a table.
   *
   * WARNING: The `tableName` and `columnName` parameters are not sanitized and should be validated before calling this method.
   */
  async dropColumn(tableName: string, columnName: string) {
    await this.exec(`alter table "${tableName}" drop column "${columnName}"`)
  }

  /**
   * Drops an index by its name.
   *
   * WARNING: The `indexName` parameter is not sanitized and should be validated before calling this method.
   */
  async dropIndex(indexName: string) {
    await this.exec(`drop index "${indexName}"`)
  }

  /**
   * Drops a foreign key constraint from a table.
   *
   * The `transaction` is applicable only for SQLite databases and defaults to `true`.
   *
   * WARNING: The `tableName` and `constraintName` parameters are not sanitized and should be validated before calling this method.
   */
  async dropForeignKey(tableName: string, constraintName: string, transaction = true) {
    if (this.dialect === 'postgres') {
      await this.exec(`alter table "${tableName}" drop constraint "${constraintName}"`)
    } else {
      if (transaction) {
        await this.transaction((exec) => this.dropSQLiteForeignKey(exec, tableName, constraintName))
      } else {
        await this.dropSQLiteForeignKey(this.exec, tableName, constraintName)
      }
    }
  }

  protected async dropSQLiteForeignKey(exec: Exec, tableName: string, constraintName: string) {
    const tmpTableName = `TMP_${randomIdentifier()}`
    const tableInfo = await exec(`select sql from sqlite_master where type = 'table' and name = $tableName`, {
      tableName,
    })
    const regexp = new RegExp(
      `, constraint "${constraintName}" foreign key \\(".+?"\\) references ".+?" \\(".+?"\\).+?([,\)])`,
    )

    if (!regexp.test(tableInfo[0].sql)) {
      throw new Error(`Constraint "${constraintName}" of table "${tableName}" does not exist`)
    }

    const indexes = await exec(`select sql from sqlite_master where type = 'index' and tbl_name = $tableName`, {
      tableName,
    })

    await exec(tableInfo[0].sql.replace(tableName, tmpTableName).replace(regexp, '$1'))
    await exec(`insert into "${tmpTableName}" select * from "${tableName}"`)
    await exec(`drop table "${tableName}"`)
    await exec(`alter table "${tmpTableName}" rename to "${tableName}"`)
    await Promise.all(indexes.map(async ({ sql }) => exec(sql)))
  }

  /**
   * Retrieves an option in the `Options` table by its `key`.
   *
   * @returns the option value or `undefined` if the option `key` does not exist.
   * @throws an error if the option `key` is invalid.
   */
  async getOption<V>(key: string): Promise<V | undefined> {
    if (!isIdentifier(key) || key.startsWith('_')) {
      throw new Error(`Invalid option key: ${key}`)
    }

    const rows = await this.exec('select value from "Options" where key = $key', { key })
    const value = rows[0]?.value

    return isString(value) ? JSON.parse(value) : undefined
  }

  /**
   * Retrieves multiple options in the `Options` table by their `keys`.
   *
   * @returns a record of option values by their `keys`.
   * @throws an error if any of the option `keys` are invalid.
   */
  async getOptions<K extends string>(keys: K[]): Promise<Record<K, any>> {
    const options: Record<string, any> = {}

    if (keys.length) {
      for (const key of keys) {
        if (!isIdentifier(key) || key.startsWith('_')) {
          throw new Error(`Invalid option key: ${key}`)
        }
      }

      for (let i = 0; i < keys.length; i += 100) {
        const batch = keys.slice(i, i + 100)
        const rows = await this.exec(
          `select key, value from "Options" where key in (${batch.map((_, i) => `$p${i + 1}`).join(', ')})`,
          Object.fromEntries(batch.map((key, i) => [`p${i + 1}`, key])),
        )
        const values = Object.fromEntries(rows.map((row: any) => [row.key, JSON.parse(row.value)]))

        Object.assign(options, Object.fromEntries(batch.map((key) => [key, values[key]])))
      }
    }

    return options
  }

  /**
   * Retrieves all options in the `Options` table.
   *
   * @returns a record of all option values by their keys.
   */
  async getAllOptions(): Promise<Record<string, any>> {
    const rows = await this.exec(`select key, value from "Options" where key not like '\\_%' escape '\\'`)
    return Object.fromEntries(rows.map((row: any) => [row.key, JSON.parse(row.value)]))
  }

  /**
   * Sets an option in the `Options` table by its `key`.
   *
   * @returns `true` if the option was set or updated, `false` otherwise.
   * @throws an error if the option `key` is invalid.
   */
  async setOption(key: string, value: any): Promise<boolean> {
    if (!isIdentifier(key) || key.startsWith('_')) {
      throw new Error(`Invalid option key: ${key}`)
    }

    const changes = await this.exec(
      'insert into "Options" (key, value) values ($key, $value) on conflict (key) do update set value = $value',
      { key, value: JSON.stringify(value) },
    )

    return changes > 0
  }

  /**
   * Sets multiple options in the `Options` table by their `keys`.
   *
   * @returns `true` if the options were set or updated, `false` otherwise.
   * @throws an error if any of the option `keys` are invalid.
   */
  async setOptions(options: { [key: string]: any }): Promise<boolean> {
    for (const key in options) {
      if (!isIdentifier(key) || key.startsWith('_')) {
        throw new Error(`Invalid option key: ${key}`)
      }
    }

    const changes = await this.exec(
      'insert into "Options" (key, value) values ' +
        Object.entries(options)
          .map((_, i) => `($k${i + 1}, $v${i + 1})`)
          .join(', ') +
        ' on conflict (key) do update set value = excluded.value',
      Object.fromEntries(
        Object.entries(options).flatMap(([k, v], i) => [
          [`k${i + 1}`, k],
          [`v${i + 1}`, JSON.stringify(v)],
        ]),
      ),
    )

    return changes > 0
  }

  /**
   * Deletes an option in the `Options` table by its `key`.
   *
   * @returns `true` if the option was deleted, `false` otherwise.
   * @throws an error if the option `key` is invalid.
   */
  async deleteOption(key: string): Promise<boolean> {
    if (!isIdentifier(key) || key.startsWith('_')) {
      throw new Error(`Invalid option key: ${key}`)
    }

    const changes = await this.exec('delete from "Options" where key = $key', { key })
    return changes > 0
  }

  /**
   * Deletes multiple options in the `Options` table by their `keys`.
   *
   * @returns the number of options deleted.
   * @throws an error if any of the option `keys` are invalid.
   */
  async deleteOptions(keys: string[]): Promise<number> {
    let changes = 0

    if (keys.length) {
      for (const key of keys) {
        if (!isIdentifier(key) || key.startsWith('_')) {
          throw new Error(`Invalid option key: ${key}`)
        }
      }

      for (let i = 0; i < keys.length; i += 100) {
        const batch = keys.slice(i, i + 100)

        changes += await this.exec(
          `delete from "Options" where key in (${batch.map((_, i) => `$p${i + 1}`).join(', ')})`,
          Object.fromEntries(batch.map((key, i) => [`p${i + 1}`, key])),
        )
      }
    }

    return changes
  }

  /**
   * Deletes all options in the `Options` table.
   *
   * @returns the number of options deleted.
   */
  async deleteAllOptions(): Promise<number> {
    return this.exec(`delete from "Options" where key not like '\\_%' escape '\\'`)
  }

  protected createExecWithDurationFn(client?: pg.PoolClient): ExecWithDuration {
    if (this.dialect === 'sqlite') {
      return (sql: string, params?: Record<string, any>, suppress?: boolean) => {
        return new Promise<any>((resolve, reject) => {
          const prepared = prepareQuery(sql, params ?? {}, 'sqlite')

          this.log(`Executing query: ${prepared.sql}`, 'exec')

          if (!isEmpty(prepared.params)) {
            this.log(`...with query parameters: ${JSON.stringify(prepared.params, null, 2)}`, 'exec')
          }

          if (prepared.error) {
            if (suppress) {
              return resolve({ result: undefined, duration: 0 })
            } else {
              return reject(prepared.error)
            }
          }

          try {
            const _sql = prepared.sql.trimStart().toLowerCase()

            if (_sql.startsWith('select') || _sql.startsWith('pragma') || / returning [^\)]+$/.test(_sql)) {
              const start = performance.now()
              const result = this.sqliteDatabase!.prepare(prepared.sql).all(prepared.params)
              return resolve({ result, duration: performance.now() - start })
            } else {
              const start = performance.now()
              const result = this.sqliteDatabase!.prepare(prepared.sql).run(prepared.params).changes
              return resolve({ result, duration: performance.now() - start })
            }
          } catch (error) {
            if (!suppress) {
              return reject(new ExecError(error, prepared.sql, prepared.params))
            }
          }

          return resolve({ result: undefined, duration: 0 })
        })
      }
    } else if (this.dialect === 'postgres') {
      return (sql: string, params?: Record<string, any>, suppress?: boolean) => {
        return new Promise<any>((resolve, reject) => {
          const prepared = prepareQuery(sql, params ?? {}, 'postgres')

          this.log(`Executing query: ${prepared.sql}`, 'exec')

          if (prepared.params.length) {
            this.log(`...with query parameters: ${JSON.stringify(prepared.params)}`, 'exec')
          }

          if (prepared.error) {
            if (suppress) {
              return resolve({ result: undefined, duration: 0 })
            } else {
              return reject(prepared.error)
            }
          }

          const start = performance.now()

          ;(client ?? this.pgPool!).query(prepared.sql, prepared.params, (error, result) => {
            if (error) {
              if (suppress) {
                return resolve({ result: undefined, duration: 0 })
              } else {
                return reject(new ExecError(error, prepared.sql, prepared.params))
              }
            }

            return resolve({
              result: result.fields.length ? result.rows : (result.rowCount ?? 0),
              duration: performance.now() - start,
            })
          })
        })
      }
    } else {
      return (sql: string, params?: Record<string, any>, suppress?: boolean) => {
        return new Promise<any>(async (resolve, reject) => {
          const prepared = prepareQuery(sql, params ?? {}, 'd1')

          this.log(`Executing query: ${prepared.sql}`, 'exec')

          if (prepared.params.length) {
            this.log(`...with query parameters: ${JSON.stringify(prepared.params)}`, 'exec')
          }

          if (prepared.error) {
            if (suppress) {
              return resolve({ result: undefined, duration: 0 })
            } else {
              return reject(prepared.error)
            }
          }

          try {
            const statement = this.d1!.prepare(prepared.sql).bind(...prepared.params)
            const _sql = prepared.sql.trimStart().toLowerCase()

            if (_sql.startsWith('select') || _sql.startsWith('pragma') || / returning [^\)]+$/.test(_sql)) {
              const result = await statement.all()
              return resolve({ result: result.results, duration: result.meta.duration })
            } else {
              const result = await statement.run()
              return resolve({ result: result.meta.changes, duration: result.meta.duration })
            }
          } catch (error) {
            if (!suppress) {
              return reject(new ExecError(error, prepared.sql, prepared.params))
            }
          }

          return resolve({ result: undefined, duration: 0 })
        })
      }
    }
  }

  protected createExecFn(execWithDuration: ExecWithDuration): Exec {
    return async (sql: string, params?: Record<string, any>, suppress?: boolean) => {
      return (await execWithDuration(sql, params, suppress)).result
    }
  }

  /**
   * Closes the database connection and releases all locks created by `this` instance.
   *
   * @throws an error if the connection is already closed.
   */
  async close() {
    if (this._connectionStatus === 'disconnected') {
      throw new Error('Database connection is already closed')
    }

    await Promise.all(this.instanceLocks.map((lock) => this.unlock(lock)))

    if (this.dialect === 'sqlite') {
      this.sqliteDatabase?.close()
    } else if (this.dialect === 'postgres') {
      await this.pgPool?.end()
    }

    this._connectionStatus = 'disconnected'
  }
}
