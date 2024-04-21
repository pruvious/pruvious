import type {
  CastedFieldType,
  CollectionField,
  CollectionFieldName,
  CollectionSearchStructure,
  CreateInput,
  FieldNameByType,
  ImmutableFieldName,
  MultiCollectionName,
  PopulatedFieldType,
  SearchableCollectionName,
  SelectableFieldName,
  SerializedFieldType,
  Sortable,
  SupportedLanguage,
  UpdateInput,
} from '#pruvious'
import { primaryLanguage } from '#pruvious'
import { collections, fields } from '#pruvious/server'
import type { WhereOptions as SequelizeWhereOptions } from 'sequelize'
import { Op, Sequelize } from 'sequelize'
import { cache } from '../instances/cache'
import { db, opMap, opMapSqlite } from '../instances/database'
import { clearPageCache } from '../plugins/page-cache'
import { clearArray, isArray, sortNaturalByProp, toArray, uniqueArray } from '../utils/array'
import { isDefined, isNull, isUndefined } from '../utils/common'
import { getDatabaseDialect } from '../utils/database'
import { isFunction } from '../utils/function'
import {
  deepClone,
  deleteProperty,
  getProperty,
  isKeyOf,
  isObject,
  objectOmit,
  objectPick,
  setProperty,
  snakeCasePropNames,
  stringifySymbols,
  walkObject,
} from '../utils/object'
import { _, __ } from '../utils/server/translate-string'
import { camelCase, extractKeywords, isString, snakeCase } from '../utils/string'
import type { ExtractKeywordsContext, ResolvedCollectionDefinition } from './collection.definition'
import { resolveCollectionFieldOptions } from './field-options.resolver'
import { query as _query } from './query'
import type { QueryStringParams } from './query-string'

export type PickFields<T extends string, S extends T> = Record<S, true> & Partial<Record<T, true>>

export type BooleanField<T> = { [k in keyof T]: T[k] extends boolean ? k : never }[keyof T]
export type NumberField<T> = { [k in keyof T]: T[k] extends number ? k : never }[keyof T]
export type StringField<T> = { [k in keyof T]: T[k] extends string ? k : never }[keyof T]
export type StringOrNumberField<T> = { [k in keyof T]: T[k] extends string | number ? k : never }[keyof T]

export type WithNull<T> = T | null

export type FilterMethod =
  | 'where'
  | 'whereEq'
  | 'whereNe'
  | 'whereGt'
  | 'whereGte'
  | 'whereLt'
  | 'whereLte'
  | 'whereBetween'
  | 'whereNotBetween'
  | 'whereIn'
  | 'whereNotIn'
  | 'whereRecordsIn'
  | 'whereRecordsNotIn'
  | 'whereLike'
  | 'whereNotLike'
  | 'whereILike'
  | 'whereNotILike'
  | 'some'
  | 'every'

type BaseMultiQueryBuilderMethod =
  | FilterMethod
  | 'applyQueryStringParams'
  | 'select'
  | 'selectAll'
  | 'deselect'
  | 'some'
  | 'every'
  | 'order'
  | 'group'
  | 'offset'
  | 'limit'
  | 'populate'
  | 'unpopulate'
  | 'getFieldValueType'
  | 'setFieldValueType'
  | 'fallback'
  | 'noFallback'
  | 'contextLanguage'
  | 'getOptions'
  | 'clone'
  | 'clearWhere'
  | 'clearOrder'
  | 'clearGroup'
  | 'clearOffset'
  | 'clearLimit'
  | 'reset'
  | 'count'
  | 'exists'
  | 'notExists'
  | 'all'
  | 'allWithCount'
  | 'paginate'
  | 'first'
  | 'min'
  | 'max'
  | 'sum'
  | 'validate'
  | 'create'
  | 'createMany'
  | 'update'
  | 'delete'

export type MultiQueryBuilderMethod<T extends MultiCollectionName> = T extends SearchableCollectionName
  ? BaseMultiQueryBuilderMethod | 'search' | 'orderBySearchRelevance' | 'clearSearch'
  : BaseMultiQueryBuilderMethod

export type ValidationError<ReturnableFieldName extends string> = Partial<Record<ReturnableFieldName, string>>

export type CreateResult<ReturnedFieldType, ReturnableFieldName extends string & keyof ReturnedFieldType> =
  | {
      /**
       * Indicates whether the record creation was successful.
       */
      success: true

      /**
       * The created record.
       */
      record: Pick<ReturnedFieldType, ReturnableFieldName>
    }
  | {
      /**
       * Indicates whether the record creation was successful.
       */
      success: false

      /**
       * A key-value object containing validation errors.
       * The keys represent the field names, and the values represent the corresponding error messages.
       */
      errors: ValidationError<ReturnableFieldName>

      /**
       * An optional error message created during the database query.
       *
       * This message is typically rare and may occur when there's a discrepancy between the data validation process and the SQL query execution.
       * It may happen if the database has changed in the meantime and no longer meets the previous validation requirements.
       * For example, it could occur if a record being updated has been deleted, or when inserting a new record with a unique constraint.
       */
      message?: string
    }

export type CreateManyResult<ReturnedFieldType, ReturnableFieldName extends string & keyof ReturnedFieldType> =
  | {
      /**
       * Indicates whether the records creation was successful.
       */
      success: true

      /**
       * The created records.
       */
      records: Pick<ReturnedFieldType, ReturnableFieldName>[]
    }
  | {
      /**
       * Indicates whether the records creation was successful.
       */
      success: false

      /**
       * An array containing validation errors as key-value objects.
       * Each element of the array represents the corresponding input at the same index.
       * If there are no errors for a particular input, the value will be `null`.
       * Otherwise, the value will be an object with keys representing field names and values representing error messages.
       */
      errors: (ValidationError<ReturnableFieldName> | null)[]

      /**
       * An optional error message created during the database query.
       */
      message?: string
    }

export type UpdateResult<ReturnedFieldType, ReturnableFieldName extends string & keyof ReturnedFieldType> =
  | {
      /**
       * Indicates whether the update was successful.
       */
      success: true

      /**
       * The updated records.
       */
      records: Pick<ReturnedFieldType, ReturnableFieldName>[]
    }
  | {
      /**
       * Indicates whether the update was successful.
       */
      success: false

      /**
       * A key-value object containing validation errors.
       * The keys represent the field names, and the values represent the corresponding error messages.
       */
      errors: ValidationError<ReturnableFieldName>

      /**
       * An optional error message created during the database query.
       */
      message?: string
    }

export interface PaginateResult<T> {
  /**
   * The current page.
   */
  currentPage: number

  /**
   * The last page.
   */
  lastPage: number

  /**
   * Number of records per page.
   */
  perPage: number

  /**
   * List of fetched records.
   */
  records: T[]

  /**
   * Total number of queried records.
   */
  total: number
}

/**
 * Executes database queries for a multi-entry `collection`.
 *
 * @see https://pruvious.com/docs/query-builder#multi-entry-collections
 */
export class QueryBuilder<
  CollectionName extends MultiCollectionName,
  ReturnableFieldName extends SelectableFieldName[CollectionName] = SelectableFieldName[CollectionName],
  ReturnedFieldType extends Record<keyof CastedFieldType[CollectionName], any> = CastedFieldType[CollectionName],
  Method extends MultiQueryBuilderMethod<CollectionName> = MultiQueryBuilderMethod<CollectionName>,
> {
  protected dialect!: 'postgres' | 'sqlite'

  protected table!: string

  protected selectedFields: string[] = []

  protected whereOptions: Record<any, any> = { [Op.and]: [] }

  protected searchOptions: Partial<Record<CollectionSearchStructure[MultiCollectionName] & string, string[]>> = {}

  protected orderOptions: [Sortable[CollectionName], 'ASC NULLS LAST' | 'DESC NULLS LAST'][] = []

  protected groupOptions: SelectableFieldName[CollectionName][] = []

  protected offsetOption: number | undefined

  protected limitOption: number | undefined

  protected populateOption: boolean = false

  protected fallbackOption: boolean = true

  protected contextLanguageOption: SupportedLanguage

  constructor(protected collection: CollectionName, contextLanguage: SupportedLanguage = primaryLanguage) {
    this.contextLanguageOption = contextLanguage
    this.dialect = getDatabaseDialect()
    this.table = snakeCase(collection)
    this.selectAll()
  }

  /**
   * Apply query string parameters to the current query.
   *
   * @example
   * ```typescript
   * export default defineEventHandler((event) => {
   *   const qs = getQueryStringParams(event, 'products')
   *
   *   if (qs.errors.length) {
   *     setResponseStatus(event, 400)
   *     return qs.errors.join('\n')
   *   }
   *
   *   return query('products').applyQueryStringParams(qs.params).all()
   * })
   * ```
   */
  applyQueryStringParams(
    params: Partial<QueryStringParams<CollectionName>>,
  ): Pick<
    QueryBuilder<
      CollectionName,
      SelectableFieldName[CollectionName],
      (
        | CastedFieldType[CollectionName]
        | PopulatedFieldType[CollectionName]
        | Record<SelectableFieldName[CollectionName], undefined>
      ) & { [key in keyof CastedFieldType[CollectionName]]: unknown },
      MultiQueryBuilderMethod<CollectionName>
    >,
    MultiQueryBuilderMethod<CollectionName>
  > {
    if (isKeyOf(params, 'select')) this.selectedFields = uniqueArray(params.select!)
    if (isKeyOf(params, 'where')) this.whereOptions = params.where!
    if (isKeyOf(params, 'search')) this.searchOptions = params.search!
    if (isKeyOf(params, 'group')) this.groupOptions = params.group!
    if (isKeyOf(params, 'offset')) this.offsetOption = params.offset
    if (isKeyOf(params, 'limit')) this.limitOption = params.limit
    if (isKeyOf(params, 'order')) this.orderOptions = params.order!
    if (isKeyOf(params, 'populate')) this.populateOption = params.populate!

    return this as any
  }

  /**
   * Specify the `fields` to be selected and returned from the query.
   *
   * @example
   * ```typescript
   * // Selects the 'name' and 'price' fields from the 'products' collection
   * await query('products').select({ name: true, price: true }).first()
   * // Output: { name: '...', price: '...' }
   * ```
   */
  select<T extends SelectableFieldName[CollectionName]>(
    fields: PickFields<SelectableFieldName[CollectionName], T> | T[],
  ): Pick<QueryBuilder<CollectionName, T, ReturnedFieldType, Method>, Method> {
    clearArray(this.selectedFields).push(...(isArray(fields) ? uniqueArray(fields) : Object.keys(fields)))
    return this as any
  }

  /**
   * Select all fields from the queried collection.
   *
   * @example
   * ```typescript
   * // Select all fields from the 'products' collection
   * await query('products').selectAll().first()
   * // Output: { field1: '...', field2: '...', ... }
   * ```
   */
  selectAll(): Pick<
    QueryBuilder<CollectionName, SelectableFieldName[CollectionName], ReturnedFieldType, Method>,
    Method
  > {
    const collection: ResolvedCollectionDefinition = (collections as any)[this.collection]
    clearArray(this.selectedFields).push(...Object.keys(collection.fields))
    return this as any
  }

  /**
   * Exclude specified `fields` from the query result.
   *
   * @example
   * ```typescript
   * // Don't return the 'secret' field from the 'products' collection
   * const product = await query('products').deselect({ secret: true }).first()
   * console.log(product.secret)
   * // Output: undefined
   * ```
   */
  deselect<T extends ReturnableFieldName>(
    fields: PickFields<ReturnableFieldName, T> | T[],
  ): Pick<QueryBuilder<CollectionName, Exclude<ReturnableFieldName, T>, ReturnedFieldType, Method>, Method> {
    const fieldsObj = isArray(fields) ? Object.fromEntries(fields.map((field) => [field, true])) : fields
    this.selectedFields = this.selectedFields.filter((fieldName) => !(fieldsObj as any)[fieldName])
    return this as any
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: status = 'active'
   * query('products').where('status', 'active')
   *
   * // Alternatives:
   * query('products').where('status', '=', 'active')
   * query('products').whereEq('status', 'active')
   * ```
   */
  where<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    value: WithNull<SerializedFieldType[CollectionName][T]>,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: status = 'active'
   * query('products').where('status', '=', 'active')
   *
   * // Alternatives:
   * query('products').where('status', 'active')
   * query('products').whereEq('status', 'active')
   * ```
   */
  where<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    operator: '=',
    value: WithNull<SerializedFieldType[CollectionName][T]>,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: discount != null
   * query('products').where('discount', '!=', null)
   *
   * // Alternative:
   * query('products').whereNe('discount', null)
   * ```
   */
  where<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    operator: '!=',
    value: WithNull<SerializedFieldType[CollectionName][T]>,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price > 100
   * query('products').where('price', '>', 100)
   *
   * // Alternative:
   * query('products').whereGt('price', 100)
   * ```
   */
  where<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: '>',
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price >= 100
   * query('products').where('price', '>=', 100)
   *
   * // Alternative:
   * query('products').whereGte('price', 100)
   * ```
   */
  where<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: '>=',
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price < 100
   * query('products').where('price', '<', 100)
   *
   * // Alternative:
   * query('products').whereLt('price', 100)
   * ```
   */
  where<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: '<',
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price <= 100
   * query('products').where('price', '<=', 100)
   *
   * // Alternative:
   * query('products').whereLte('price', 100)
   * ```
   */
  where<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: '<=',
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price >= 20 and price <= 50
   * query('products').where('price', 'between', [20, 50])
   *
   * // Alternative:
   * query('products').whereBetween('price', [20, 50])
   * ```
   */
  where<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: 'between',
    values: [SerializedFieldType[CollectionName][T], SerializedFieldType[CollectionName][T]],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price < 20 or price > 50
   * query('products').where('price', 'notBetween', [20, 50])
   *
   * // Alternative:
   * query('products').whereNotBetween('price', [20, 50])
   * ```
   */
  where<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: 'notBetween',
    values: [SerializedFieldType[CollectionName][T], SerializedFieldType[CollectionName][T]],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: id = 1 or id = 3 or id = 5
   * query('products').where('id', 'in', [1, 3, 5])
   *
   * // Alternative:
   * query('products').whereIn('id', [1, 3, 5])
   * ```
   */
  where<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    operator: 'in',
    values: SerializedFieldType[CollectionName][T][],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: id != 1 and id != 3 and id != 5
   * query('products').where('id', 'notIn', [1, 3, 5])
   *
   * // Alternative:
   * query('products').whereNotIn('id', [1, 3, 5])
   * ```
   */
  where<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    operator: 'notIn',
    values: SerializedFieldType[CollectionName][T][],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name starts with 'P' (case sensitive in PostgreSQL)
   * query('products').where('name', 'like', 'P%')
   *
   * // Alternative:
   * query('products').whereLike('name', 'P%')
   * ```
   */
  where<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: 'like',
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name does not start with 'P' (case sensitive in PostgreSQL)
   * query('products').where('name', 'notLike', 'P%')
   *
   * // Alternative:
   * query('products').whereNotLike('name', 'P%')
   * ```
   */
  where<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: 'notLike',
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name contains 'phone' (case insensitive)
   * query('products').where('name', 'iLike', '%phone%')
   *
   * // Alternative:
   * query('products').whereILike('name', '%phone%')
   * ```
   */
  where<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: 'iLike',
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name does not contain 'phone' (case insensitive)
   * query('products').where('name', 'notILike', '%phone%')
   *
   * // Alternative:
   * query('products').whereNotILike('name', '%phone%')
   * ```
   */
  where<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    operator: 'notILike',
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific `field` in the database query.
   */
  where<T extends SelectableFieldName[CollectionName]>(
    field: T,
    operatorOrValue: string,
    value?: any,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    const op = isUndefined(value)
      ? Op.eq
      : ((this.dialect === 'postgres' ? opMap : opMapSqlite) as any)[operatorOrValue]

    if (op) {
      this.addFilter({ [field]: { [op!]: isDefined(value) ? value : operatorOrValue } })
    }

    return this
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: status = 'active'
   * query('products').whereEq('status', 'active')
   *
   * // Alternatives:
   * query('products').where('status', 'active')
   * query('products').where('status', '=', 'active')
   * ```
   */
  whereEq<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    value: WithNull<SerializedFieldType[CollectionName][T]>,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: discount != null
   * query('products').whereNe('discount', null)
   *
   * // Alternative:
   * query('products').where('discount', '!=', null)
   * ```
   */
  whereNe<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    value: WithNull<SerializedFieldType[CollectionName][T]>,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, '!=', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price > 100
   * query('products').whereGt('price', 100)
   *
   * // Alternative:
   * query('products').where('price', '>', 100)
   * ```
   */
  whereGt<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, '>', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price >= 100
   * query('products').whereGte('price', 100)
   *
   * // Alternative:
   * query('products').where('price', '>=', 100)
   * ```
   */
  whereGte<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, '>=', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price < 100
   * query('products').whereLt('price', 100)
   *
   * // Alternative:
   * query('products').where('price', '<', 100)
   * ```
   */
  whereLt<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, '<', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price <= 100
   * query('products').whereLte('price', 100)
   *
   * // Alternative:
   * query('products').where('price', '<=', 100)
   * ```
   */
  whereLte<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: SerializedFieldType[CollectionName][T],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, '<=', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price >= 20 and price <= 50
   * query('products').whereBetween('price', [20, 50])
   *
   * // Alternative:
   * query('products').where('price', 'between', [20, 50])
   * ```
   */
  whereBetween<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    values: [SerializedFieldType[CollectionName][T], SerializedFieldType[CollectionName][T]],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'between', values)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: price < 20 or price > 50
   * query('products').whereNotBetween('price', [20, 50])
   *
   * // Alternative:
   * query('products').where('price', 'notBetween', [20, 50])
   * ```
   */
  whereNotBetween<T extends StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
    values: [SerializedFieldType[CollectionName][T], SerializedFieldType[CollectionName][T]],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'notBetween', values)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: id = 1 or id = 3 or id = 5
   * query('products').whereIn('id', [1, 3, 5])
   *
   * // Alternative:
   * query('products').where('id', 'in', [1, 3, 5])
   * ```
   */
  whereIn<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    values: SerializedFieldType[CollectionName][T][],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'in', values)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: id != 1 and id != 3 and id != 5
   * query('products').whereNotIn('id', [1, 3, 5])
   *
   * // Alternative:
   * query('products').where('id', 'notIn', [1, 3, 5])
   * ```
   */
  whereNotIn<T extends keyof SerializedFieldType[CollectionName]>(
    field: T,
    values: SerializedFieldType[CollectionName][T][],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'notIn', values)
  }

  /**
   * Specify a filtering condition for a specific `records` field in the database query.
   *
   * @example
   * ```typescript
   * // Select products with `tags` that contain the record with ID 1
   * query('products').whereRecordsIn('tags', 1)
   * ```
   */
  whereRecordsIn<T extends FieldNameByType[CollectionName]['records']>(
    field: T,
    id: number,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific `records` field in the database query.
   *
   * @example
   * ```typescript
   * // Select products with `tags` containing records of IDs 1, 2, or 3
   * query('products').whereRecordsIn('tags', [1, 2, 3])
   * query('products').whereRecordsIn('tags', [1, 2, 3], 'some')
   *
   * // Select products with `tags` containing all records of IDs 1, 2, and 3
   * query('products').whereRecordsIn('tags', [1, 2, 3], 'every')
   * ```
   */
  whereRecordsIn<T extends FieldNameByType[CollectionName]['records']>(
    field: T,
    id: number[],
    logic?: 'every' | 'some',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  whereRecordsIn<T extends FieldNameByType[CollectionName]['records']>(
    field: T,
    ids: number | number[],
    logic: 'every' | 'some' = 'some',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    const subQueries: any[] = []

    for (const id of toArray(ids)) {
      subQueries.push((subQuery: any) => subQuery.where(field, 'like', `%"${id}"%`))
    }

    return subQueries.length ? this[logic](subQueries[0], ...subQueries.slice(1)) : this
  }

  /**
   * Specify a filtering condition for a specific `records` field in the database query.
   *
   * @example
   * ```typescript
   * // Select products with `tags` that do not contain the record with ID 4
   * query('products').whereRecordsNotIn('tags', 4)
   * ```
   */
  whereRecordsNotIn<T extends FieldNameByType[CollectionName]['records']>(
    field: T,
    id: number,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  /**
   * Specify a filtering condition for a specific `records` field in the database query.
   *
   * @example
   * ```typescript
   * // Select products with tags not containing any of the records with IDs 4, 5, or 6
   * query('products').whereRecordsNotIn('tags', [4, 5, 6])
   * query('products').whereRecordsNotIn('tags', [4, 5, 6], 'some')
   *
   * // Select products with `tags` not containing records of IDs 4, 5, and 6
   * query('products').whereRecordsNotIn('tags', [4, 5, 6], 'every')
   * ```
   */
  whereRecordsNotIn<T extends FieldNameByType[CollectionName]['records']>(
    field: T,
    id: number[],
    logic?: 'every' | 'some',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method>

  whereRecordsNotIn<T extends FieldNameByType[CollectionName]['records']>(
    field: T,
    ids: number | number[],
    logic: 'every' | 'some' = 'some',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    const subQueries: any[] = []

    for (const id of toArray(ids)) {
      subQueries.push((subQuery: any) => subQuery.where(field, 'notLike', `%"${id}"%`))
    }

    return subQueries.length ? this[logic](subQueries[0], ...subQueries.slice(1)) : this
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name starts with 'P' (case sensitive in PostgreSQL)
   * query('products').whereLike('name', 'P%')
   *
   * // Alternative:
   * query('products').where('name', 'like', 'P%')
   * ```
   */
  whereLike<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'like', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name does not start with 'P' (case sensitive in PostgreSQL)
   * query('products').whereNotLike('name', 'P%')
   *
   * // Alternative:
   * query('products').where('name', 'notLike', 'P%')
   * ```
   */
  whereNotLike<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'notLike', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name contains 'phone' (case insensitive)
   * query('products').whereILike('name', '%phone%')
   *
   * // Alternative:
   * query('products').where('name', 'iLike', '%phone%')
   * ```
   */
  whereILike<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'iLike', value)
  }

  /**
   * Specify a filtering condition for a specific field in the database query.
   *
   * @example
   * ```typescript
   * // Apply a filtering condition: name does not contain 'phone' (case insensitive)
   * query('products').whereNotILike('name', '%phone%')
   *
   * // Alternative:
   * query('products').where('name', 'notILike', '%phone%')
   * ```
   */
  whereNotILike<T extends StringField<SerializedFieldType[CollectionName]>>(
    field: T,
    value: string,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.where(field, 'notILike', value)
  }

  /**
   * Apply a logical OR to a set of filtering conditions on the query.
   * At least one of the conditions must be satisfied for a record to be included in the result.
   *
   * @example
   * ```typescript
   * // Apply logical OR: (price < 100) OR (discount >= 0.5)
   * query('products').some(
   *   (products) => products.where('price', '<', 100),
   *   (products) => products.where('discount', '>=', 0.5),
   * )
   * ```
   */
  some(
    ...filters: [
      (
        filter: Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, FilterMethod>, FilterMethod>,
      ) => any,
      ...((
        filter: Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, FilterMethod>, FilterMethod>,
      ) => any)[],
    ]
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    const original = this.whereOptions
    const or = { [Op.or]: [] }

    for (const filter of filters) {
      this.whereOptions = { [Op.and]: [] }
      filter(this as any)
      this.addFilter(this.whereOptions, or)
    }

    this.addFilter(or, original)
    this.whereOptions = original

    return this
  }

  /**
   * Apply a logical AND to a set of filtering conditions on the query.
   * All the conditions must be satisfied for a record to be included in the result.
   *
   * Note: This method is redundant since all chained filter operations are implicitly combined using logical AND.
   *
   * @example
   * ```typescript
   * // Apply logical AND: (price > 100) AND (discount >= 0.1)
   * query('products').every(
   *   (products) => products.where('price', '>', 100),
   *   (products) => products.where('status', '>=', 0.1),
   * )
   * ```
   */
  every(
    ...filters: [
      (
        filter: Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, FilterMethod>, FilterMethod>,
      ) => any,
      ...((
        filter: Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, FilterMethod>, FilterMethod>,
      ) => any)[],
    ]
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    filters.forEach((filter) => filter(this as any))
    return this
  }

  /**
   * Perform a search in the queried collection based on the specified `keywords` and search `structure`.
   *
   * Note: The `keywords` are case insensitive.
   *
   * @example
   * ```typescript
   * // Find 'products' by a specific keyword.
   * // The `search` structures are defined in the collection definition.
   * await query('products').search('NVMe SSD').first()
   * // Output: { field1: '...', field2: '...', ... }
   * ```
   */
  search(
    keywords: string,
    structure: CollectionSearchStructure[CollectionName] = 'default',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    const search = collections[this.collection].search

    if (search && search[structure as any]) {
      const extracted = extractKeywords(keywords)

      if (extracted.length) {
        ;(this as any).searchOptions[structure] = extracted
      }
    }

    return this
  }

  /**
   * Set the sorting order for query results based on search relevance within a specific search `structure`.
   * By default, the sorting is in ascending order (`asc`), showing the most relevant results first.
   *
   * You can chain multiple `order` calls to apply multiple sorting criteria.
   * The sorting will be applied in the order they are called.
   *
   * @example
   * ```typescript
   * // Search products in the 'products' collection, sorted by relevance and price (ascending)
   * await query('products').search('NVMe SSD').orderBySearchRelevance().order('price').all()
   *
   * // Alternative:
   * await query('products').search('NVMe SSD').order(':default').order('price').all()
   * ```
   */
  orderBySearchRelevance(
    structure: CollectionSearchStructure[CollectionName] = 'default',
    direction: 'asc' | 'desc' = 'asc',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    return this.order(`:${structure}` as any, direction)
  }

  /**
   * Set a sorting order for the query results based on a specific collection field.
   * By default, the sorting is done in ascending order (`asc`).
   *
   * You can chain multiple `order` calls to apply multiple sorting criteria.
   * The sorting will be applied in the order they are called.
   *
   * If the `field` argument starts with a colon (`:`), it is considered a search structure key.
   * For example, `order(':default')` is equivalent to calling the `orderBySearchRelevance()` method.
   *
   * @example
   * ```typescript
   * // Fetch all products from the 'products' collection, sorted by their price in ascending order
   * await query('products').order('price').all()
   *
   * // Fetch the most expensive products first, sorted by their price in descending order
   * await query('products').order('price', 'desc').all()
   * ```
   */
  order(
    field: Sortable[CollectionName],
    direction: 'asc' | 'desc' = 'asc',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.orderOptions.push([field, direction === 'asc' ? 'ASC NULLS LAST' : 'DESC NULLS LAST'])
    return this
  }

  /**
   * Group the query results based on a specific collection field.
   *
   * You can chain multiple `group` calls to apply multiple grouping criteria.
   * The grouping will be applied in the order they are called.
   *
   * @example
   * ```typescript
   * // Fetch all products from the 'products' collection, grouped by their category
   * await query('products').select({ category: true }).group('category').all()
   * ```
   */
  group(
    field: SelectableFieldName[CollectionName],
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.groupOptions.push(field)
    return this
  }

  /**
   * Set the offset (starting position) for the query results.
   *
   * @example
   * ```typescript
   * // Fetch the second page of products with 10 products per page from the 'products' collection
   * const records = await query('products').limit(10).offset(10).all()
   *
   * // Alternative:
   * const { records } = await query('products').paginate(2, 10)
   * ```
   */
  offset(offset: number): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.offsetOption = offset
    return this
  }

  /**
   * Set the maximum number of records to be returned by the query.
   *
   * @example
   * ```typescript
   * // Fetch the first 10 products from the 'products' collection
   * const records = await query('products').limit(10).all()
   *
   * // Alternative:
   * const { records } = await query('products').paginate(1, 10)
   * ```
   */
  limit(limit: number): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.limitOption = limit
    return this
  }

  /**
   * Enable field population to retrieve populated field values in the query results.
   *
   * By default, the query builder returns the casted field values without populating related data.
   *
   * @example
   * ```typescript
   * // Without population:
   * await query('products').select({ category: true }).first()
   * // Output: { category: 1 }
   *
   * // With population:
   * await query('products').select({ category: true }).populate().first()
   * // Output: { category: { id: 1, name: 'Electronics' } }
   * ```
   */
  populate(): Pick<
    QueryBuilder<
      CollectionName,
      ReturnableFieldName,
      PopulatedFieldType[CollectionName] & { [key in keyof CastedFieldType[CollectionName]]: unknown },
      Method
    >,
    Method
  > {
    this.populateOption = true
    return this as any
  }

  /**
   * Disable field population to retrieve casted values in the query results.
   *
   * By default, the query builder returns the casted field values without populating related data.
   *
   * @example
   * ```typescript
   * // Without population:
   * await populatedProductsQuery.select({ category: true }).unpopulate().first()
   * // Output: { category: 1 }
   *
   * // With population:
   * await populatedProductsQuery.select({ category: true }).first()
   * // Output: { category: { id: 1, name: 'Electronics' } }
   * ```
   */
  unpopulate(): Pick<
    QueryBuilder<CollectionName, ReturnableFieldName, CastedFieldType[CollectionName], Method>,
    Method
  > {
    this.populateOption = false
    return this as any
  }

  /**
   * Check whether the query results will be returned with casted or populated field values.
   *
   * @example
   * ```typescript
   * query('products').getFieldValueType() // 'casted'
   * query('products').populate().getFieldValueType() // 'populated'
   * ```
   */
  getFieldValueType(): 'casted' | 'populated' {
    return this.populateOption ? 'populated' : 'casted'
  }

  /**
   * Specify whether the query results will be returned with casted or populated field values.
   *
   * By default, the query builder returns the casted field values without populating related data.
   *
   * @example
   * ```typescript
   * // Without population:
   * await query('products').select({ category: true }).first()
   * // Output: { category: 1 }
   *
   * // With population:
   * await query('products').select({ category: true }).setFieldValueType('populated').first()
   * // Output: { category: { id: 1, name: 'Electronics' } }
   * ```
   */
  setFieldValueType(
    type: 'casted',
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, CastedFieldType[CollectionName], Method>, Method>

  setFieldValueType(
    type: 'populated',
  ): Pick<
    QueryBuilder<
      CollectionName,
      ReturnableFieldName,
      PopulatedFieldType[CollectionName] & { [key in keyof CastedFieldType[CollectionName]]: unknown },
      Method
    >,
    Method
  >

  setFieldValueType(type: 'casted' | 'populated'): Pick<
    QueryBuilder<
      CollectionName,
      ReturnableFieldName,
      (CastedFieldType[CollectionName] | PopulatedFieldType[CollectionName]) & {
        [key in keyof CastedFieldType[CollectionName]]: unknown
      },
      Method
    >,
    Method
  >

  setFieldValueType(type: 'casted' | 'populated'): QueryBuilder<any> {
    this.populateOption = type === 'populated'
    return this as any
  }

  /**
   * Revalidate fields after fetching from the database and set their values to default if validation fails.
   * This prevents returning invalid existing data in case field or collection definitions are updated.
   *
   * By default, fallback validation is enabled.
   */
  fallback(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.fallbackOption = true
    return this
  }

  /**
   * Disable field validation after fetching, potentially speeding up database queries.
   * Beware that this may result in invalid data if field or collection definitions change.
   *
   * By default, fallback validation is enabled.
   */
  noFallback(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.fallbackOption = false
    return this
  }

  /**
   * Set the language for the validation messages returned by the query builder.
   *
   * By default, the language is set to the language code defined in the module option `language.primary`.
   */
  contextLanguage(
    language: SupportedLanguage,
  ): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.contextLanguageOption = language
    return this
  }

  /**
   * Get a copy of the current query builder options.
   */
  getOptions() {
    return deepClone({
      table: this.table,
      selectedFields: this.selectedFields,
      whereOptions: this.whereOptions,
      searchOptions: this.searchOptions,
      orderOptions: this.orderOptions,
      groupOptions: this.groupOptions,
      offsetOption: this.offsetOption,
      limitOption: this.limitOption,
      populateOption: this.populateOption,
      fallbackOption: this.fallbackOption,
      contextLanguageOption: this.contextLanguageOption,
    })
  }

  /**
   * Create a new query builder with the same state as this one.
   */
  clone(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    const query: any = new QueryBuilder(this.collection)

    for (const [key, value] of Object.entries(this.getOptions())) {
      query[key] = value
    }

    return query
  }

  /**
   * Reset the current `WHERE` clause options of the query.
   */
  clearWhere(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.whereOptions = { [Op.and]: [] }
    return this
  }

  /**
   * Reset the current search options of the query.
   */
  clearSearch(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.searchOptions = {}
    return this
  }

  /**
   * Reset the current `ORDER BY` clause options of the query.
   */
  clearOrder(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.orderOptions = []
    return this
  }

  /**
   * Reset the current `GROUP BY` clause options of the query.
   */
  clearGroup(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.groupOptions = []
    return this
  }

  /**
   * Reset the current `OFFSET` clause option of the query.
   */
  clearOffset(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.offsetOption = undefined
    return this
  }

  /**
   * Reset the current `LIMIT` clause option of the query.
   */
  clearLimit(): Pick<QueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType, Method>, Method> {
    this.limitOption = undefined
    return this
  }

  /**
   * Reset all query builder options to their default values.
   */
  reset(): Pick<
    QueryBuilder<
      CollectionName,
      SelectableFieldName[CollectionName],
      CastedFieldType[CollectionName],
      MultiQueryBuilderMethod<CollectionName>
    >,
    MultiQueryBuilderMethod<CollectionName>
  > {
    return (this as any)
      .selectAll()
      .clearWhere()
      .clearSearch()
      .clearOrder()
      .clearGroup()
      .clearOffset()
      .clearLimit()
      .unpopulate()
      .fallback()
      .contextLanguage(primaryLanguage)
  }

  /**
   * Retrieve the number of records in the queried collection.
   *
   * @example
   * ```typescript
   * // Get the number of records in the 'products' collection
   * await query('products').count()
   * // Output: 1337
   * ```
   */
  async count(): Promise<number> {
    const result = (await (await db())
      .model(this.table)
      .count(await this.applySequelizeOptions(['group', 'where']))) as any

    return this.groupOptions.length ? result.length : result[0]?.count ?? 0
  }

  /**
   * Check whether there is at least one record that matches the current query.
   *
   * @example
   * ```typescript
   * // Check if there are products with prices greater than 100
   * await query('products').whereGt('price', 100).exists()
   * // Output: true
   * ```
   */
  async exists(): Promise<boolean> {
    return (await this.count()) > 0
  }

  /**
   * Check whether there are no records that match the current query.
   *
   * @example
   * ```typescript
   * // Check if there are no products with zero prices
   * await query('products').where('price', 0).notExists()
   * // Output: true
   * ```
   */
  async notExists(): Promise<boolean> {
    return (await this.count()) === 0
  }

  /**
   * Fetch all records from the queried collection.
   *
   * @example
   * ```typescript
   * // Fetch all records from the 'products' collection
   * await query('products').all()
   * // Output: [{ field1: '...', field2: '...', ... }, { field1: '...', field2: '...', ... }, ...]
   * ```
   */
  async all(): Promise<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>[]> {
    const start = performance.now()
    const key = this.generateCacheKey('all')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const records = await (await db()).model(this.table).findAll({ ...(await this.applySequelizeOptions()), raw: true })

    for (const record of records) {
      this.castRecord(record)
    }

    for (const record of records) {
      await this.validateAndFallbackRecordsAfterFetch(record, records)
    }

    if (this.populateOption) {
      for (const record of records) {
        await this.populateRecord(record)
      }
    }

    if (!this.hasNonCachedFieldInSelectOrderOrGroup() && !this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, records, start)
    }

    return records as any
  }

  /**
   * Retrieve all records from the queried collection along with the total count of records.
   *
   * @example
   * ```typescript
   * // Fetch the first 2 records from the 'products' collection with count
   * await query('products').limit(2).allWithCount()
   * // Output: { count: 1337, records: [{ field1: '...', field2: '...', ... }, { field1: '...', field2: '...', ... }] }
   * ```
   */
  async allWithCount(): Promise<{
    /**
     * Total number of queried records.
     */
    count: number

    /**
     * List of fetched records.
     */
    records: Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>[]
  }> {
    const start = performance.now()
    const key = this.generateCacheKey('allWithCount')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const count = await this.count()
    const records = await (await db()).model(this.table).findAll({ ...(await this.applySequelizeOptions()), raw: true })

    for (const record of records) {
      this.castRecord(record)
    }

    for (const record of records) {
      await this.validateAndFallbackRecordsAfterFetch(record, records)
    }

    if (this.populateOption) {
      for (const record of records) {
        await this.populateRecord(record)
      }
    }

    const result = { count, records }

    if (!this.hasNonCachedFieldInSelectOrderOrGroup() && !this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, result, start)
    }

    return result as any
  }

  /**
   * Retrieve a specific page of records along with pagination-related information.
   *
   * @example
   * ```typescript
   * // Fetch the first page with 10 records per page from the 'products' collection
   * await query('products').paginate(1, 10)
   * // Output: { currentPage: 1, lastPage: 134, perPage: 10, records: [...], total: 1337 }
   * ```
   */
  async paginate(
    page: number,
    perPage: number,
  ): Promise<PaginateResult<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>>> {
    const start = performance.now()
    const key = this.generateCacheKey('paginate')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const offset = (page - 1) * perPage
    const { count, records } = await (this as any).limit(perPage).offset(offset).allWithCount()
    const lastPage = perPage ? Math.max(1, Math.ceil(count / perPage)) : 1

    const result = { currentPage: page, lastPage, perPage, records, total: count }

    if (!this.hasNonCachedFieldInSelectOrderOrGroup() && !this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, result, start)
    }

    return result
  }

  /**
   * Fetch the first record from the queried collection.
   *
   * @example
   * ```typescript
   * // Fetch the first record from the 'products' collection
   * await query('products').first()
   * // Output: { field1: '...', field2: '...', ... }
   * ```
   */
  async first(): Promise<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType> | null> {
    const start = performance.now()
    const key = this.generateCacheKey('first')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const record = await (await db()).model(this.table).findOne({ ...(await this.applySequelizeOptions()), raw: true })

    if (record) {
      this.castRecord(record)
      await this.validateAndFallbackRecordsAfterFetch(record)

      if (this.populateOption) {
        await this.populateRecord(record)
      }
    }

    if (!this.hasNonCachedFieldInSelectOrderOrGroup() && !this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, record, start)
    }

    return record as any
  }

  /**
   * Retrieve the minimum value of a specific field in the queried collection.
   *
   * @example
   * ```typescript
   * // Find the minimum price among products
   * await query('products').min('price')
   * // Output: 0.36
   * ```
   */
  async min<T extends SelectableFieldName[CollectionName] & StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
  ): Promise<SerializedFieldType[CollectionName][T] | null> {
    const start = performance.now()
    const key = this.generateCacheKey('min')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const min = await (await db()).model(this.table).min(field, await this.applySequelizeOptions(['where']))

    if (!this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, min, start)
    }

    return min as any
  }

  /**
   * Retrieve the maximum value of a specific field in the queried collection.
   *
   * @example
   * ```typescript
   * // Find the maximum price among products
   * await query('products').max('price')
   * // Output: 9001
   * ```
   */
  async max<T extends SelectableFieldName[CollectionName] & StringOrNumberField<SerializedFieldType[CollectionName]>>(
    field: T,
  ): Promise<SerializedFieldType[CollectionName][T] | null> {
    const start = performance.now()
    const key = this.generateCacheKey('max')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const max = await (await db()).model(this.table).max(field, await this.applySequelizeOptions(['where']))

    if (!this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, max, start)
    }

    return max as any
  }

  /**
   * Retrieve the sum of a specific numeric field in the queried collection.
   *
   * @example
   * ```typescript
   * // Calculate the total quantity of all products
   * await query('products').sum('quantity')
   * // Output: 5417
   * ```
   */
  async sum<T extends SelectableFieldName[CollectionName] & NumberField<SerializedFieldType[CollectionName]>>(
    field: T,
  ): Promise<number> {
    const start = performance.now()
    const key = this.generateCacheKey('sum')
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const sum = await (await db()).model(this.table).sum(field, await this.applySequelizeOptions(['where']))

    if (!this.hasNonCachedFieldInWhere()) {
      await this.storeInCache(key, sum, start)
    }

    return sum ?? 0
  }

  /**
   * Validate the `input` data of a record.
   *
   * @returns A Promise that resolves to an object containing validation errors for fields with failed validation.
   */
  async validate(
    input: Record<string, any>,
    operation: 'create' | 'read' | 'update',
    allInputs?: Record<string, any>[],
    skipFields?: string[],
  ): Promise<ValidationError<ReturnableFieldName>> {
    const errors: Record<string, string> = {}

    for (const fieldName of this.getOperableFields(input, operation)) {
      if (skipFields?.includes(fieldName)) {
        continue
      }

      const declaration = collections[this.collection].fields[fieldName]

      if (declaration) {
        const definition = fields[declaration.type]

        if (definition) {
          for (const validator of [...definition.validators, ...(declaration.additional?.validators ?? [])]) {
            try {
              if (
                isFunction(validator) ||
                (operation === 'create' && validator.onCreate) ||
                (operation === 'read' && validator.onRead) ||
                (operation === 'update' && validator.onUpdate)
              ) {
                await (isFunction(validator) ? validator : validator.validator)({
                  _: _ as any,
                  __: __ as any,
                  allInputs,
                  collection: collections[this.collection],
                  collections,
                  definition,
                  input,
                  language: this.contextLanguageOption,
                  name: fieldName,
                  operation,
                  options: resolveCollectionFieldOptions(
                    this.collection,
                    declaration.type,
                    fieldName,
                    declaration.options,
                    fields,
                  ),
                  value: (input as any)[fieldName],
                  currentQuery: this as any,
                  query: _query,
                  errors,
                  fields,
                })
              }
            } catch (e: any) {
              errors[fieldName] = e.message
              break
            }
          }
        }
      }
    }

    return errors as any
  }

  /**
   * Create a new record in the queried collection with the provided `input` data.
   *
   * @returns A Promise that resolves to a `CreateResult` object.
   *          If the creation is successful, the `record` property will contain the created record.
   *          If there are any field validation errors, they will be available in the `errors` property.
   *          The `message` property may contain an optional error message if there are issues during the database query.
   *
   * @example
   * ```typescript
   * const result = await query('products').create({
   *   name: 'Magical Wand',
   *   price: 19.99,
   *   category: 2,
   *   description: 'A powerful wand for all your wizarding needs!',
   * })
   *
   * if (result.success) {
   *   console.log('Product created successfully:', result.record)
   * } else {
   *   console.error('Product creation failed:', result.errors)
   * }
   * ```
   */
  async create(
    input: CreateInput[CollectionName],
  ): Promise<CreateResult<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    input = input ?? {}

    if (!isObject(input)) {
      return { success: false, errors: {}, message: __(this.contextLanguageOption, 'pruvious-server', 'Invalid input') }
    }

    if (collections[this.collection].translatable && isString(input.translations)) {
      await this.fillNonTranslatableFields(input, input.translations)
    }

    const prepared = this.prepareInput(input, 'create')
    const sanitized = await this.sanitize(prepared, 'create')
    const conditionalLogicResults = this.applyConditionalLogic(sanitized)

    if (Object.keys(conditionalLogicResults.errors).length) {
      return { success: false, errors: conditionalLogicResults.errors }
    }

    const validationErrors = await this.validate(sanitized, 'create', undefined, conditionalLogicResults.failed)

    if (Object.keys(validationErrors).length) {
      return { success: false, errors: validationErrors }
    }

    const now = Date.now()

    if (collections[this.collection].createdAtField) {
      sanitized[collections[this.collection].createdAtField as string] = now
    }

    if (collections[this.collection].updatedAtField) {
      sanitized[collections[this.collection].updatedAtField as string] = now
    }

    try {
      const record = (await (await db()).model(this.table).create(this.serializeInput(sanitized))).dataValues as any
      this.castRecord(record)
      const recordId = record.id

      for (const fieldName of Object.keys(record).filter((key) => !this.selectedFields.includes(key))) {
        delete record[fieldName]
      }

      await this.validateAndFallbackRecordsAfterCreate(record)

      if (this.populateOption) {
        await this.populateRecord(record)
      }

      if (collections[this.collection].search) {
        await cache()
        setTimeout(() => this.buildSearchKeywords(recordId).then(() => this.clearCache('onCreate')))
      }

      await this.clearCache('onCreate')

      return { success: true, record }
    } catch (e: any) {
      return { success: false, errors: {}, message: e.message }
    }
  }

  /**
   * Create multiple records in the collection based on the provided `input` array.
   * Each `input` element corresponds to a record to be created.
   *
   * @returns A Promise that resolves to a `CreateManyResult` object.
   *          If successful, the created records will be available in the `records` property.
   *          If any input has validation errors, the `errors` property will contain an array of error objects at the corresponding index.
   *          If there are no errors for a particular input, the value at that index will be `null`.
   *          The `message` property may contain an optional error message for any database query issues.
   *
   * Note: If any input fails validation, no records will be created.
   *
   * @example
   * ```typescript
   * const result = await query('products').createMany([
   *   { name: 'Product 1', price: 10 },
   *   { name: 'Product 2', price: 20 },
   *   { name: 'Product 3', price: 'Invalid Price' }, // <- Error
   * ])
   *
   * if (result.success) {
   *   console.log('Records created:', result.records)
   * } else {
   *   console.log('Errors:', result.errors) // [null, null, { price: 'Invalid input type' }]
   * }
   * ```
   */
  async createMany(
    input: CreateInput[CollectionName][],
  ): Promise<CreateManyResult<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    input = input ?? []

    if (!isArray(input) || !input.every(isObject)) {
      return { success: false, errors: [], message: __(this.contextLanguageOption, 'pruvious-server', 'Invalid input') }
    }

    const sanitized: Record<string, any>[] = []
    const errors: (ValidationError<ReturnableFieldName> | null)[] = []

    for (const entry of input) {
      if (collections[this.collection].translatable && isString(entry.translations)) {
        await this.fillNonTranslatableFields(entry, entry.translations)
      }

      const preparedEntry = this.prepareInput(entry, 'create')
      const sanitizedEntry = await this.sanitize(preparedEntry, 'create')
      sanitized.push(sanitizedEntry)
    }

    for (const sanitizedEntry of sanitized) {
      const conditionalLogicResults = this.applyConditionalLogic(sanitizedEntry)

      if (Object.keys(conditionalLogicResults.errors).length) {
        errors.push(conditionalLogicResults.errors as any)
      } else {
        const validationErrors = await this.validate(
          sanitizedEntry,
          'create',
          sanitized,
          conditionalLogicResults.failed,
        )
        errors.push(Object.keys(validationErrors).length ? validationErrors : null)
      }
    }

    if (errors.some(Boolean)) {
      return { success: false, errors }
    }

    const now = Date.now()

    if (collections[this.collection].createdAtField) {
      for (const sanitizedEntry of sanitized) {
        sanitizedEntry[collections[this.collection].createdAtField as string] = now
      }
    }

    if (collections[this.collection].updatedAtField) {
      for (const sanitizedEntry of sanitized) {
        sanitizedEntry[collections[this.collection].updatedAtField as string] = now
      }
    }

    try {
      const results: any[] = await (await db())
        .model(this.table)
        .bulkCreate(sanitized.map((input) => this.serializeInput(input)))
      const records = results.map(({ dataValues }) => dataValues)
      const buildSearchKeywords: Promise<void>[] = []

      for (const record of records) {
        this.castRecord(record)
        const recordId = record.id

        for (const fieldName of Object.keys(record).filter((key) => !this.selectedFields.includes(key))) {
          delete record[fieldName]
        }

        await this.validateAndFallbackRecordsAfterCreate(record, records)

        if (this.populateOption) {
          await this.populateRecord(record)
        }

        if (collections[this.collection].search) {
          buildSearchKeywords.push(new Promise((resolve) => this.buildSearchKeywords(recordId).then(resolve)))
        }
      }

      if (buildSearchKeywords.length) {
        await cache()
        setTimeout(() => Promise.all(buildSearchKeywords).then(() => this.clearCache('onCreate')))
      }

      if (records.length) {
        await this.clearCache('onCreate')
      }

      return { success: true, records }
    } catch (e: any) {
      return { success: false, errors: Array(input.length).fill(null), message: e.message }
    }
  }

  /**
   * Update existing records in the queried collection based on the specified conditions.
   *
   * @returns A Promise that resolves to an `UpdateResult` object.
   *          If successful, the updated records will be available in the `records` property.
   *          If there are any field validation errors, they will be available in the `errors` property.
   *          The `message` property may contain an optional error message if there are issues during the database query.
   *
   * @example
   * ```typescript
   * const result = await query('products').where('id', 47).update({
   *   name: 'Updated Product',
   *   price: 15,
   *   category: 3,
   *   description: 'This product has been updated!',
   * })
   *
   * if (result.success) {
   *   console.log('Records updated:', result.records)
   * } else {
   *   console.error('Update failed:', result.errors)
   * }
   * ```
   */
  async update(
    input: UpdateInput[CollectionName],
  ): Promise<UpdateResult<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    input = input ?? {}

    if (!isObject(input)) {
      return { success: false, errors: {}, message: __(this.contextLanguageOption, 'pruvious-server', 'Invalid input') }
    }

    const prepared = this.prepareInput(input, 'update')
    const sanitized = await this.sanitize(prepared, 'update')
    const conditionalLogicResults = this.applyConditionalLogic(sanitized)

    if (Object.keys(conditionalLogicResults.errors).length) {
      return { success: false, errors: conditionalLogicResults.errors }
    }

    const validationErrors = await this.validate(sanitized, 'update', undefined, conditionalLogicResults.failed)

    if (Object.keys(validationErrors).length) {
      return { success: false, errors: validationErrors }
    }

    if (collections[this.collection].updatedAtField) {
      sanitized[collections[this.collection].updatedAtField as string] = Date.now()
    }

    try {
      return {
        success: true,
        records: await this.updateOrDelete('update', async (buildSearchKeywordsRecordIds: number[]) => {
          await (await db())
            .model(this.table)
            .update(this.serializeInput(sanitized), (await this.applySequelizeOptions(['where'])) as any)

          if (collections[this.collection].translatable) {
            buildSearchKeywordsRecordIds.push(...(await this.syncNonTranslatableFields(sanitized)))
          }
        }),
      }
    } catch (e: any) {
      return { success: false, errors: {}, message: e.message }
    }
  }

  /**
   * Delete records from the queried collection based on the specified conditions.
   *
   * @returns A Promise that resolves to an array containing the deleted records.
   *
   * @example
   * ```typescript
   * await query('products').select({ id: true }).where('category', 5).delete()
   * // Output: [{ id: 30 }, { id: 144 }, { id: 145 }]
   * ```
   */
  async delete(): Promise<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>[]> {
    return this.updateOrDelete(
      'delete',
      async () => await (await db()).model(this.table).destroy(await this.applySequelizeOptions(['where'])),
    )
  }

  protected async applySequelizeOptions(
    pick: ('attributes' | 'group' | 'limit' | 'offset' | 'order' | 'where')[] = [
      'attributes',
      'group',
      'limit',
      'offset',
      'order',
      'where',
    ],
  ): Promise<
    Partial<{
      attributes: string[]
      group: string[]
      limit: number | undefined
      offset: number | undefined
      order: [string, string][]
      where: SequelizeWhereOptions<any>
    }>
  > {
    const options: Record<string, any> = {}

    for (const option of pick) {
      if (option === 'attributes') {
        options.attributes = this.selectedFields.map(snakeCase)
      } else if (option === 'limit') {
        options.limit = this.limitOption
      } else if (option === 'offset') {
        options.offset = this.offsetOption
      } else if (option === 'group') {
        options.group = this.groupOptions
          .filter((fieldName) => collections[this.collection].fields[fieldName])
          .map(snakeCase)
      } else if (option === 'order') {
        options.order = []

        for (const [fieldName, direction] of this.orderOptions) {
          if (fieldName[0] === ':') {
            const search = collections[this.collection].search
            const structure = fieldName.slice(1)
            const keywords: string[] | undefined = (this.searchOptions as any)[structure]

            if (search && search[structure] && keywords) {
              const snakeStructure = snakeCase(structure)
              options.attributes ||= []

              for (const [i, keyword] of keywords.entries()) {
                const _keyword = (await db()).escape(keyword)
                const alias = Sequelize.literal(
                  this.dialect === 'postgres'
                    ? `POSITION(${_keyword} in "_search_${snakeStructure}") AS "__match_${snakeStructure}_${i}"`
                    : `INSTR("_search_${snakeStructure}", ${_keyword}) AS "__match_${snakeStructure}_${i}"`,
                )

                if (!options.attributes.includes(alias)) {
                  options.attributes.push(alias)
                }

                options.order.push(Sequelize.literal(`__match_${snakeStructure}_${i} ${direction}`))
              }
            }
          } else if (collections[this.collection].fields[fieldName]) {
            options.order.push([snakeCase(fieldName), direction])
          }
        }
      } else if (option === 'where') {
        options.where = snakeCasePropNames(deepClone(this.whereOptions))

        for (const [structure, keywords] of Object.entries(this.searchOptions)) {
          const snakeStructure = snakeCase(structure)
          const op = Object.getOwnPropertySymbols(options.where)[0]

          for (const keyword of keywords!) {
            const _keyword = (await db()).escape(keyword)

            options.where[op].push(
              Sequelize.literal(
                this.dialect === 'postgres'
                  ? `POSITION(${_keyword} in "_search_${snakeStructure}") > 0`
                  : `INSTR("_search_${snakeStructure}", ${_keyword}) > 0`,
              ),
            )
          }
        }
      }
    }

    return options
  }

  protected addFilter(filter: Record<any, any>, to?: Record<any, any>) {
    const target = to || this.whereOptions
    const op = Object.getOwnPropertySymbols(target)[0] as any
    target[op].push(filter)
  }

  protected serializeInput(input: Record<string, any>): Record<string, any> {
    const serialized: Record<string, any> = {}

    for (const [fieldName, value] of Object.entries(input)) {
      const declaration = collections[this.collection].fields[fieldName]
      const definition = declaration ? fields[declaration.type] : null

      if (definition?.serialize) {
        serialized[snakeCase(fieldName)] = definition.serialize(value)
      } else {
        serialized[snakeCase(fieldName)] = value && typeof value === 'object' ? JSON.stringify(value) : value
      }
    }

    return serialized
  }

  protected async buildSearchKeywords(id: number): Promise<void> {
    const collectionSearch = collections[this.collection].search

    if (collectionSearch) {
      const castedRecord = await (this as any).clone().reset().where('id', id).first()

      if (!castedRecord) {
        return
      }

      let populatedRecord = null
      const attributes: Record<string, string> = {}

      for (const [structure, search] of Object.entries(collectionSearch)) {
        const keywords: string[] = []

        for (const entry of search) {
          let extracted = ''

          if (isString(entry)) {
            extracted = (
              await fields[collections[this.collection].fields[entry].type].extractKeywords({
                collection: collections[this.collection],
                collections,
                definition: fields[collections[this.collection].fields[entry].type],
                fieldValueType: 'casted',
                fields,
                options: resolveCollectionFieldOptions(
                  this.collection,
                  collections[this.collection].fields[entry].type,
                  entry,
                  collections[this.collection].fields[entry].options,
                  fields,
                ),
                record: castedRecord,
                value: castedRecord[entry],
              })
            ).trim()
          } else {
            if (entry.fieldValueType === 'populated' && !populatedRecord) {
              populatedRecord = { ...castedRecord }
              await this.populateRecord(populatedRecord)
            }

            const record = entry.fieldValueType === 'populated' ? populatedRecord! : castedRecord
            const context: ExtractKeywordsContext = {
              collection: collections[this.collection],
              collections,
              definition: fields[collections[this.collection].fields[entry.field].type],
              fieldValueType: entry.fieldValueType ?? 'casted',
              fields,
              options: resolveCollectionFieldOptions(
                this.collection,
                collections[this.collection].fields[entry.field].type,
                entry.field,
                collections[this.collection].fields[entry.field].options,
                fields,
              ),
              record,
              value: record[entry.field],
            }

            if (entry.extractKeywords) {
              extracted = (await entry.extractKeywords(context)).trim()
            } else {
              extracted = (
                await fields[collections[this.collection].fields[entry.field].type].extractKeywords(context)
              ).trim()
            }

            if (entry.reserve) {
              extracted = extracted.padEnd(entry.reserve, ' ')
            }
          }

          keywords.push(extracted)
        }

        attributes[`_search_${snakeCase(structure)}`] = keywords.filter(Boolean).join(' ').toLowerCase()
      }

      await (await db()).model(this.table).update(attributes, { where: { id } })
    }
  }

  protected castRecord(record: Record<string, any>) {
    for (const [fieldName, value] of Object.entries(record)) {
      if (fieldName.includes('_')) {
        if (fieldName[0] !== '_') {
          record[camelCase(fieldName)] = value
        }

        delete record[fieldName]
      }
    }

    for (const fieldName of this.selectedFields) {
      const declaration = collections[this.collection].fields[fieldName]
      const definition = declaration ? fields[declaration.type] : null

      if (definition) {
        if (definition.deserialize) {
          try {
            record[fieldName] = definition.deserialize(record[fieldName])
          } catch {
            record[fieldName] = null
          }
        } else if (definition.type.js === 'boolean' && (record[fieldName] === 0 || record[fieldName] === 1)) {
          record[fieldName] = !!record[fieldName]
        } else if (definition.type.js === 'number' && isString(record[fieldName])) {
          record[fieldName] = +record[fieldName]
        } else if (definition.type.js === 'object' && isString(record[fieldName])) {
          try {
            record[fieldName] = JSON.parse(record[fieldName])
          } catch {
            record[fieldName] = null
          }
        }
      }
    }
  }

  protected async validateAndFallbackRecordsAfterCreate(
    record: Record<string, any>,
    allRecords?: Record<string, any>[],
  ) {
    if (this.fallbackOption) {
      for (const fieldName in record) {
        const declaration = collections[this.collection].fields[fieldName]
        const definition = fields[declaration.type]

        for (const validator of [...definition.validators, ...(declaration.additional?.validators ?? [])]) {
          if (!isFunction(validator) && !validator.onCreate && validator.onRead) {
            const options = resolveCollectionFieldOptions(
              this.collection,
              declaration.type,
              fieldName,
              declaration.options,
              fields,
            )

            try {
              await validator.validator({
                _: _ as any,
                __: __ as any,
                allInputs: allRecords,
                collection: collections[this.collection],
                collections,
                definition,
                input: record,
                language: this.contextLanguageOption,
                name: fieldName,
                operation: 'read',
                options,
                currentQuery: this as any,
                query: _query,
                value: record[fieldName],
                errors: {},
                fields,
              })
            } catch (e: any) {
              record[fieldName] = definition.default({ definition, name: fieldName, options })
              break
            }
          }
        }
      }
    }
  }

  protected async validateAndFallbackRecordsAfterFetch(
    record: Record<string, any>,
    allRecords?: Record<string, any>[],
  ) {
    if (this.fallbackOption) {
      const errors = await this.validate(record, 'read', allRecords)
      const filterArrays: Record<string, any[]> = {}

      for (const fieldPath of Object.keys(errors)) {
        const declaration: CollectionField = getProperty(
          collections[this.collection].fields,
          fieldPath.replace(/\.([0-9]+)\./g, '.options.subfields.'),
        )

        if (isObject(declaration) && declaration.type) {
          const definition = fields[declaration.type]

          if (definition && declaration.type !== 'block') {
            setProperty(
              record,
              fieldPath,
              definition.default({
                definition,
                name: fieldPath,
                options: resolveCollectionFieldOptions(
                  this.collection,
                  declaration.type,
                  fieldPath,
                  declaration.options,
                  fields,
                ),
              }),
            )
          } else if (/\.[0-9]+$/.test(fieldPath)) {
            const parentPath = fieldPath.split('.').slice(0, -1).join('.')
            const value = getProperty(record, parentPath)

            if (isArray(value)) {
              filterArrays[parentPath] = value
            }
          } else if (!/\.[a-z_$][a-z0-9_$]*\.fields\./i.test) {
            deleteProperty(record, fieldPath)
          }
        } else if (/\.[0-9]+$/.test(fieldPath)) {
          const parentPath = fieldPath.split('.').slice(0, -1).join('.')
          const value = getProperty(record, parentPath)

          if (isArray(value)) {
            filterArrays[parentPath] = value
          }
        } else if (!/\.[a-z_$][a-z0-9_$]*\.fields\./i.test) {
          deleteProperty(record, fieldPath)
        }
      }

      for (const [fieldPath, value] of sortNaturalByProp(Object.entries(filterArrays), '0').reverse()) {
        setProperty(
          record,
          fieldPath,
          value.filter((v) => !isNull(v)),
        )
      }
    }
  }

  protected async populateRecord(record: Record<string, any>) {
    for (const fieldName of this.selectedFields) {
      const declaration = collections[this.collection].fields[fieldName]
      const definition = declaration ? fields[declaration.type] : null
      const population = declaration.additional?.population ?? definition?.population

      if (definition && population) {
        record[fieldName] = await population.populator({
          value: record[fieldName],
          definition,
          name: fieldName,
          options: resolveCollectionFieldOptions(
            this.collection,
            declaration.type,
            fieldName,
            declaration.options,
            fields,
          ),
          currentQuery: this as any,
          query: _query,
          fields,
        })
      }
    }
  }

  protected async fillNonTranslatableFields(input: Record<string, any>, translations: string): Promise<void> {
    let relatedRecord: Record<string, any> | null = null

    for (const fieldName of Object.keys(collections[this.collection].fields)) {
      if (collections[this.collection].fields[fieldName]?.additional?.translatable === false) {
        if (!relatedRecord) {
          relatedRecord = await (await db()).model(this.table).findOne({ where: { translations }, raw: true })

          if (relatedRecord) {
            this.castRecord(relatedRecord)
            await this.validateAndFallbackRecordsAfterFetch(relatedRecord)
          } else {
            return
          }
        }

        input[fieldName] = relatedRecord[fieldName]
      }
    }
  }

  protected async syncNonTranslatableFields(sanitized: Record<string, any>): Promise<number[]> {
    const input: Record<string, any> = {}

    for (const [fieldName, fieldValue] of Object.entries(sanitized)) {
      if (collections[this.collection].fields[fieldName]?.additional?.translatable === false) {
        input[fieldName] = fieldValue
      }
    }

    if (Object.keys(input).length) {
      const relatedRecords: any[] = await (await db()).model(this.table).findAll({
        attributes: ['id', 'translations'],
        ...(await this.applySequelizeOptions(['where'])),
        raw: true,
      })

      if (relatedRecords.length) {
        await (await db()).model(this.table).update(this.serializeInput(input), {
          where: { translations: { [Op.in]: uniqueArray(relatedRecords.map(({ translations }) => translations)) } },
        })

        return relatedRecords.map(({ id }) => id)
      }
    }

    return []
  }

  protected prepareInput<T extends Record<string, any>>(input: T, operation: 'create' | 'update'): T {
    return objectOmit(
      objectPick(input, Object.keys(collections[this.collection].fields) as any[]),
      operation === 'update' ? this.getImmutableFields() : [],
    ) as T
  }

  protected getImmutableFields(): ImmutableFieldName[CollectionName][] {
    return Object.keys(collections[this.collection].fields).filter(
      (fieldName) => collections[this.collection].fields[fieldName].additional?.immutable,
    ) as ImmutableFieldName[CollectionName][]
  }

  protected getOperableFields(
    input: Record<string, any>,
    operation: 'create' | 'read' | 'update',
  ): CollectionFieldName[CollectionName][] {
    return (operation === 'create' ? Object.keys(collections[this.collection].fields) : Object.keys(input)).filter(
      (fieldName) =>
        fieldName !== 'id' &&
        collections[this.collection].fields[fieldName] &&
        fieldName !== collections[this.collection].createdAtField &&
        fieldName !== collections[this.collection].updatedAtField,
    ) as CollectionFieldName[CollectionName][]
  }

  protected async sanitize(input: Record<string, any>, operation: 'create' | 'update'): Promise<Record<string, any>> {
    const sanitized: Record<string, any> = {}

    for (const fieldName of this.getOperableFields(input, operation)) {
      const declaration = collections[this.collection].fields[fieldName]

      if (declaration) {
        const definition = fields[declaration.type]

        if (definition) {
          sanitized[fieldName] = (input as any)[fieldName]

          for (const sanitizer of [...definition.sanitizers, ...(declaration.additional?.sanitizers ?? [])]) {
            try {
              if (
                isFunction(sanitizer) ||
                (operation === 'create' && sanitizer.onCreate) ||
                (operation === 'update' && sanitizer.onUpdate)
              ) {
                sanitized[fieldName] = await (isFunction(sanitizer) ? sanitizer : sanitizer.sanitizer)({
                  name: fieldName,
                  value: sanitized[fieldName],
                  definition,
                  input,
                  options: resolveCollectionFieldOptions(
                    this.collection,
                    declaration.type,
                    fieldName,
                    declaration.options,
                    fields,
                  ),
                  fields,
                  operation,
                  query: _query,
                })
              }
            } catch {}
          }
        }
      }
    }

    return sanitized
  }

  protected applyConditionalLogic(sanitized: Record<string, any>): {
    errors: Record<string, string>
    failed: string[]
  } {
    const errors: Record<string, string> = {}
    const failed: string[] = []

    for (const [name, value] of Object.entries(sanitized)) {
      const declaration = collections[this.collection].fields[name]
      const definition = declaration ? fields[declaration.type] : null

      if (declaration?.additional?.conditionalLogic && definition) {
        try {
          if (
            !definition.conditionalLogicMatcher({
              conditionalLogic: declaration.additional.conditionalLogic,
              definition,
              errors,
              input: sanitized,
              name,
              options: declaration.options,
              value,
              fields,
            })
          ) {
            failed.push(name)
          }
        } catch (e: any) {
          errors[name] = e.message
        }
      }
    }

    return { errors, failed }
  }

  protected async updateOrDelete(
    operation: 'update' | 'delete',
    callback: (buildSearchKeywordsRecordIds: number[]) => any | Promise<any>,
    buildSearchKeywordsRecordIds: number[] = [],
  ): Promise<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>[]> {
    const sequelizeOptions = { ...(await this.applySequelizeOptions(['attributes', 'order', 'where'])), raw: true }
    const buildSearchKeywords: Promise<void>[] = []

    if (!sequelizeOptions.attributes!.includes('id')) {
      sequelizeOptions.attributes!.push('id')
    }

    let records: any[] = await (await db()).model(this.table).findAll(sequelizeOptions)

    if (operation === 'update') {
      await callback(buildSearchKeywordsRecordIds)

      records = await (await db())
        .model(this.table)
        .findAll({ ...sequelizeOptions, where: { id: { [Op.in]: records.map(({ id }) => id) } } })
    }

    for (const record of records) {
      this.castRecord(record)
    }

    if (operation === 'update') {
      for (const record of records) {
        await this.validateAndFallbackRecordsAfterFetch(record, records)
      }
    }

    for (const record of records) {
      if (this.populateOption) {
        await this.populateRecord(record)
      }

      if (operation === 'update' && collections[this.collection].search) {
        if (!buildSearchKeywordsRecordIds.includes(record.id)) {
          buildSearchKeywordsRecordIds.push(record.id)
          buildSearchKeywords.push(new Promise((resolve) => this.buildSearchKeywords(record.id).then(resolve)))
        }
      }

      if (!this.selectedFields.includes('id')) {
        delete record.id
      }
    }

    for (const id of buildSearchKeywordsRecordIds) {
      if (!buildSearchKeywordsRecordIds.includes(id)) {
        buildSearchKeywordsRecordIds.push(id)
        buildSearchKeywords.push(new Promise((resolve) => this.buildSearchKeywords(id).then(resolve)))
      }
    }

    if (buildSearchKeywords.length) {
      await cache()
      setTimeout(() =>
        Promise.all(buildSearchKeywords).then(() => this.clearCache(operation === 'update' ? 'onUpdate' : 'onDelete')),
      )
    }

    if (operation === 'delete') {
      await callback(buildSearchKeywordsRecordIds)
    }

    if (records.length) {
      await this.clearCache(operation === 'update' ? 'onUpdate' : 'onDelete')
    }

    return records
  }

  protected hasNonCachedFieldInSelectOrderOrGroup(): boolean {
    if (collections[this.collection].cacheQueries !== false) {
      return (
        this.selectedFields.some((fieldName) => collections[this.collection].nonCachedFields.includes(fieldName)) ||
        this.orderOptions.some(([fieldName, _]) => collections[this.collection].nonCachedFields.includes(fieldName)) ||
        this.groupOptions.some((fieldName) => collections[this.collection].nonCachedFields.includes(fieldName))
      )
    }

    return false
  }

  protected hasNonCachedFieldInWhere(): boolean {
    if (collections[this.collection].cacheQueries !== false) {
      for (const { key } of walkObject(this.whereOptions)) {
        if (isString(key) && collections[this.collection].nonCachedFields.includes(key)) {
          return true
        }
      }
    }

    return false
  }

  protected generateCacheKey(method: 'all' | 'allWithCount' | 'paginate' | 'first' | 'min' | 'max' | 'sum'): string {
    if (collections[this.collection].cacheQueries !== false) {
      let key = `pruvious:query:${this.collection}:${method}:select:${this.selectedFields.join(',')}`

      if (method === 'all' || method === 'allWithCount' || method === 'paginate' || method === 'first') {
        key += `:where:${JSON.stringify(stringifySymbols(this.whereOptions))}`
      }

      key += `:order:${JSON.stringify(this.orderOptions)}`
      key += `:group:${JSON.stringify(this.groupOptions)}`
      key += `:offset:${this.offsetOption}`
      key += `:limit:${this.limitOption}`
      key += `:populate:${this.populateOption}`
      key += `:fallback:${this.fallbackOption}`

      return key
    }

    return ''
  }

  protected async storeInCache(key: string, value: any, start: number): Promise<void> {
    const cacheQueries = collections[this.collection].cacheQueries

    if (cacheQueries !== false && performance.now() - start > cacheQueries) {
      await (await cache())?.set(key, JSON.stringify(value))
    }
  }

  protected async readFromCache(key: string): Promise<any> {
    if (collections[this.collection].cacheQueries !== false) {
      const value = await (await cache())?.get(key)
      return value ? JSON.parse(value) : null
    }

    return null
  }

  protected async clearCache(operation: 'onCreate' | 'onUpdate' | 'onDelete'): Promise<void> {
    const collection = collections[this.collection]

    if (collection.clearCacheRules && collection.clearCacheRules[operation] !== false) {
      await (await cache())?.flushDb()
      await clearPageCache()
    }
  }
}
