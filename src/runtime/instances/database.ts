import { consola } from 'consola'
import fs from 'fs-extra'
import pg from 'pg'
import {
  DataTypes,
  Model,
  Op,
  Sequelize,
  type IndexesOptions,
  type ModelAttributes,
  type Options as SequelizeOptions,
} from 'sequelize'
import 'sqlite3'
import { isDevelopment } from 'std-env'
import type { ResolvedCollectionDefinition } from '../collections/collection.definition'
import type { ResolvedFieldDefinition } from '../fields/field.definition'
import { clearArray, isArray } from '../utils/array'
import { foreignKeyConstraintName, getDatabaseInfo, indexName } from '../utils/database'
import { isDebugActive } from '../utils/debug'
import { sleep } from '../utils/function'
import { camelCase, snakeCase } from '../utils/string'
import { error, success } from './logger'
import { resolveAppPath } from './path'
import { getModuleOption } from './state'

export const opMap = {
  '=': Op.eq,
  '!=': Op.ne,
  '>': Op.gt,
  '>=': Op.gte,
  '<': Op.lt,
  '<=': Op.lte,
  'between': Op.between,
  'notBetween': Op.notBetween,
  'in': Op.in,
  'notIn': Op.notIn,
  'like': Op.like,
  'notLike': Op.notLike,
  'iLike': Op.iLike,
  'notILike': Op.notILike,
}

export const opMapSqlite = {
  ...opMap,
  iLike: Op.like,
  notILike: Op.notLike,
}

let instance: Sequelize | undefined
let status: 'initial' | 'rebuilding' | 'ready' = 'initial'

/**
 * Return the Sequelize database client.
 */
export async function db(): Promise<Sequelize> {
  if (status === 'initial') {
    const { fields, collections } = await import('#pruvious/server')

    if (status === 'initial') {
      instance = await rebuildDatabase(fields, collections, false)
    }
  }

  while (status === 'rebuilding') {
    await sleep(50)
  }

  return instance!
}

/**
 * Recreate the database instance by rebuilding all tables, columns, indexes, and constraints.
 */
export async function rebuildDatabase(
  fields: Record<string, ResolvedFieldDefinition>,
  collections: Record<string, ResolvedCollectionDefinition>,
  log = true,
): Promise<Sequelize> {
  while (status === 'rebuilding') {
    await sleep(50)
  }

  status = 'rebuilding'

  const start = performance.now()
  const dbInfo = getDatabaseInfo()
  const migration = getModuleOption('migration')
  const options: SequelizeOptions = {
    ...dbInfo,
    dialectOptions: {
      decimalNumbers: true,
      ssl: dbInfo.dialect === 'postgres' && dbInfo.ssl ? { require: true, rejectUnauthorized: false } : undefined,
    },
    dialectModule: dbInfo.dialect === 'postgres' ? pg : undefined,
    logging: isDebugActive('database') ? consola.create({}).withTag('sequelize').log : false,
  }
  const singleColletionsTable = getModuleOption('singleCollectionsTable')
  const multiCollections = Object.values(collections).filter(({ mode }) => mode === 'multi')
  const standardCollections = getModuleOption('standardCollections')

  instance = new Sequelize(options)

  for (const collection of multiCollections) {
    const tableName = snakeCase(collection.name)
    const attributes: ModelAttributes<Model<any, any>, any> = {}
    const indexes: IndexesOptions[] = []

    for (const [fieldName, { type, additional }] of Object.entries(collection.fields)) {
      const columnName = snakeCase(fieldName)
      const field = fields[type]

      attributes[columnName] =
        columnName === 'id'
          ? { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true }
          : { type: field.type.db, allowNull: additional?.nullable !== false }

      if (additional?.index) {
        indexes.push({
          fields: [columnName],
          name: indexName(tableName, columnName),
        })
      }

      if (additional?.unique) {
        indexes.push({
          fields: additional.unique === 'perLanguage' ? [columnName, 'language'] : [columnName],
          unique: dbInfo.dialect === 'postgres', // https://github.com/sequelize/sequelize/pull/13647
          name: indexName(tableName, columnName, true),
        })
      }
    }

    if (collection.search) {
      for (const structure of Object.keys(collection.search)) {
        const columnName = `_search_${snakeCase(structure)}`
        attributes[columnName] = { type: DataTypes.TEXT }
      }
    }

    for (const index of collection.compositeIndexes) {
      const attributes = index.map((fieldName) => snakeCase(fieldName))
      indexes.push({
        fields: attributes,
        name: indexName(tableName, attributes),
      })
    }

    for (const index of collection.uniqueCompositeIndexes) {
      const attributes = index.map((fieldName) => snakeCase(fieldName))
      indexes.push({
        fields: attributes,
        unique: dbInfo.dialect === 'postgres',
        name: indexName(tableName, attributes, true),
      })
    }

    instance.define(tableName, attributes, {
      indexes,
      freezeTableName: true,
      createdAt: false,
      updatedAt: false,
    })
  }

  instance.define(
    '_jobs',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      args: { type: DataTypes.TEXT, allowNull: false },
      jti: { type: DataTypes.TEXT, allowNull: false },
      priority: { type: DataTypes.INTEGER, allowNull: false },
      created_at: { type: DataTypes.BIGINT, allowNull: false },
    },
    {
      indexes: [
        { fields: ['jti'], name: 'ix__jobs_jti' },
        { fields: ['priority', 'created_at'], name: 'cx__jobs_priority_created_at' },
      ],
      createdAt: false,
      updatedAt: false,
    },
  )

  instance.define(
    '_tokens',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      token: { type: DataTypes.TEXT, allowNull: false },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      iat: { type: DataTypes.INTEGER, allowNull: false },
      exp: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      indexes: [
        { fields: ['token'], name: 'ix__tokens_token' },
        { fields: ['exp'], name: 'ix__tokens_exp' },
      ],
      createdAt: false,
      updatedAt: false,
    },
  )

  if (standardCollections.uploads) {
    instance.define(
      '_optimized_images',
      {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        upload_id: { type: DataTypes.BIGINT, allowNull: false },
        hash: { type: DataTypes.TEXT, allowNull: false },
        format: { type: DataTypes.TEXT, allowNull: false },
        width: { type: DataTypes.BIGINT },
        height: { type: DataTypes.BIGINT },
        resize: { type: DataTypes.TEXT, allowNull: false },
        without_enlargement: { type: DataTypes.BOOLEAN },
        without_reduction: { type: DataTypes.BOOLEAN },
        position: { type: DataTypes.TEXT, allowNull: false },
        interpolation: { type: DataTypes.TEXT, allowNull: false },
        quality: { type: DataTypes.INTEGER },
        alpha_quality: { type: DataTypes.INTEGER },
        lossless: { type: DataTypes.BOOLEAN },
        near_lossless: { type: DataTypes.BOOLEAN },
        smart_subsample: { type: DataTypes.BOOLEAN },
      },
      {
        indexes: [
          {
            fields: ['upload_id', 'hash'],
            unique: dbInfo.dialect === 'postgres',
            name: 'ux__optimized_images_upload_id_hash',
          },
        ],
        createdAt: false,
        updatedAt: false,
      },
    )
  }

  instance.define(
    singleColletionsTable,
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      language: { type: DataTypes.TEXT, allowNull: false },
      data: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      indexes: [
        {
          fields: ['name', 'language'],
          unique: dbInfo.dialect === 'postgres',
          name: indexName(singleColletionsTable, ['name', 'language'], true),
        },
      ],
      createdAt: false,
      updatedAt: false,
    },
  )

  try {
    await instance.authenticate()

    if (migration) {
      const tokensTableInitialized = await instance!.getQueryInterface().tableExists('_tokens')

      await instance!.sync({ alter: true })

      // Clean unused indexes
      for (const collection of multiCollections) {
        const tableName = snakeCase(collection.name)

        for (const index of (await instance!.getQueryInterface().showIndex(collection.name)) as any[]) {
          if (
            index.name.startsWith('cx_') &&
            !collection.compositeIndexes.some((compositeIndex) =>
              index.fields
                .map(({ attribute }: any) => camelCase(attribute))
                .every((fieldName: string) => compositeIndex.includes(fieldName)),
            )
          ) {
            await instance!.getQueryInterface().removeIndex(tableName, index.name)
          } else if (
            index.name.startsWith('uc_') &&
            !collection.uniqueCompositeIndexes.some((compositeIndex) =>
              index.fields
                .map(({ attribute }: any) => camelCase(attribute))
                .every((fieldName: string) => compositeIndex.includes(fieldName)),
            )
          ) {
            await instance!.getQueryInterface().removeIndex(tableName, index.name)
          } else if (
            index.name.startsWith('ix_') &&
            !collection.fields[camelCase(index.fields[0].attribute)]?.additional?.index &&
            (!collection.search || collection.search[index.fields[0].attribute])
          ) {
            await instance!.getQueryInterface().removeIndex(tableName, index.name)
          } else if (
            index.name.startsWith('ux_') &&
            !collection.fields[camelCase(index.fields[0].attribute)]?.additional?.unique
          ) {
            await instance!.getQueryInterface().removeIndex(tableName, index.name)
          }
        }
      }

      // Sync foreign keys
      const pragma = dbInfo.dialect === 'sqlite' ? 'PRAGMA foreign_keys = ON; ' : ''

      for (const collection of multiCollections) {
        const tableName = snakeCase(collection.name)

        for (const [fieldName, { additional }] of Object.entries(collection.fields)) {
          const columnName = snakeCase(fieldName)
          const constraintName = foreignKeyConstraintName(tableName, columnName)

          await instance!.query(`${pragma}ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraintName}"`)

          if (additional?.foreignKey) {
            await instance!.query(
              `${pragma}ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${columnName}") REFERENCES ${
                additional.foreignKey.table
              }(${additional.foreignKey.column ?? 'id'}) ${(
                additional.foreignKey.action ?? ['ON UPDATE RESTRICT', 'ON DELETE SET NULL']
              ).join(' ')}`,
            )
          }
        }
      }

      if (!tokensTableInitialized) {
        await instance!.query(
          `${pragma}ALTER TABLE _tokens ADD CONSTRAINT fk__tokens_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
        )
      }
    }

    if (log) {
      success(`Database synced in ${Math.round(performance.now() - start)} ms`)
    }
  } catch (e: any) {
    if (isDevelopment && e.name === 'SequelizeUniqueConstraintError' && isArray(e.fields) && e.fields[0] === 'id') {
      const match = e.original.toString().match(/([a-z0-9_]+_backup)\.id/)

      if (match && (await instance!.getQueryInterface().tableExists(match[1]))) {
        await instance!.getQueryInterface().dropTable(match[1])
        status = 'initial'
        return rebuildDatabase(fields, collections, log)
      }
    } else {
      error(e)
    }
  }

  const autoloadSql = resolveAppPath('./.autoload.sql')

  if (isDevelopment && dbInfo.dialect === 'sqlite' && fs.existsSync(autoloadSql)) {
    const transaction = await instance.transaction({ autocommit: false })
    const buffer: string[] = []

    for (const line of fs.readFileSync(autoloadSql, 'utf8').split('\n')) {
      if (line.startsWith('INSERT INTO ') && buffer.length) {
        await instance.query(buffer.join('\n'), { transaction })
        clearArray(buffer)
      }

      buffer.push(line)
    }

    if (buffer.length) {
      await instance.query(buffer.join('\n'), { transaction })
    }

    await transaction.commit()
    fs.removeSync(autoloadSql)
  }

  status = 'ready'

  return instance
}
