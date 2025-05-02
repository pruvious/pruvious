import {
  __,
  database,
  isValidLanguageCode,
  primaryLanguage,
  singletons,
  type LanguageCode,
  type SingletonContext,
  type Singletons,
} from '#pruvious/server'
import {
  normalizeQueryString,
  queryStringToSelectQueryBuilderParams,
  SelectContext,
  selectQueryBuilderParamsToQueryString,
  type DefaultQueryBuilderParamsOptions,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type GenericDatabase,
  type Populator,
  type QueryBuilderResult,
  type QueryDetails,
  type SelectQueryBuilderParamsOptions,
} from '@pruvious/orm'
import { deepCompare, isArray, isDefined, isNull, toArray, uniqueArray, type NonEmptyArray } from '@pruvious/utils'
import { hash } from 'ohash'
import { SingletonBaseQueryBuilder, type SingletonQueryBuilderParamsOptions } from './SingletonBaseQueryBuilder'

/**
 * A utility class for constructing and executing SELECT queries on singletons in a type-safe manner.
 *
 * @example
 * ```ts
 * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
 *   .select(['logo', 'copyrightText'])
 *   .get()
 *
 * console.log(themeOptions)
 * // {
 * //   success: true,
 * //   data: {
 * //     logo: 123,
 * //     copyrightText: '© 2025 Example Inc.',
 * //   },
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedSelect = await new SingletonSelectQueryBuilder('ThemeOptions')
 *   .select('nonExistentField')
 *   .get()
 *
 * console.log(failedSelect)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: "The field 'nonExistentField' does not exist",
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export class SingletonSelectQueryBuilder<
  const TSingletonName extends keyof Singletons,
  TSingleton extends Singletons[TSingletonName] = Singletons[TSingletonName],
  TSelectedFields extends TSingleton['TFieldNames'] = TSingleton['TFieldNames'],
  TKnownSelectedFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends SingletonBaseQueryBuilder {
  protected selectedFields: string[]
  protected populateFields: boolean = false
  protected cacheResults: boolean = false

  constructor(singletonName: TSingletonName) {
    super(singletonName)

    // Select all fields by default
    this.selectedFields = Object.keys(this.s().fields)
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `select` - Comma-separated list of fields to retrieve.
   * - `populate` - Whether to populate related fields.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .fromQueryString('select=logo,copyrightText')
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: Pick<SelectQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'select' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, false, TPopulateFields> {
    const params = queryStringToSelectQueryBuilderParams(queryString, {
      ...options,
      groupBy: false,
      orderBy: false,
      limit: false,
      offset: false,
      where: false,
    })

    if (params.select) {
      this.selectedFields = params.select.includes('*')
        ? Object.keys(singletons[this.singletonName].fields)
        : params.select
    } else if (options?.withDefaults) {
      this.selectAll()
    }

    if (options?.language !== false) {
      const normalizedQS = normalizeQueryString(queryString)
      if (isDefined(normalizedQS.language)) {
        this.languageCode = normalizedQS.language.trim() || (null as any)
      } else if (options?.withDefaults) {
        this.languageCode = null
      }
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
   * - `populate` - Whether to populate related fields.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'select=logo,copyrightText'
   * ```
   */
  toQueryString(
    options?: Pick<SelectQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'select' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults
    const initialSelect = Object.keys(singletons[this.singletonName].fields).sort()
    const currentSelect = [...this.selectedFields].sort()

    let queryString = selectQueryBuilderParamsToQueryString(
      {
        select: !deepCompare(initialSelect, currentSelect) ? this.selectedFields : wd ? ['*'] : undefined,
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      {
        ...options,
        groupBy: false,
        orderBy: false,
        limit: false,
        offset: false,
        where: false,
      },
    )

    if (options?.language !== false && this.singleton.translatable) {
      const language = this.languageCode ?? (wd ? primaryLanguage : '')
      if (language) {
        queryString += (queryString ? '&' : '') + `language=${language}`
      }
    }

    return queryString
  }

  /**
   * Computes a unique hash for the query builder's current state.
   */
  hash(): string {
    return hash({
      singleton: this.singletonName,
      selectedFields: this.selectedFields,
      languageCode: this.languageCode,
      populateFields: this.populateFields,
    })
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new SingletonSelectQueryBuilder(this.singletonName)

    clone.cache = { ...this.cache }
    clone.customContextData = { ...this.customContextData }
    clone.verboseMode = this.verboseMode
    this.preparations = [...this.preparations]

    clone.selectedFields = [...this.selectedFields]
    clone.languageCode = this.languageCode
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
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  select<TSelectedFields extends TSingleton['TFieldNames']>(
    fields: NonEmptyArray<TSelectedFields>,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TSingleton['TFieldNames']>(
    field: TSelectedFields,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TSingleton['TFieldNames']>(fields: NonEmptyArray<TSelectedFields> | TSelectedFields) {
    this.selectedFields = uniqueArray(toArray(fields))
    return this as SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, true, TPopulateFields>
  }

  /**
   * Selects all fields from the singleton.
   *
   * This method will override any previous field selection.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .selectAll()
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     primaryColor: '#ff0000',
   * //     secondaryColor: '#00ff00',
   * //     ...
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  selectAll(): SingletonSelectQueryBuilder<
    TSingletonName,
    TSingleton,
    TSingleton['TFieldNames'],
    true,
    TPopulateFields
  > {
    this.selectedFields = Object.keys(singletons[this.singletonName].fields)
    return this as any
  }

  /**
   * Specifies which translation of the singleton content should be retrieved.
   * If not set, content in the primary language will be returned.
   * Only works for singletons that have translations enabled.
   */
  language<TLanguageCode extends TSingleton['translatable'] extends true ? LanguageCode : never>(
    languageCode: TLanguageCode,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, TKnownSelectedFields, TPopulateFields> {
    this.languageCode = languageCode as any
    return this
  }

  /**
   * Specifies that the query should return populated field values.
   * Field populators transform the field value into a format suitable for application use.
   * They can retrieve related data from the database, format the value, or perform other operations.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .populate()
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: {
   * //       // @todo populated image data
   * //     },
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, TKnownSelectedFields, true> {
    this.populateFields = true
    return this as any
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .get()
   * ```
   */
  clearPopulate(): SingletonSelectQueryBuilder<
    TSingletonName,
    TSingleton,
    TSelectedFields,
    TKnownSelectedFields,
    false
  > {
    this.populateFields = true
    return this as any
  }

  /**
   * Enables automatic caching of query results using the provided `cache` object.
   * Cached results can be reused in subsequent hook executions.
   * The same `cache` object can be shared across multiple query builders.
   *
   * Note: The `_tmp` cache key is removed before executing `afterQueryExecution` hooks and returning query results.
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
   * Retrieves the singleton data from the database.
   * If no database record is found, the default field values are returned.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async get(): Promise<
    QueryBuilderResult<
      TKnownSelectedFields extends false
        ? Partial<
            TPopulateFields extends true
              ? ExtractPopulatedTypes<TSingleton['fields']>
              : ExtractCastedTypes<TSingleton['fields']>
          > &
            Record<string, any>
        : Pick<
            TPopulateFields extends true
              ? ExtractPopulatedTypes<TSingleton['fields']>
              : ExtractCastedTypes<TSingleton['fields']>,
            TSelectedFields & keyof TSingleton['fields']
          >,
      undefined
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    if (this.cacheResults) {
      const cacheKey = `_singleton:${this.hash()}`

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey]
      }
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.cacheFilter('_singleton', this.prepareError('noInputErrors'))
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.cacheFilter('_singleton', this.prepareError('noInputErrors'))
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
      return this.cacheFilter('_singleton', this.prepareError('noInputErrors'))
    }

    try {
      const { result: rows, duration: queryExecutionTime } = (await database().execWithDuration(sql, params)) as any
      const deserializedRows = await this.deserialize(isArray(rows) ? rows.map((r: any) => JSON.parse(r.value)) : [])
      const filledRows = await this.fill(deserializedRows.length ? deserializedRows : [{}], this.selectedFields)
      const populatedRows = this.populateFields ? await this.populateFieldValues(filledRows) : filledRows
      const result = this.prepareOutput(populatedRows[0])
      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult: rows, queryExecutionTime, result })
      return this.cacheFilter('_singleton', result)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return this.cacheFilter('_singleton', result)
    }
  }

  /**
   * Executes each preparation callback function sequentially.
   */
  protected async runPreparations() {
    if (this.preparations.length) {
      const context = this.createSingletonContext()

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
    if (!this.singleton) {
      return this.setRuntimeError(
        __('pruvious-api', 'The singleton `$singleton` does not exist', { singleton: this.singletonName }),
      )
    }

    if (this.selectedFields.length) {
      this.validateColumnNames(this.selectedFields)
    }

    if (!isNull(this.languageCode)) {
      if (!this.singleton.translatable) {
        this.setRuntimeError(
          __('pruvious-api', 'The singleton `$singleton` is not translatable', {
            singleton: this.singletonName,
          }),
        )
      } else if (!isValidLanguageCode(this.languageCode)) {
        this.setRuntimeError(
          __('pruvious-api', 'The language `$language` is not supported', {
            language: this.languageCode,
          }),
        )
      }
    }
  }

  /**
   * Applies all available field populators to the provided `rows` and returns a new array with the populated values.
   */
  protected async populateFieldValues(rows: any) {
    if (isArray<Record<string, any>>(rows)) {
      const populatedRows: Record<string, any>[] = []
      const fields = this.s().fields
      const context = this.createSingletonContext()
      const promises: Promise<any>[] = []

      for (const row of rows) {
        const populatedRow: Record<string, any> = {}

        for (const [fieldName, value] of Object.entries(row)) {
          const populator: Populator<any, any> | undefined = fields[fieldName]?.model.populator

          if (populator) {
            promises.push(
              populator(value, fields[fieldName]!.withContext(context as any, { path: fieldName })).then(
                (populatedValue: any) => {
                  populatedRow[fieldName] = populatedValue
                },
              ),
            )
          } else {
            populatedRow[fieldName] = value
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
   * Runs all `beforeQueryPreparation` hooks of the current `singleton`.
   */
  protected async runHooksBeforeQueryPreparation() {
    if (this.s().hooks.beforeQueryPreparation.length) {
      const context = this.createSingletonContext()

      for (const hook of this.s().hooks.beforeQueryPreparation) {
        await hook(context)
      }
    }
  }

  /**
   * Runs all `beforeQueryExecution` hooks of the current `singleton`.
   */
  protected async runHooksBeforeQueryExecution(queryDetails: Pick<QueryDetails, 'query'>) {
    if (this.s().hooks.beforeQueryExecution.length) {
      const context = this.createSingletonContext()

      for (const hook of this.s().hooks.beforeQueryExecution) {
        await hook(context, queryDetails)
      }
    }
  }

  /**
   * Runs all `afterQueryExecution` hooks of the current `singleton`.
   */
  protected async runHooksAfterQueryExecution(queryDetails: QueryDetails) {
    this.logQueryDetails(queryDetails)

    if (this.s().hooks.afterQueryExecution.length) {
      const context = this.createSingletonContext()

      for (const hook of this.s().hooks.afterQueryExecution) {
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
      database: database() as any,
      cache: this.cache,
      whereCondition: [],
      language: useEvent().context.pruvious.language,
      customData: this.customContextData,
    })
  }

  /**
   * Generates a new `SingletonContext` instance.
   */
  protected createSingletonContext(): SingletonContext {
    const context = this.createContext()
    return Object.assign(context, {
      singleton: this.singleton,
      singletonName: this.singletonName,
      singletonLanguage: this.singleton.translatable ? (this.languageCode ?? primaryLanguage) : null,
    })
  }

  protected override prepareError<T extends 'allInputErrors' | 'firstInputError' | 'noInputErrors' = 'allInputErrors'>(
    inputErrorsReturnMode?: T,
    afterQueryExecution = false,
  ) {
    const error = super.prepareError(inputErrorsReturnMode)
    this.logQueryBuilderResult(error, afterQueryExecution)
    return error
  }

  /**
   * Generates the SQL string and its corresponding parameters for the SELECT query.
   */
  protected toSQL(): {
    sql: string
    params: Record<string, any>
  } {
    const sql = `select value from "Options" where key = $key`
    const params = { key: `singleton_${this.singletonName}` }

    if (this.singleton.translatable) {
      params.key += `_${this.languageCode ?? primaryLanguage}`
    }

    this.logSQL(sql, params)

    return { sql, params }
  }
}
