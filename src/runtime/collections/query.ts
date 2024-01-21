import {
  primaryLanguage,
  type MultiCollectionName,
  type SingleCollectionName,
  type SupportedLanguage,
  type UploadsCollectionName,
} from '#pruvious'
import { collections } from '#pruvious/server'
import type { QueryOptions, QueryOptionsWithType, QueryTypes } from 'sequelize'
import { db } from '../instances/database'
import { getModuleOption } from '../instances/state'
import type { QueryBuilderInstance } from '../utility-types'
import { isObject } from '../utils/object'
import { __ } from '../utils/server/translate-string'
import { QueryBuilder } from './query-builder'
import { SingleQueryBuilder } from './single-query-builder'
import { UploadsQueryBuilder } from './uploads-query-builder'

/**
 * Construct a `QueryBuilder` for multi-entry collections.
 *
 * @see https://pruvious.com/docs/query-builder
 */
export function query<T extends Exclude<MultiCollectionName, UploadsCollectionName>>(
  collection: T,
  contextLanguage?: SupportedLanguage,
): QueryBuilderInstance<T>

/**
 * Construct a `SingleQueryBuilder` for single-entry collections.
 *
 * @see https://pruvious.com/docs/query-builder
 */
export function query<T extends SingleCollectionName>(
  collection: T,
  contextLanguage?: SupportedLanguage,
): QueryBuilderInstance<T>

/**
 * Construct a `UploadsQueryBuilder` for the uploads collection.
 *
 * @see https://pruvious.com/docs/query-builder
 */
export function query<T extends UploadsCollectionName>(
  collection: T,
  contextLanguage?: SupportedLanguage,
): QueryBuilderInstance<T>

export function query(collection: string, contextLanguage: SupportedLanguage = primaryLanguage) {
  if (!(collections as any)[collection]) {
    throw new Error(__(contextLanguage, 'pruvious-server', "Unknown collection name: '$collection'", { collection }))
  }

  if ((collections as any)[collection].mode === 'single') {
    return new (SingleQueryBuilder as any)(collection, contextLanguage)
  }

  if (getModuleOption('uploads') && collection === 'uploads') {
    return new UploadsQueryBuilder('uploads', contextLanguage)
  }

  return new (QueryBuilder as any)(collection, contextLanguage)
}

/**
 * Execute a custom SQL query against the database.
 *
 * @param sql - The SQL query string to be executed.
 * @param replacements - An optional object of escaped replacements used to substitute placeholders in the SQL query.
 *
 * @returns A Promise that resolves to either the query results (SELECT only) or the number of affected rows.
 *
 * @see https://pruvious.com/docs/query-builder
 *
 * @example
 * ```typescript
 * await rawQuery('SELECT * FROM products WHERE price BETWEEN :min AND :max', { min: 20, max: 50 })
 * // Output: { results: [{ id: 1, name: 'Product A', price: 25 }, ...], metadata: {} }
 * ```
 */
export async function rawQuery(
  sql: string,
  replacements?: Record<string, any>,
  options?: QueryOptions | QueryOptionsWithType<QueryTypes.RAW>,
): Promise<{ results: any; metadata: any }> {
  const preparedReplacements: Record<string, any> = {}

  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      preparedReplacements[key] = isObject(value) ? JSON.stringify(value) : value
    }
  }

  const [results, metadata]: any = await (await db()).query(sql, { replacements: preparedReplacements, ...options })

  return { results, metadata }
}
