import type { I18n } from '@pruvious/i18n'
import {
  deepClone,
  isArray,
  isDefined,
  toArray,
  uniqueArray,
  type ExtractSQLParams,
  type NonEmptyArray,
} from '@pruvious/utils'
import { hash } from 'ohash'
import {
  DeleteContext,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type GenericCollection,
  type GenericDatabase,
  type Populator,
  type QueryDetails,
} from '../core'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import { deleteQueryBuilderParamsToQueryString, queryStringToDeleteQueryBuilderParams } from './query-string'
import type { DefaultQueryBuilderParamsOptions, DeleteQueryBuilderParamsOptions, QueryBuilderResult } from './types'

/**
 * A utility class for constructing and executing DELETE queries on collections in a type-safe manner.
 *
 * @example
 * ```ts
 * const deletedStudent = await this.deleteFrom('Students')
 *   .where('firstName', '=', 'Draco')
 *   .where('lastName', '=', 'Malfoy')
 *   .returning(['firstName', 'lastName'])
 *   .run()
 *
 * console.log(deletedStudent)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Draco', lastName: 'Malfoy' }
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const deletedBookCount = await this.deleteFrom('Books')
 *   .where('author', '=', 'Gilderoy Lockhart')
 *   .run()
 *
 * console.log(deletedBookCount) // 7
 *
 * const failedDelete = await this.deleteFrom('Houses')
 *   .where('name', 'Slytherin')
 *   .returning(['name'])
 *   .run()
 *
 * console.log(failedDelete)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: 'Cannot delete a Hogwarts house',
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export class DeleteQueryBuilder<
  TCollections extends Record<string, GenericCollection>,
  const TCollectionName extends string,
  TCollection extends GenericCollection,
  TI18n extends I18n,
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TCollection['TColumnNames'] | 'id' = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection, TI18n> {
  protected returnType: 'rows' | 'count' = 'count'
  protected returningFields: string[] = []
  protected rawInjections: {
    afterDeleteFromClause?: { raw: string; params: Record<string, any> }
    afterWhereClause?: { raw: string; params: Record<string, any> }
    afterReturningClause?: { raw: string; params: Record<string, any> }
  } = {}
  protected populateFields: boolean = false

  constructor(
    protected collections: TCollections,
    protected collectionName: TCollectionName,
    protected i18n: TI18n,
    protected db: GenericDatabase,
    protected contextLanguage: string,
    protected logger: (message: string, ...optionalParams: any[]) => void,
  ) {
    super(collections, collectionName, i18n, db, contextLanguage, logger)
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `returning` - Comma-separated list of fields to return after the DELETE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to return populated field values after the DELETE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .fromQueryString('returning=firstName,lastName&where=firstName[=][Draco],lastName[=][Malfoy]')
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' }
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: DeleteQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToDeleteQueryBuilderParams(queryString, options)

    if (params.returning) {
      this.returning(
        params.returning.includes('*') ? ['id', ...Object.keys(this.c().fields)] : (params.returning as any),
      )
    } else if (options?.withDefaults) {
      this.clearReturning()
    }

    if (params.where) {
      this.whereCondition = params.where
    } else if (options?.withDefaults) {
      this.clearWhere()
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
   * - `returning` - Comma-separated list of fields to return after the DELETE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to return populated field values after the DELETE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returning(['firstName', 'lastName'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=firstName,lastName&where=firstName[=][Draco],lastName[=][Malfoy]'
   * ```
   */
  toQueryString(
    options?: DeleteQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    return deleteQueryBuilderParamsToQueryString(
      {
        returning: this.returnType === 'rows' ? this.returningFields : undefined,
        where: this.whereCondition.length ? (this.whereCondition as any) : wd ? [] : undefined,
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
      whereCondition: this.whereCondition,
      returnType: this.returnType,
      returningFields: this.returningFields,
      rawInjections: this.rawInjections,
      populateFields: this.populateFields,
    })
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new DeleteQueryBuilder(
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

    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.rawInjections = deepClone(this.rawInjections)
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Specifies which `fields` should be returned after the DELETE operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields>,
  ): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'rows',
    TReturningFields,
    true,
    TPopulateFields
  >
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    field: TReturningFields,
  ): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'rows',
    TReturningFields,
    true,
    TPopulateFields
  >
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields> | TReturningFields,
  ) {
    this.returnType = 'rows'
    this.returningFields = uniqueArray(toArray(fields))
    return this as DeleteQueryBuilder<
      TCollections,
      TCollectionName,
      TCollection,
      TI18n,
      'rows',
      TReturningFields,
      true,
      TPopulateFields
    >
  }

  /**
   * Specifies that all fields should be returned after the DELETE operation.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returningAll()
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     {
   * //       id: 3,
   * //       firstName: 'Draco',
   * //       middleName: null,
   * //       lastName: 'Malfoy',
   * //       house: 2,
   * //       prefect: true,
   * //       createdAt: 1724091250000,
   * //       updatedAt: 1724091250000,
   * //     },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returningAll(): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'rows',
    TCollection['TColumnNames'] | 'id',
    true,
    TPopulateFields
  > {
    this.returnType = 'rows'
    this.returningFields = ['id', ...Object.keys(this.c().fields)]
    return this as any
  }

  /**
   * Clears any previously set RETURNING fields and sets the return type to `count`.
   * This means the DELETE operation will return the number of affected rows instead of the deleted data.
   *
   * @example
   * ```ts
   * const deletedBookCount = await this.deleteFrom('Books')
   *   .where('author', '=', 'Gilderoy Lockhart')
   *   .returning(['id']) // This will be ignored
   *   .clearReturning()  // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(deletedBookCount) // 7
   * ```
   */
  clearReturning(): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'count',
    never,
    true,
    TPopulateFields
  > {
    this.returnType = 'count'
    this.returningFields = []
    return this as any
  }

  /**
   * Injects raw SQL into the query at the specified `position`.
   *
   * Important: Ensure unique `params` names across the entire query.
   */
  injectRaw<T extends string>(
    position: 'afterDeleteFromClause' | 'afterWhereClause' | 'afterReturningClause',
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
  clearRawInjection(position: 'all' | 'afterDeleteFromClause' | 'afterWhereClause' | 'afterReturningClause' = 'all') {
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
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [{
   * //     id: 2,
   * //     house: {
   * //       id: 1,
   * //       name: 'Gryffindor',
   * //       points: 100,
   * //     },
   * //   }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
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
   * this.deleteFrom('Students')
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    false
  > {
    this.populateFields = true
    return this
  }

  /**
   * Executes the DELETE query and returns the results.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedDelete = await this.deleteFrom('Houses')
   *   .where('name', 'Slytherin')
   *   .returning(['name'])
   *   .run()
   *
   * console.log(failedDelete)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: 'Cannot delete a Hogwarts house',
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async run(): Promise<
    QueryBuilderResult<
      TReturnType extends 'count'
        ? number
        : (TKnownReturningFields extends false
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
                TReturningFields
              >)[],
      undefined
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    this.validateParams()

    if (this.hasErrors()) {
      return this.prepareError('noInputErrors')
    }

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('noInputErrors')
    }

    const { sql, params } = this.toSQL()
    const baseQueryDetails = {
      query: { operation: 'delete', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('noInputErrors')
    }

    try {
      const { result: rawResult, duration: queryExecutionTime } = (await this.db.execWithDuration(sql, params)) as any
      const deserializedResult = await this.deserialize(rawResult)
      const populatedResult = this.populateFields
        ? await this.populateFieldValues(deserializedResult)
        : deserializedResult
      const result = this.prepareOutput(populatedResult)
      await this.runHooksAfterQueryExecution({ ...baseQueryDetails, rawResult, queryExecutionTime, result })
      return result
    } catch (error: any) {
      this.setRuntimeError(error.message)
      const result = this.prepareError('noInputErrors', true)
      await this.runHooksAfterQueryExecution({
        ...baseQueryDetails,
        rawResult: error.message,
        queryExecutionTime: 0,
        result,
      })
      return result
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

    if (this.returnType === 'rows') {
      if (this.returningFields.length) {
        this.validateColumnNames(this.returningFields)
      } else {
        this.setRuntimeError(this._('At least one field must be returned'))
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
   * Generates a new `DeleteContext` instance.
   */
  protected createContext(): DeleteContext<GenericDatabase> {
    return new DeleteContext({
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
   * Generates the SQL string and its corresponding parameters for the DELETE query.
   */
  protected toSQL(): { sql: string; params: Record<string, any> } {
    let sql = `delete from ${this.getTableIdentifier()}`
    sql += this.rawInjections.afterDeleteFromClause ? ` ${this.rawInjections.afterDeleteFromClause.raw}` : ''

    const where = this.whereConditionToSQL(0)
    const params = where.params

    Object.assign(
      params,
      this.rawInjections.afterDeleteFromClause?.params,
      this.rawInjections.afterWhereClause?.params,
      this.rawInjections.afterReturningClause?.params,
    )

    sql += where.sql
    sql += this.rawInjections.afterWhereClause ? ` ${this.rawInjections.afterWhereClause.raw}` : ''

    if (this.returnType === 'rows') {
      sql += ` returning ${this.getColumnIdentifiers(this.returningFields)}`
    }

    sql += this.rawInjections.afterReturningClause ? ` ${this.rawInjections.afterReturningClause.raw}` : ''

    this.logSQL(sql, params)

    return { sql, params }
  }
}
