import type {
  Collection,
  DefaultQueryBuilderParamsOptions,
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  Paginated,
  QueryBuilderResult,
  SelectQueryBuilderParamsOptions,
} from '@pruvious/orm'
import {
  queryStringToSelectQueryBuilderParams,
  selectQueryBuilderParamsToQueryString,
} from '@pruvious/orm/query-string'
import {
  deepClone,
  isArray,
  isDefined,
  isNull,
  isUndefined,
  toArray,
  uniqueArray,
  type NonEmptyArray,
  type StringKeys,
} from '@pruvious/utils'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import type { QueryBuilderOptions } from './QueryBuilder'

/**
 * A utility class for constructing and querying collection records through the GET collections API in a type-safe manner.
 * This class is designed for client-side code and only works for collections that have the `api.read` setting enabled.
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
  TCollections extends Record<string, Collection<Record<string, any>, Record<string, any>>>,
  TCollectionName extends keyof TCollections & string,
  TCollection extends TCollections[TCollectionName],
  TSelectedFields extends TCollection['TColumnNames'] | 'id' = TCollection['TColumnNames'] | 'id',
  TKnownSelectedFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection> {
  protected selectedFields: string[] | undefined
  protected searchCondition: { fields: string[]; keywords: string[] }[] = []
  protected groupByFields: string[] = []
  protected orderByClauses: (
    | { field: string; direction: 'asc' | 'desc'; nulls: 'nullsAuto' | 'nullsFirst' | 'nullsLast' }
    | { raw: string; params: Record<string, any> }
  )[] = []
  protected orderByRelevanceValue: 'high' | 'low' | false = 'high'
  protected limitValue: number | null = null
  protected offsetValue: number | null = null
  protected populateFields: boolean = false

  constructor(
    collectionName: TCollectionName,
    protected options: Required<QueryBuilderOptions> & {
      apiRouteResolver: Required<QueryBuilderOptions['apiRouteResolver']>
    },
  ) {
    super(collectionName)
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `select` - Comma-separated list of fields to retrieve.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `search` - Search condition for the results.
   * - `groupBy` - Comma-separated list of fields to group the results by.
   * - `orderBy` - Comma-separated list of fields to order the results by.
   * - `orderByRelevance` - Controls search result ordering based on relevance.
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
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TSelectedFields, false, TPopulateFields> {
    const params = queryStringToSelectQueryBuilderParams(queryString, options)

    if (params.select) {
      this.selectedFields = params.select.includes('*') ? undefined : params.select
    } else if (options?.withDefaults) {
      this.selectAll()
    }

    if (params.where) {
      this.whereCondition = params.where
    } else if (options?.withDefaults) {
      this.clearWhere()
    }

    if (params.search) {
      this.searchCondition = params.search
    } else if (options?.withDefaults) {
      this.clearSearch()
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

    if (params.orderByRelevance) {
      this.orderByRelevanceValue = params.orderByRelevance
    } else if (options?.withDefaults) {
      this.orderByRelevanceValue = 'high'
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
   * - `search` - Search condition for the results.
   * - `groupBy` - Comma-separated list of fields to group the results by.
   * - `orderBy` - Comma-separated list of fields to order the results by.
   * - `orderByRelevance` - Controls search result ordering based on relevance.
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

    return selectQueryBuilderParamsToQueryString(
      {
        select: this.selectedFields ?? (wd ? ['*'] : undefined),
        where: this.whereCondition.length ? (this.whereCondition as any) : wd ? [] : undefined,
        search: this.searchCondition.length ? (this.searchCondition as any) : wd ? [] : undefined,
        groupBy: this.groupByFields.length ? this.groupByFields : wd ? [] : undefined,
        orderBy: this.orderByClauses.length ? (this.orderByClauses as any) : wd ? [] : undefined,
        orderByRelevance: this.orderByRelevanceValue !== 'high' ? this.orderByRelevanceValue : wd ? 'high' : undefined,
        limit: this.limitValue ?? (wd ? -1 : undefined),
        offset: this.offsetValue ?? (wd ? 0 : undefined),
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      options,
    )
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new SelectQueryBuilder(this.collectionName, this.options)

    clone.whereCondition = deepClone(this.whereCondition)

    clone.selectedFields = isUndefined(this.selectedFields) ? undefined : [...this.selectedFields]
    clone.searchCondition = deepClone(this.searchCondition)
    clone.orderByRelevanceValue = this.orderByRelevanceValue
    clone.groupByFields = [...this.groupByFields]
    clone.orderByClauses = deepClone(this.orderByClauses)
    clone.limitValue = this.limitValue
    clone.offsetValue = this.offsetValue
    clone.populateFields = this.populateFields

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
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TCollection['TColumnNames'] | 'id'>(
    field: TSelectedFields,
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollection, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TSelectedFields> | TSelectedFields,
  ) {
    this.selectedFields = uniqueArray(toArray(fields))
    return this as SelectQueryBuilder<
      TCollections,
      TCollectionName,
      TCollection,
      TSelectedFields,
      true,
      TPopulateFields
    >
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
    TCollection['TColumnNames'] | 'id',
    true,
    TPopulateFields
  > {
    this.selectedFields = undefined
    return this as any
  }

  /**
   * Adds a search condition to filter results based on `keywords` in specific `fields`.
   *
   * How it works:
   *
   * - The `keywords` are split by whitespace.
   * - Each keyword is matched against the specified `fields` (case-insensitive).
   * - All keywords must match at least one of the specified `fields`.
   *
   * Ordering results:
   *
   * - By default, results are ordered by relevance (most relevant first; `orderByRelevance = 'high'`).
   * - Relevance is determined by:
   *   - Position of first keyword match (earlier positions rank higher).
   *   - Order of `fields` specified (earlier fields have higher priority).
   *   - Order of chained `search()` calls (earlier calls have higher priority).
   * - You can customize ordering with the `orderByRelevance` parameter.
   *   - Each consecutive `search()` call with defined `orderByRelevance` will override the previous one.
   *   - If additional `orderBy()` calls are made, they will be applied after the relevance-based ordering.
   *   - Set to `false` to disable relevance-based ordering.
   *
   * This method can be chained to add multiple search conditions to the query.
   * All conditions will be combined with AND logic (all conditions must be satisfied).
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .search('er h', ['firstName', 'lastName'])
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  search<TField extends StringKeys<TCollection['TDataTypes']> & string>(
    keywords: string | number | (string | number)[],
    fields: NonEmptyArray<TField>,
    orderByRelevance?: 'high' | 'low' | false,
  ): this
  search<TField extends StringKeys<TCollection['TDataTypes']> & string>(
    keywords: string | number | (string | number)[],
    field: TField,
    orderByRelevance?: 'high' | 'low' | false,
  ): this
  search<TField extends StringKeys<TCollection['TDataTypes']> & string>(
    keywords: string | number | (string | number)[],
    fields: NonEmptyArray<TField> | TField,
    orderByRelevance?: 'high' | 'low' | false,
  ) {
    const keywordsArray = isArray(keywords) ? keywords : keywords.toString().split(' ')
    const finalKeywords: string[] = []

    for (const keyword of keywordsArray) {
      const trimmedKeyword = keyword.toString().trim().toLowerCase()
      if (trimmedKeyword && !finalKeywords.includes(trimmedKeyword)) {
        finalKeywords.push(trimmedKeyword)
      }
    }

    if (finalKeywords.length) {
      this.searchCondition.push({ fields: isArray(fields) ? uniqueArray(fields) : [fields], keywords: finalKeywords })
    }

    if (isDefined(orderByRelevance)) {
      this.orderByRelevanceValue = orderByRelevance
    }

    return this
  }

  /**
   * Removes all previously set search conditions from the query.
   */
  clearSearch(): this {
    this.searchCondition = []
    return this
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
   * Sets the order of search results based on relevance.
   *
   * Only applies when using the `search()` method.
   * You can also set relevance ordering directly in the `search()` method as the 3rd parameter.
   * If additional `orderBy()` calls are made, they will be applied after the relevance-based ordering.
   *
   * - `'high'` sorts most relevant results first.
   * - `'low'` sorts least relevant first.
   * - `false` disables relevance sorting.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .search('er h', ['firstName', 'lastName'])
   *   .orderByRelevance('low')
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  orderByRelevance(order: 'high' | 'low' | false): this {
    this.orderByRelevanceValue = order
    return this
  }

  /**
   * Resets the search results ordering to the default relevance setting (`high`).
   */
  clearOrderByRelevance(): this {
    this.orderByRelevanceValue = 'high'
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
    TSelectedFields,
    TKnownSelectedFields,
    false
  > {
    this.populateFields = true
    return this
  }

  /**
   * Retrieves all matching collection records.
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
    const response = await this.options
      .fetcher(this.options.apiRouteResolver.read(this.collectionName), {
        body: { query: this.toQueryString({ limit: false, offset: false }) },
      })
      .then((r) => (r.success ? { ...r, data: r.data.records } : r))

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
      }
    } else {
      return {
        success: false,
        data: undefined,
        runtimeError: response.error.message,
        inputErrors: undefined,
      }
    }
  }

  /**
   * Retrieves a paginated result set containing matching collection records.
   *
   * This method returns a paginated result containing:
   *
   * - `records` - An array of matching records for the current page.
   * - `currentPage` - The current page number.
   * - `lastPage` - The total number of pages.
   * - `perPage` - The number of items per page.
   * - `total` - The total number of matching records across all pages.
   *
   * The pagination is based on the current LIMIT and OFFSET values set on the query.
   * If no LIMIT is set, it defaults to the total number of matching records.
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
    const response = await this.options.fetcher(this.options.apiRouteResolver.read(this.collectionName), {
      body: { query: this.toQueryString() },
    })

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
      }
    } else {
      return {
        success: false,
        data: undefined,
        runtimeError: response.error.message,
        inputErrors: undefined,
      }
    }
  }

  /**
   * Retrieves the first matching collection record.
   * If no records match the query conditions, `null` is returned.
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
    const prevLimit = this.limitValue
    this.limit(1)
    const query = this.toQueryString()

    if (isNull(prevLimit)) {
      this.clearLimit()
    } else {
      this.limit(prevLimit)
    }

    const response = await this.options
      .fetcher(this.options.apiRouteResolver.read(this.collectionName), { body: { query } })
      .then((r) => (r.success ? { ...r, data: r.data.records[0] ?? null } : r))

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
      }
    } else {
      return {
        success: false,
        data: undefined,
        runtimeError: response.error.message,
        inputErrors: undefined,
      }
    }
  }
}
