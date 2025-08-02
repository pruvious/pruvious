import type { I18n } from '@pruvious/i18n'
import {
  deepClone,
  deepCompare,
  isArray,
  isBoolean,
  isDefined,
  isInteger,
  isNull,
  isPositiveInteger,
  remap,
  toArray,
  uniqueArray,
  type ExtractSQLParams,
  type NonEmptyArray,
} from '@pruvious/utils'
import { hash } from 'ohash'
import {
  SelectContext,
  type ExtractCastedTypes,
  type ExtractFieldNamesByType,
  type ExtractPopulatedTypes,
  type GenericCollection,
  type GenericDatabase,
  type Populator,
  type QueryDetails,
} from '../core'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import { queryStringToSelectQueryBuilderParams, selectQueryBuilderParamsToQueryString } from './query-string'
import type {
  DefaultQueryBuilderParamsOptions,
  OmitReservedSQLParams,
  Paginated,
  QueryBuilderResult,
  SelectQueryBuilderParamsOptions,
} from './types'

/**
 * A utility class for constructing and executing SELECT queries on collections in a type-safe manner.
 *
 * @example
 * ```ts
 * const students = await this.selectFrom('Students')
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
 * const houses = await this.selectFrom('Houses')
 *   .selectAll()
 *   .all()
 *
 * console.log(houses)
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 1,
 * //       name: 'Gryffindor',
 * //       founder: 'Godric Gryffindor',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //     {
 * //       id: 2,
 * //       name: 'Slytherin',
 * //       founder: 'Salazar Slytherin',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //     {
 * //       id: 3,
 * //       name: 'Ravenclaw',
 * //       founder: 'Rowena Ravenclaw',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //     {
 * //       id: 4,
 * //       name: 'Hufflepuff',
 * //       founder: 'Helga Hufflepuff',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedSelect = await this.selectFrom('Wands')
 *   .select(['wood', 'core', 'length', 'wandmaker'])
 *   .all()
 *
 * console.log(failedSelect)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: "The field 'wandmaker' does not exist",
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export class SelectQueryBuilder<
  TCollections extends Record<string, GenericCollection>,
  const TCollectionName extends string,
  TCollection extends GenericCollection,
  TI18n extends I18n,
  TSelectedFields extends TCollection['TColumnNames'] | 'id' = TCollection['TColumnNames'] | 'id',
  TKnownSelectedFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection, TI18n> {
  protected selectedFields: string[]
  protected rawSelection: { raw: string; params: Record<string, any> } | null = null
  protected groupByFields: string[] = []
  protected orderByClauses: (
    | { field: string; direction: 'asc' | 'desc'; nulls: 'nullsAuto' | 'nullsFirst' | 'nullsLast' }
    | { raw: string; params: Record<string, any> }
  )[] = []
  protected limitValue: number | null = null
  protected offsetValue: number | null = null
  protected rawInjections: {
    afterSelectClause?: { raw: string; params: Record<string, any> }
    afterFromClause?: { raw: string; params: Record<string, any> }
    afterWhereClause?: { raw: string; params: Record<string, any> }
    afterGroupByClause?: { raw: string; params: Record<string, any> }
    afterOrderByClause?: { raw: string; params: Record<string, any> }
    afterOffsetClause?: { raw: string; params: Record<string, any> }
  } = {}
  protected populateFields: boolean = false
  protected cacheResults: boolean = false

  constructor(
    protected collections: TCollections,
    protected collectionName: TCollectionName,
    protected i18n: TI18n,
    protected db: GenericDatabase,
    protected contextLanguage: string,
    protected logger: (message: string, ...optionalParams: any[]) => void,
  ) {
    super(collections, collectionName, i18n, db, contextLanguage, logger)

    // Select all fields by default
    this.selectedFields = ['id', ...Object.keys(this.c().fields)]
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `select` - Comma-separated list of fields to retrieve.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `groupBy` - Comma-separated list of fields to group the results by.
   * - `orderBy` - Comma-separated list of fields to order the results by.
   * - `limit` - Maximum number of results to return.
   * - `offset` - Number of results to skip.
   * - `page` - Page number for paginated results.
   * - `perPage` - Number of results per page for paginated results.
   * - `populate` - Whether to populate related fields.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .fromQueryString('select=firstName,lastName&where=house[=][1]')
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Ron', lastName: 'Weasley' },
   * //     // ... other Gryffindor students
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: SelectQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TI18n, TSelectedFields, false, TPopulateFields> {
    const params = queryStringToSelectQueryBuilderParams(queryString, options)

    if (params.select) {
      this.selectedFields = params.select.includes('*') ? ['id', ...Object.keys(this.c().fields)] : params.select
      this.rawSelection = null
    } else if (options?.withDefaults) {
      this.selectAll()
    }

    if (params.where) {
      this.whereCondition = params.where
    } else if (options?.withDefaults) {
      this.clearWhere()
    }

    if (params.groupBy) {
      this.groupByFields = params.groupBy
    } else if (options?.withDefaults) {
      this.clearGroupBy()
    }

    if (params.orderBy) {
      this.orderByClauses = params.orderBy.map(({ field, direction, nulls }) => ({
        field,
        direction: direction ?? 'asc',
        nulls: nulls ?? 'nullsAuto',
      }))
    } else if (options?.withDefaults) {
      this.clearOrderBy()
    }

    let hasPerPage = false

    if (isDefined(params.limit)) {
      this.limitValue = params.limit < 0 ? null : params.limit
    } else if (isDefined(params.perPage)) {
      this.limitValue = params.perPage
      hasPerPage = true
    } else if (options?.withDefaults) {
      this.clearLimit()
    }

    if (isDefined(params.offset)) {
      this.offsetValue = params.offset
    } else if (isDefined(params.page) && hasPerPage) {
      this.offsetValue = params.page
    } else if (options?.withDefaults) {
      this.clearOffset()
    }

    if (isDefined(params.populate)) {
      this.populateFields = params.populate
    } else if (options?.withDefaults) {
      this.clearPopulate()
    }

    return this as any
  }

  /**
   * Generates a query string from the following query builder parameters:
   *
   * - `select` - Comma-separated list of fields to retrieve.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `groupBy` - Comma-separated list of fields to group the results by.
   * - `orderBy` - Comma-separated list of fields to order the results by.
   * - `limit` - Maximum number of results to return.
   * - `offset` - Number of results to skip.
   * - `populate` - Whether to populate related fields.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .where('house', '=', 1)
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'select=firstName,lastName&where=house[=][1]'
   * ```
   */
  toQueryString(
    options?: SelectQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults
    const initialSelect = ['id', ...Object.keys(this.c().fields)].sort()
    const currentSelect = [...this.selectedFields].sort()

    return selectQueryBuilderParamsToQueryString(
      {
        select: !deepCompare(initialSelect, currentSelect) ? this.selectedFields : wd ? ['*'] : undefined,
        where: this.whereCondition.length ? (this.whereCondition as any) : wd ? [] : undefined,
        groupBy: this.groupByFields.length ? this.groupByFields : wd ? [] : undefined,
        orderBy: this.orderByClauses.length ? (this.orderByClauses as any) : wd ? [] : undefined,
        limit: this.limitValue ?? (wd ? -1 : undefined),
        offset: this.offsetValue ?? (wd ? 0 : undefined),
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      options,
    )
  }

  /**
   * Computes a unique hash for the query builder's current state.
   */
  hash(): string {
    return hash({
      collection: this.collectionName,
      contextLanguage: this.contextLanguage,
      selectedFields: this.selectedFields,
      rawSelection: this.rawSelection,
      whereCondition: this.whereCondition,
      groupByFields: this.groupByFields,
      orderByClauses: this.orderByClauses,
      limitValue: this.limitValue,
      offsetValue: this.offsetValue,
      rawInjections: this.rawInjections,
      populateFields: this.populateFields,
    })
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new SelectQueryBuilder(
      this.collections,
      this.collectionName,
      this.i18n,
      this.db,
      this.contextLanguage,
      this.logger,
    )

    clone.cache = { ...this.cache }
    clone.customContextData = { ...this.customContextData }
    clone.verboseMode = this.verboseMode
    this.preparations = [...this.preparations]

    clone.whereCondition = deepClone(this.whereCondition)

    clone.selectedFields = [...this.selectedFields]
    clone.rawSelection = this.rawSelection ? { ...this.rawSelection } : null
    clone.groupByFields = [...this.groupByFields]
    clone.orderByClauses = deepClone(this.orderByClauses)
    clone.limitValue = this.limitValue
    clone.offsetValue = this.offsetValue
    clone.rawInjections = deepClone(this.rawInjections)
    clone.populateFields = this.populateFields
    clone.cacheResults = this.cacheResults

    return clone as any
  }

  /**
   * Specifies the `fields` to be retrieved from the query result.
   *
   * This method will override any previous field selection.
   *
   * @example
   * ```ts
   * const houses = await this.selectFrom('Houses')
   *   .select(['name', 'founder'])
   *   .all()
   *
   * console.log(houses)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Gryffindor', founder: 'Godric Gryffindor' },
   * //     { name: 'Slytherin', founder: 'Salazar Slytherin' },
   * //     { name: 'Ravenclaw', founder: 'Rowena Ravenclaw' },
   * //     { name: 'Hufflepuff', founder: 'Helga Hufflepuff' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  select<TSelectedFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TSelectedFields>,
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TI18n, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TCollection['TColumnNames'] | 'id'>(
    field: TSelectedFields,
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TI18n, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TSelectedFields> | TSelectedFields,
  ) {
    this.selectedFields = uniqueArray(toArray(fields))
    this.rawSelection = null
    return this as SelectQueryBuilder<
      TCollections,
      TCollectionName,
      TCollection,
      TI18n,
      TSelectedFields,
      true,
      TPopulateFields
    >
  }

  /**
   * Specifies a raw SQL selection for the query.
   *
   * This method allows you to write custom SQL for the SELECT part of the query.
   * It overrides any previous field selection.
   *
   * Important: Ensure unique `params` names across the entire query.
   *
   * @example
   * ```ts
   * const result = await this.selectFrom('Houses')
   *   .selectRaw('cast(count(*) as text) as "houses", cast(round(avg("points"), 1) as text) as "avgPoints"')
   *   .first()
   *
   * console.log(result)
   * // {
   * //   success: true,
   * //   data: {
   * //     house_count: '4',
   * //     avgPoints: '62.5',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  selectRaw<T extends string>(
    select: T,
    params?: OmitReservedSQLParams<ExtractSQLParams<T>>,
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TI18n, TSelectedFields, false, TPopulateFields> {
    this.selectedFields = []
    this.rawSelection = { raw: select, params: params ?? {} }
    return this as any
  }

  /**
   * Selects all fields from the collection.
   *
   * This method will override any previous field selection.
   *
   * @example
   * ```ts
   * const houses = await this.selectFrom('Houses')
   *   .selectAll()
   *   .all()
   *
   * console.log(houses)
   * // {
   * //   success: true,
   * //   data: [
   * //     {
   * //       id: 1,
   * //       name: 'Gryffindor',
   * //       founder: 'Godric Gryffindor',
   * //       createdAt: 1724091250000,
   * //       updatedAt: 1724091250000,
   * //     },
   * //     {
   * //       id: 2,
   * //       name: 'Slytherin',
   * //       founder: 'Salazar Slytherin',
   * //       createdAt: 1724091250000,
   * //       updatedAt: 1724091250000,
   * //     },
   * //     {
   * //       id: 3,
   * //       name: 'Ravenclaw',
   * //       founder: 'Rowena Ravenclaw',
   * //       createdAt: 1724091250000,
   * //       updatedAt: 1724091250000,
   * //     },
   * //     {
   * //       id: 4,
   * //       name: 'Hufflepuff',
   * //       founder: 'Helga Hufflepuff',
   * //       createdAt: 1724091250000,
   * //       updatedAt: 1724091250000,
   * //     },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  selectAll(): SelectQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    TCollection['TColumnNames'] | 'id',
    true,
    TPopulateFields
  > {
    this.selectedFields = ['id', ...Object.keys(this.c().fields)]
    this.rawSelection = null
    return this as any
  }

  /**
   * Counts the number of rows that match the current query conditions.
   *
   * The `returnType` parameter can be used to specify the type of the returned count value (default: `number`).
   *
   * @example
   * ```ts
   * const studentCount = await this.selectFrom('Students')
   *   .where('house', '=', 1) // Gryffindor
   *   .count()
   *
   * console.log(studentCount)
   * // {
   * //   success: true,
   * //   data: 54,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async count(): Promise<QueryBuilderResult<number, undefined>> {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    if (this.cacheResults) {
      const cacheKey = `_count:${this.hash()}`

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey]
      }
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.cacheFilter('_count', this.prepareError('noInputErrors'))
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_count', this.prepareError('noInputErrors'))
    }

    const { sql, params } = this.toSQL({ select: 'count(*) as count' })
    const baseQueryDetails = {
      query: { operation: 'select', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_count', this.prepareError('noInputErrors'))
    }

    try {
      const { result: rows, duration: queryExecutionTime } = (await this.db.execWithDuration(sql, params)) as any
      const count = Number(rows[0]['count'])
      const result = this.prepareOutput(count as any)
      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult: rows, queryExecutionTime, result })
      return this.cacheFilter('_count', result)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return this.cacheFilter('_count', result)
    }
  }

  /**
   * Calculates the minimum value for a specified numeric `field`.
   *
   * @example
   * ```ts
   * // Houses: Gryffindor (100), Slytherin (50), Ravenclaw (75), Hufflepuff (25)
   * const minPoints = await this.selectFrom('Houses')
   *   .min('points')
   *
   * console.log(minPoints)
   * // {
   * //   success: true,
   * //   data: 25,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async min<TField extends ExtractFieldNamesByType<TCollection['fields'], 'bigint' | 'numeric'> | 'id'>(
    field: TField,
  ): Promise<QueryBuilderResult<number | null, undefined>> {
    return this.numFn('min', field as string)
  }

  /**
   * Calculates the maximum value for a specified numeric `field`.
   *
   * @example
   * ```ts
   * // Houses: Gryffindor (100), Slytherin (50), Ravenclaw (75), Hufflepuff (25)
   * const maxPoints = await this.selectFrom('Houses')
   *   .max('points')
   *
   * console.log(maxPoints)
   * // {
   * //   success: true,
   * //   data: 100,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async max<TField extends ExtractFieldNamesByType<TCollection['fields'], 'bigint' | 'numeric'> | 'id'>(
    field: TField,
  ): Promise<QueryBuilderResult<number | null, undefined>> {
    return this.numFn('max', field as string)
  }

  /**
   * Calculates the sum of values for a specified numeric `field`.
   *
   * @example
   * ```ts
   * // Houses: Gryffindor (100), Slytherin (50), Ravenclaw (75), Hufflepuff (25)
   * const totalPoints = await this.selectFrom('Houses')
   *   .sum('points')
   *
   * console.log(totalPoints)
   * // {
   * //   success: true,
   * //   data: 250,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async sum<TField extends ExtractFieldNamesByType<TCollection['fields'], 'bigint' | 'numeric'> | 'id'>(
    field: TField,
  ): Promise<QueryBuilderResult<number | null, undefined>> {
    return this.numFn('sum', field as string)
  }

  /**
   * Calculates the average value for a specified numeric `field`.
   *
   * @example
   * ```ts
   * // Houses: Gryffindor (100), Slytherin (50), Ravenclaw (75), Hufflepuff (25)
   * const avgPoints = await this.selectFrom('Houses')
   *   .avg('points')
   *
   * console.log(avgPoints)
   * // {
   * //   success: true,
   * //   data: 62.5,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async avg<TField extends ExtractFieldNamesByType<TCollection['fields'], 'bigint' | 'numeric'> | 'id'>(
    field: TField,
  ): Promise<QueryBuilderResult<number | null, undefined>> {
    return this.numFn('avg', field as string)
  }

  /**
   * Helper method for calculating the minimum, maximum, sum, or average value for a specified numeric `field`.
   */
  protected async numFn(
    fn: 'min' | 'max' | 'sum' | 'avg',
    field: string,
  ): Promise<QueryBuilderResult<number | null, undefined>> {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    if (this.cacheResults) {
      const cacheKey = `__${fn}:${field}:${this.hash()}`

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey]
      }
    }

    const cField = field === 'id' ? undefined : this.c().fields[field]

    if (field !== 'id') {
      if (!cField) {
        this.setRuntimeError(this._('The field `$field` does not exist', { field }))
        return this.cacheFilter(`__${fn}:${field}`, this.prepareError('noInputErrors'))
      } else if (cField.model.dataType !== 'bigint' && cField.model.dataType !== 'numeric') {
        this.setRuntimeError(this._('The field `$field` must be a number', { field }))
        return this.cacheFilter(`__${fn}:${field}`, this.prepareError('noInputErrors'))
      }
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.cacheFilter(`__${fn}:${field}`, this.prepareError('noInputErrors'))
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter(`__${fn}:${field}`, this.prepareError('noInputErrors'))
    }

    const { sql, params } = this.toSQL({ select: `${fn}(${this.escapeIdentifier(field)}) as ${fn}` })
    const baseQueryDetails = {
      query: { operation: 'select', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter(`__${fn}:${field}`, this.prepareError('noInputErrors'))
    }

    try {
      const { result: rows, duration: queryExecutionTime } = (await this.db.execWithDuration(sql, params)) as any
      const value = !isNull(rows[0][fn]) ? Number(rows[0][fn]) : rows[0][fn]
      const result = this.prepareOutput(value)
      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult: rows, queryExecutionTime, result })
      return this.cacheFilter(`__${fn}:${field}`, result)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return this.cacheFilter(`__${fn}:${field}`, result)
    }
  }

  /**
   * Groups the query results by one or more fields.
   *
   * This method will override any previous grouping.
   *
   * @example
   * ```ts
   * const housesWithStudentCount = await this.selectFrom('Students')
   *   .selectRaw('"house", cast(count(*) as text) as "students"')
   *   .groupBy('house')
   *   .all()
   *
   * console.log(housesWithStudentCount)
   * // {
   * //   success: true,
   * //   data: [
   * //     { house: 1, students: '54' },
   * //     { house: 2, students: '48' },
   * //     { house: 3, students: '42' },
   * //     { house: 4, students: '46' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  groupBy<TField extends TCollection['TColumnNames'] | 'id'>(fields: NonEmptyArray<TField>): this
  groupBy<TField extends TCollection['TColumnNames'] | 'id'>(field: TField): this
  groupBy<TField extends TCollection['TColumnNames'] | 'id'>(fields: NonEmptyArray<TField> | TField) {
    this.groupByFields = uniqueArray(toArray(fields as string[]))
    return this
  }

  /**
   * Removes all previously set GROUP BY clauses from the query.
   *
   * @example
   * ```ts
   * this.selectFrom('Students')
   *   .select('house')
   *   .groupBy('house') // This will be ignored
   *   .clearGroupBy()   // This will clear the GROUP BY clause
   *   .all()
   * ```
   */
  clearGroupBy(): this {
    this.groupByFields = []
    return this
  }

  /**
   * Specifies the order in which query results should be returned.
   *
   * - The `direction` parameter can be used to specify the order direction (default: `asc`).
   * - The `nulls` parameter can be used to specify the order of null values (default: `nullsAuto`).
   *   - `nullsAuto` - Null values are ordered based on the specified direction (`nullsFirst` for `asc`, `nullsLast` for `desc`).
   *   - `nullsFirst` - Null values are ordered first.
   *   - `nullsLast` - Null values are ordered last.
   *
   * This method is chainable and can be used repeatedly to specify multiple orderings.
   *
   * @example
   * ```ts
   * const houses = await this.selectFrom('Houses')
   *   .select(['name', 'points'])
   *   .orderBy('points', 'desc')
   *   .all()
   *
   * console.log(houses)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Gryffindor', points: 100 },
   * //     { name: 'Ravenclaw', points: 75 },
   * //     { name: 'Slytherin', points: 50 },
   * //     { name: 'Hufflepuff', points: 25 },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  orderBy<TField extends TCollection['TColumnNames'] | 'id'>(
    field: TField,
    direction: 'asc' | 'desc' = 'asc',
    nulls: 'nullsAuto' | 'nullsFirst' | 'nullsLast' = 'nullsAuto',
  ): this {
    this.orderByClauses.push({ field: field as string, direction, nulls })
    return this
  }

  /**
   * Specifies a raw SQL ordering for the query.
   *
   * This method is chainable and can be used repeatedly to specify multiple orderings.
   *
   * Important: Ensure unique `params` names across the entire query.
   *
   * @example
   * ```ts
   * const houses = await this.selectFrom('Houses')
   *   .select(['name', 'points'])
   *   .orderByRaw('points desc')
   *   .all()
   *
   * console.log(houses)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Gryffindor', points: 100 },
   * //     { name: 'Ravenclaw', points: 75 },
   * //     { name: 'Slytherin', points: 50 },
   * //     { name: 'Hufflepuff', points: 25 },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  orderByRaw<T extends string>(orderBy: T, params?: OmitReservedSQLParams<ExtractSQLParams<T>>): this {
    this.orderByClauses.push({ raw: orderBy, params: params ?? {} })
    return this
  }

  /**
   * Removes all previously set ORDER BY clauses from the query.
   *
   * @example
   * ```ts
   * this.selectFrom('Students')
   *   .select('house')
   *   .orderBy('house', 'asc') // This will be ignored
   *   .clearOrderBy()          // This will clear the ORDER BY clause
   *   .all()
   * ```
   */
  clearOrderBy(): this {
    this.orderByClauses = []
    return this
  }

  /**
   * Limits the number of results returned by the query.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .limit(3)
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Ron', lastName: 'Weasley' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  limit(limit: number): this {
    this.limitValue = limit
    return this
  }

  /**
   * Removes the LIMIT clause from the query.
   *
   * @example
   * ```ts
   * this.selectFrom('Students')
   *   .select('house')
   *   .limit(3)     // This will be ignored
   *   .clearLimit() // This will clear the LIMIT clause
   *   .all()
   * ```
   */
  clearLimit(): this {
    this.limitValue = null
    return this
  }

  /**
   * Skips a specified number of results before returning the remainder.
   *
   * This method will override any previous OFFSET clause.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .offset(3)
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Seamus', lastName: 'Finnigan' },
   * //     { firstName: 'Lavender', lastName: 'Brown' },
   * //     { firstName: 'Parvati', lastName: 'Patil' },
   * //     // ...
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  offset(offset: number): this {
    this.offsetValue = offset
    return this
  }

  /**
   * Removes the OFFSET clause from the query.
   *
   * @example
   * ```ts
   * this.selectFrom('Students')
   *   .select('house')
   *   .offset(3)     // This will be ignored
   *   .clearOffset() // This will clear the OFFSET clause
   *   .all()
   * ```
   */
  clearOffset(): this {
    this.offsetValue = null
    return this
  }

  /**
   * Sets both LIMIT and OFFSET based on the specified `page` and items `perPage`.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .paged(1, 3)
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Ron', lastName: 'Weasley' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  paged(page: number, perPage: number): this {
    return this.limit(perPage).offset((page - 1) * perPage)
  }

  /**
   * Removes both LIMIT and OFFSET clauses from the query, effectively clearing pagination.
   *
   * This method is equivalent to calling both `clearLimit()` and `clearOffset()`.
   *
   * @example
   * ```ts
   * this.selectFrom('Students')
   *   .select('house')
   *   .paged(1, 3)  // This will be ignored
   *   .clearPaged() // This will clear the LIMIT and OFFSET clauses
   *   .all()
   * ```
   */
  clearPaged(): this {
    return this.clearLimit().clearOffset()
  }

  /**
   * Injects raw SQL into the query at the specified `position`.
   *
   * Important: Ensure unique `params` names across the entire query.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .injectRaw('afterSelectClause', ', "Houses"."name" as "houseName"')
   *   .injectRaw('afterFromClause', 'join "Houses" on "Students"."house" = "Houses"."id"')
   *   .limit(3)
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter', houseName: 'Gryffindor' },
   * //     { firstName: 'Hermione', lastName: 'Granger', houseName: 'Gryffindor' },
   * //     { firstName: 'Ron', lastName: 'Weasley', houseName: 'Gryffindor' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  injectRaw<T extends string>(
    position:
      | 'afterSelectClause'
      | 'afterFromClause'
      | 'afterWhereClause'
      | 'afterGroupByClause'
      | 'afterOrderByClause'
      | 'afterOffsetClause',
    sql: T,
    params?: ExtractSQLParams<T>,
  ) {
    this.rawInjections[position] = { raw: sql, params: params ?? {} }
    return this
  }

  /**
   * Removes raw SQL injections from the query at the specified `position`.
   * By default, `'all'` raw injections are removed.
   */
  clearRawInjection(
    position:
      | 'all'
      | 'afterSelectClause'
      | 'afterFromClause'
      | 'afterWhereClause'
      | 'afterGroupByClause'
      | 'afterOrderByClause'
      | 'afterOffsetClause' = 'all',
  ) {
    if (position === 'all') {
      this.rawInjections = {}
    } else {
      delete this.rawInjections[position]
    }

    return this
  }

  /**
   * Specifies that the query should return populated field values.
   * Field populators transform the field value into a format suitable for application use.
   * They can retrieve related data from the database, format the value, or perform other operations.
   *
   * @example
   * ```ts
   * const student = await this.selectFrom('Students')
   *   .select(['id', 'house'])
   *   .where('firstName', '=', 'Herminone')
   *   .where('lastName', '=', 'Granger')
   *   .populate()
   *   .first()
   *
   * console.log(student)
   * // {
   * //   success: true,
   * //   data: {
   * //     id: 2,
   * //     house: {
   * //       id: 1,
   * //       name: 'Gryffindor',
   * //       points: 100,
   * //     },
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): SelectQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    TSelectedFields,
    TKnownSelectedFields,
    true
  > {
    this.populateFields = true
    return this
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * this.selectFrom('Students')
   *   .select(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): SelectQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    TSelectedFields,
    TKnownSelectedFields,
    false
  > {
    this.populateFields = true
    return this
  }

  /**
   * Enables automatic caching of query results using the provided `cache` object.
   * Cached results can be reused in subsequent hook executions.
   * The same `cache` object can be shared across multiple query builders.
   *
   * Note: The `_tmp` cache key is removed before executing `afterQueryExecution` hooks and returning query results.
   * This can be used as a runtime store, for example, to synchronize timestamps across multiple collection fields.
   */
  useCache(cache: Record<string, any>): this {
    this.cache = cache
    this.cacheResults = true
    return this
  }

  /**
   * Clears all cached results and disables result caching.
   * If a custom `cache` object was set via `useCache()`, it remains unmodified.
   */
  clearCache(): this {
    this.cache = {}
    this.cacheResults = false
    return this
  }

  /**
   * Retrieves all matching rows from the database.
   *
   * @example
   * ```ts
   * const houses = await this.selectFrom('Houses')
   *   .select(['name', 'founder'])
   *   .all()
   *
   * console.log(houses)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Gryffindor', founder: 'Godric Gryffindor' },
   * //     { name: 'Slytherin', founder: 'Salazar Slytherin' },
   * //     { name: 'Ravenclaw', founder: 'Rowena Ravenclaw' },
   * //     { name: 'Hufflepuff', founder: 'Helga Hufflepuff' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const students = await this.selectFrom('Students')
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
   * ```
   */
  async all(): Promise<
    QueryBuilderResult<
      (TKnownSelectedFields extends false
        ? Partial<
            (TPopulateFields extends true
              ? ExtractPopulatedTypes<TCollection['fields']>
              : ExtractCastedTypes<TCollection['fields']>) & { id: number }
          > &
            Record<string, any>
        : Pick<
            (TPopulateFields extends true
              ? ExtractPopulatedTypes<TCollection['fields']>
              : ExtractCastedTypes<TCollection['fields']>) & { id: number },
            TSelectedFields
          >)[],
      undefined
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    if (this.cacheResults) {
      const cacheKey = `_all:${this.hash()}`

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey]
      }
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.cacheFilter('_all', this.prepareError('noInputErrors'))
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_all', this.prepareError('noInputErrors'))
    }

    const { sql, params } = this.toSQL()
    const baseQueryDetails = {
      query: { operation: 'select', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_all', this.prepareError('noInputErrors'))
    }

    try {
      const { result: rows, duration: queryExecutionTime } = (await this.db.execWithDuration(sql, params)) as any
      const deserializedRows = await this.deserialize(rows)
      const populatedRows = this.populateFields ? await this.populateFieldValues(deserializedRows) : deserializedRows
      const result = this.prepareOutput(populatedRows)
      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult: rows, queryExecutionTime, result })
      return this.cacheFilter('_all', result)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return this.cacheFilter('_all', result)
    }
  }

  /**
   * Retrieves a paginated result set from the database.
   *
   * This method returns a paginated result containing:
   *
   * - `records` - An array of matching rows for the current page.
   * - `currentPage` - The current page number.
   * - `lastPage` - The total number of pages.
   * - `perPage` - The number of items per page.
   * - `total` - The total number of matching rows across all pages.
   *
   * The pagination is based on the current LIMIT and OFFSET values set on the query.
   * If no LIMIT is set, it defaults to the total number of matching rows.
   *
   * @example
   * ```ts
   * const paginatedStudents = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .paged(2, 10)
   *   .paginate()
   *
   * console.log(paginatedStudents)
   * // {
   * //   success: true,
   * //   data: {
   * //     records: [
   * //       { firstName: 'Neville', lastName: 'Longbottom' },
   * //       { firstName: 'Luna', lastName: 'Lovegood' },
   * //       // ... (8 more students)
   * //     ],
   * //     currentPage: 2,
   * //     lastPage: 5,
   * //     perPage: 10,
   * //     total: 50,
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async paginate(): Promise<
    QueryBuilderResult<
      Paginated<
        TKnownSelectedFields extends false
          ? Partial<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TCollection['fields']>
                : ExtractCastedTypes<TCollection['fields']>) & { id: number }
            > &
              Record<string, any>
          : Pick<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TCollection['fields']>
                : ExtractCastedTypes<TCollection['fields']>) & { id: number },
              TSelectedFields
            >
      >,
      undefined
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    if (this.cacheResults) {
      const cacheKey = `_paginate:${this.hash()}`

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey]
      }
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.cacheFilter('_paginate', this.prepareError('noInputErrors'))
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_paginate', this.prepareError('noInputErrors'))
    }

    const { sql, params } = this.toSQL()
    const baseQueryDetails = {
      query: { operation: 'select', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_paginate', this.prepareError('noInputErrors'))
    }

    try {
      const { result: rows, duration: queryExecutionTime } = (await this.db.execWithDuration(sql, params)) as any

      const countSQL = this.toSQL({ select: 'count(*) as count', limit: null, offset: null })
      const countRows = (await this.db.exec(countSQL.sql, countSQL.params)) as any

      const total = Number(countRows[0]['count'])
      const perPage = this.limitValue ?? rows.length
      const currentPage = this.offsetValue ? Math.floor(this.offsetValue / perPage) + 1 : 1
      const lastPage = perPage > 0 ? Math.ceil(total / perPage) : 0

      const deserializedRows = await this.deserialize(rows)
      const populatedRows = this.populateFields ? await this.populateFieldValues(deserializedRows) : deserializedRows
      const result = this.prepareOutput({
        records: populatedRows,
        currentPage,
        lastPage,
        perPage,
        total,
      } as any)

      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult: rows, queryExecutionTime, result })

      return this.cacheFilter('_paginate', result)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return this.cacheFilter('_paginate', result)
    }
  }

  /**
   * Retrieves the first matching row from the database.
   * If no rows match the query conditions, `null` is returned.
   *
   * @example
   * ```ts
   * const firstHouse = await this.selectFrom('Houses')
   *   .select(['name', 'founder'])
   *   .first()
   *
   * console.log(firstHouse)
   * // {
   * //   success: true,
   * //   data: { name: 'Gryffindor', founder: 'Godric Gryffindor' },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async first(): Promise<
    QueryBuilderResult<
      | (TKnownSelectedFields extends false
          ? Partial<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TCollection['fields']>
                : ExtractCastedTypes<TCollection['fields']>) & { id: number }
            > &
              Record<string, any>
          : Pick<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TCollection['fields']>
                : ExtractCastedTypes<TCollection['fields']>) & { id: number },
              TSelectedFields
            >)
      | null,
      undefined
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    if (this.cacheResults) {
      const cacheKey = `_first:${this.hash()}`

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey]
      }
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.cacheFilter('_first', this.prepareError('noInputErrors'))
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_first', this.prepareError('noInputErrors'))
    }

    const { sql, params } = this.toSQL({ limit: 1 })
    const baseQueryDetails = {
      query: { operation: 'select', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_first', this.prepareError('noInputErrors'))
    }

    try {
      const { result: rows, duration: queryExecutionTime } = (await this.db.execWithDuration(sql, params)) as any
      const deserializedRows = await this.deserialize(rows)
      const populatedRows = this.populateFields ? await this.populateFieldValues(deserializedRows) : deserializedRows
      const result = this.prepareOutput(populatedRows[0] ?? null)
      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult: rows, queryExecutionTime, result })
      return this.cacheFilter('_first', result)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return this.cacheFilter('_first', result)
    }
  }

  /**
   * Executes each preparation callback function sequentially.
   */
  protected async runPreparations() {
    if (this.preparations.length) {
      const context = this.createContext()

      for (const callback of this.preparations) {
        try {
          await callback(context)
        } catch (error: any) {
          this.setRuntimeError(error.message || '')
          break
        }
      }
    }
  }

  /**
   * Validates the query builder parameters before execution.
   */
  protected validateParams() {
    if (!this.collection) {
      return this.setRuntimeError(
        this._('The collection `$collection` does not exist', { collection: this.collectionName }),
      )
    }

    if (this.selectedFields.length) {
      this.validateColumnNames(this.selectedFields)
    } else if (!this.rawSelection) {
      this.setRuntimeError(this._('At least one field must be selected'))
    }

    if (this.groupByFields.length) {
      this.validateColumnNames(this.groupByFields)
    }

    if (this.orderByClauses.length) {
      for (const orderBy of this.orderByClauses) {
        if ('field' in orderBy) {
          this.validateColumnNames([orderBy.field])

          if (orderBy.direction !== 'asc' && orderBy.direction !== 'desc') {
            this.setRuntimeError(this._('Invalid order direction `$direction`', { direction: orderBy.direction }))
          } else if (orderBy.nulls !== 'nullsAuto' && orderBy.nulls !== 'nullsFirst' && orderBy.nulls !== 'nullsLast') {
            this.setRuntimeError(this._('Invalid nulls order `$order`', { order: orderBy.nulls }))
          }
        }
      }
    }

    if (!isNull(this.limitValue) && !isPositiveInteger(this.limitValue)) {
      this.setRuntimeError(this._('The `$param` parameter must be a positive integer', { param: 'limit' }))
    }

    if (!isNull(this.offsetValue)) {
      if (!isInteger(this.offsetValue)) {
        this.setRuntimeError(this._('The `$param` parameter must be an integer', { param: 'offset' }))
      } else if (this.offsetValue < 0) {
        this.setRuntimeError(
          this._('The `$param` parameter must be greater than or equal to zero', { param: 'offset' }),
        )
      }
    }

    this.validateWhereCondition()
  }

  /**
   * Applies all available field populators to the provided `rows` and returns a new array with the populated values.
   */
  protected async populateFieldValues(rows: any) {
    if (isArray<Record<string, any>>(rows)) {
      const populatedRows: Record<string, any>[] = []
      const fields = this.c().fields
      const context = this.createContext()
      const promises: Promise<any>[] = []

      for (const row of rows) {
        const populatedRow: Record<string, any> = {}

        for (const [column, value] of Object.entries(row)) {
          const populator: Populator<any, any> | undefined = fields[column]?.model.populator

          if (populator) {
            promises.push(
              new Promise<void>(async (resolve) => {
                populatedRow[column] = await populator(value, fields[column].withContext(context, { path: column }))
                resolve()
              }),
            )
          } else {
            populatedRow[column] = value
          }
        }

        populatedRows.push(populatedRow)
      }

      await Promise.all(promises)
      return populatedRows
    }

    return rows
  }

  /**
   * Runs all `beforeQueryPreparation` hooks of the current `collection`.
   */
  protected async runHooksBeforeQueryPreparation() {
    if (this.c().hooks.beforeQueryPreparation.length) {
      const context = this.createContext()

      for (const hook of this.c().hooks.beforeQueryPreparation) {
        await hook(context)
      }
    }
  }

  /**
   * Runs all `beforeQueryExecution` hooks of the current `collection`.
   */
  protected async runHooksBeforeQueryExecution(queryDetails: Pick<QueryDetails, 'query'>) {
    if (this.c().hooks.beforeQueryExecution.length) {
      const context = this.createContext()

      for (const hook of this.c().hooks.beforeQueryExecution) {
        await hook(context, queryDetails)
      }
    }
  }

  /**
   * Runs all `afterQueryExecution` hooks of the current `collection`.
   */
  protected async runHooksAfterQueryExecution(queryDetails: QueryDetails) {
    this.logQueryDetails(queryDetails)

    if (this.c().hooks.afterQueryExecution.length) {
      const context = this.createContext()

      for (const hook of this.c().hooks.afterQueryExecution) {
        await hook(context, queryDetails)
      }
    }
  }

  /**
   * Caches the provided `result` using the specified `cacheKeyPrefix` if `cacheResults` is enabled.
   */
  protected cacheFilter<T>(cacheKeyPrefix: string, result: T): T {
    if (this.cacheResults) {
      this.cache[`${cacheKeyPrefix}:${this.hash()}`] = result
    }

    return result
  }

  /**
   * Generates a new `SelectContext` instance.
   */
  protected createContext(): SelectContext<GenericDatabase> {
    return new SelectContext({
      queryBuilder: this as any,
      collection: this.c(),
      collectionName: this.collectionName,
      database: this.db,
      cache: this.cache,
      whereCondition: this.whereCondition,
      language: this.contextLanguage,
      customData: this.customContextData,
    })
  }

  /**
   * Generates the SQL string and its corresponding parameters for the SELECT query.
   *
   * The `override` parameter can be used to override the current `selectedFields`, `limitValue`, and `offsetValue`.
   */
  protected toSQL(override?: { select?: string; limit?: number | null; offset?: number | null }): {
    sql: string
    params: Record<string, any>
  } {
    const selectedFields = override?.select ?? this.rawSelection?.raw ?? this.getColumnIdentifiers(this.selectedFields)
    const where = this.whereConditionToSQL(0)
    const params = this.rawSelection ? { ...this.rawSelection.params, ...where.params } : where.params

    Object.assign(
      params,
      this.rawInjections.afterSelectClause?.params,
      this.rawInjections.afterFromClause?.params,
      this.rawInjections.afterWhereClause?.params,
      this.rawInjections.afterGroupByClause?.params,
      this.rawInjections.afterOrderByClause?.params,
      this.rawInjections.afterOffsetClause?.params,
    )

    let sql = `select ${selectedFields}`
    sql += this.rawInjections.afterSelectClause?.raw ? ` ${this.rawInjections.afterSelectClause.raw}` : ''
    sql += ` from ${this.getTableIdentifier()}`
    sql += this.rawInjections.afterFromClause?.raw ? ` ${this.rawInjections.afterFromClause.raw}` : ''
    sql += where.sql
    sql += this.rawInjections.afterWhereClause?.raw ? ` ${this.rawInjections.afterWhereClause.raw}` : ''

    if (this.groupByFields.length) {
      const groupBy = this.getColumnIdentifiers(this.groupByFields)
      sql += ` group by ${groupBy}`
    }

    sql += this.rawInjections.afterGroupByClause?.raw ? ` ${this.rawInjections.afterGroupByClause.raw}` : ''

    if (this.orderByClauses.length) {
      const orderBy = this.orderByClauses
        .map((orderBy) => {
          if ('field' in orderBy) {
            const nulls =
              (orderBy.nulls === 'nullsAuto' && orderBy.direction === 'asc') || orderBy.nulls === 'nullsFirst'
                ? 'nulls first'
                : 'nulls last'
            return `${this.escapeIdentifier(orderBy.field)} ${orderBy.direction} ${nulls}`
          } else {
            Object.assign(params, orderBy.params)
            return `${orderBy.raw}`
          }
        })
        .join(', ')

      sql += ` order by ${orderBy}`
    }

    sql += this.rawInjections.afterOrderByClause?.raw ? ` ${this.rawInjections.afterOrderByClause.raw}` : ''

    let hasLimit = false

    if (!isNull(override?.limit) && (isDefined(override?.limit) || !isNull(this.limitValue))) {
      sql += ` limit ${override?.limit ?? this.limitValue}`
      hasLimit = true
    }

    if (!isNull(override?.offset) && (isDefined(override?.offset) || !isNull(this.offsetValue))) {
      if (!hasLimit && (this.db.dialect === 'sqlite' || this.db.dialect === 'd1')) {
        sql += ` limit -1`
      }

      sql += ` offset ${override?.offset ?? this.offsetValue}`
    }

    sql += this.rawInjections.afterOffsetClause?.raw ? ` ${this.rawInjections.afterOffsetClause.raw}` : ''

    const preparedParams = remap(params, (k, v) => [k, isBoolean(v) ? +v : v])

    this.logSQL(sql, preparedParams)

    return { sql, params: preparedParams }
  }
}
