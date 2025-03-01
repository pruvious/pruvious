import type {
  ExtractHandlesByDomainAndLanguage,
  ExtractInput,
  I18n,
  TranslatableStringsDefinition,
} from '@pruvious/i18n'
import { anonymizeObject, deepClone, isArray, isEmpty, isUndefined } from '@pruvious/utils'
import type { GenericCollection, GenericDatabase, QueryDetails } from '../core'
import { BaseQueryBuilder } from './BaseQueryBuilder'
import type { i18n, translatableStrings } from './i18n'
import type { QueryBuilderOutput, QueryBuilderPrepareCallback, QueryBuilderResult } from './types'

export class DerivedQueryBuilder<
  TCollections extends Record<string, GenericCollection>,
  const TCollectionName extends string,
  TCollection extends GenericCollection,
  TI18n extends I18n,
> extends BaseQueryBuilder<TCollections> {
  protected collection: TCollection
  protected customContextData: Record<string, any> = {}
  protected verboseMode: 'disabled' | 'anonymized' | 'all' = 'disabled'
  protected preparations: QueryBuilderPrepareCallback[] = []

  constructor(
    protected collections: TCollections,
    protected collectionName: TCollectionName,
    protected i18n: TI18n,
    protected db: GenericDatabase,
    protected contextLanguage: string,
    protected logger: (message: string, ...optionalParams: any[]) => void,
  ) {
    super(collections)
    this.collection = this.collections[collectionName] as any
  }

  /**
   * Retrieves the current `collection` as a `GenericCollection`.
   */
  protected c(): GenericCollection {
    return (
      this.collection ?? {
        fields: {},
        hooks: { beforeQueryPreparation: [], beforeQueryExecution: [], afterQueryExecution: [] },
      }
    )
  }

  /**
   * Retrieves a translated string from the `pruvious-orm` domain by its `handle` and optional `input` parameters.
   *
   * The language is automatically resolved based on the `contextLanguage` property.
   */
  protected _<
    THandle extends ExtractHandlesByDomainAndLanguage<
      string,
      string,
      TranslatableStringsDefinition<string, string, typeof translatableStrings>[]
    >,
    TInput extends ExtractInput<
      string,
      string,
      THandle & string,
      TranslatableStringsDefinition<string, string, typeof translatableStrings>[]
    >,
  >(handle: THandle, input?: TInput): string {
    return (this.i18n as typeof i18n).__('pruvious-orm', this.contextLanguage as any, handle as any, input as any)
  }

  /**
   * Adds custom context data to the current query builder.
   * The provided `customData` object is shallow-merged with the existing one.
   *
   * This data is passed to all collection and field hooks as `context.customData`.
   * Use this to provide additional information to hooks that isn't available in the query builder.
   *
   * @example
   * ```ts
   * await this.selectFrom('Users')
   *   .select(['email', 'password'])
   *   .withCustomContextData({ __ignoreMaskFieldsHook: true })
   *   .all()
   * ```
   */
  withCustomContextData(customData: Record<string, any>) {
    this.customContextData = { ...this.customContextData, ...customData }
    return this
  }

  /**
   * Clears all custom context data from the current query builder.
   */
  clearCustomContextData() {
    this.customContextData = {}
    return this
  }

  /**
   * Enables console logging of the query and its results.
   *
   * The `exposeData` option determines if query parameters and results should be shown in the output.
   * When `false` (default), parameters and results are replaced with their types.
   * When `true`, actual values are shown.
   * Use caution when setting `exposeData` to `true` in production environments, as it may display sensitive data.
   *
   * @example
   * ```ts
   * await this.selectFrom('Students')
   *   .select(['id', 'firstName', 'lastName'])
   *   .where('house', '=', 1)
   *   .verbose()
   *   .all()
   *
   * // Executing query (anonymized)
   * // > select "firstName", "lastName" from "Students" where "house" = $p1'
   * // > {
   * // >   "p1": "number"
   * // > }
   * // Output (anonymized)
   * // > [
   * // >   {
   * // >     "id": "number",
   * // >     "firstName": "string",
   * // >     "lastName": "string"
   * // >   }
   * // > ]
   * // Query executed in 0.07ms
   * ```
   */
  verbose(exposeData = false) {
    this.verboseMode = exposeData ? 'all' : 'anonymized'
    return this
  }

  /**
   * Suppresses all console logging for query execution.
   *
   * @example
   * ```ts
   * await this.selectFrom('Students')
   *   .select(['id', 'firstName', 'lastName'])
   *   .where('house', '=', 1)
   *   .verbose() // This will be ignored
   *   .silent()  // This will disable logging
   *   .all()
   *
   * // No console output
   * ```
   */
  silent() {
    this.verboseMode = 'disabled'
    return this
  }

  /**
   * Registers a preparation `callback` function that executes before any query operations.
   * The callback runs prior to query execution methods like `first()`, `run()`, `validate()` and others.
   *
   * Callbacks may throw an error to halt query execution and return a `QueryBuilderRuntimeError`.
   *
   * Multiple preparation callbacks can be added and will execute in registration order.
   *
   * @example
   * ```ts
   * const allowInsert = false
   *
   * await this.selectFrom('Students')
   *   .prepare(({ _, operation }) => {
   *     if (operation === 'insert' && !allowInsert) {
   *       throw new Error(_('This action is not allowed'))
   *     }
   *   })
   *   .all()
   * ```
   */
  prepare(callback: QueryBuilderPrepareCallback) {
    this.preparations.push(callback)
    return this
  }

  /**
   * Clears all preparation callbacks registered with the `prepare()` method.
   */
  clearPreparations() {
    this.preparations = []
    return this
  }

  /**
   * Validates the `columns` to ensure they exist in the current `collection`.
   */
  protected validateColumnNames(columns: string[]) {
    if (isUndefined(this.runtimeError)) {
      for (const column of columns) {
        if (column !== 'id' && !this.c().fields[column]) {
          return this.setRuntimeError(this._('The field `$field` does not exist', { field: column }))
        }
      }
    }
  }

  /**
   * Retrieves the table identifier of the current `collection`.
   */
  protected getTableIdentifier() {
    return this.escapeIdentifier(this.collectionName)
  }

  /**
   * Retrieves the column identifiers of the given `columns`.
   */
  protected getColumnIdentifiers(columns: string[]) {
    return columns.map(this.escapeIdentifier).join(', ')
  }

  /**
   * Prepares an `identifier` for use in a SQL query.
   */
  protected escapeIdentifier(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`
  }

  /**
   * Applies all field deserializers to the provided `rows` and returns the deserialized data.
   */
  protected async deserialize(rows: any) {
    if (isArray<Record<string, any>>(rows)) {
      const deserializedRows: Record<string, any>[] = []
      const fields = this.c().fields

      for (const row of rows) {
        const deserializedRow: Record<string, any> = {}

        for (const [column, value] of Object.entries(row)) {
          if (column === 'id') {
            deserializedRow.id = Number(row.id)
          } else if (fields[column]) {
            try {
              deserializedRow[column] = await fields[column].model.deserializer(value)
            } catch {
              deserializedRow[column] = deepClone(fields[column].default)
            }
          } else {
            deserializedRow[column] = value
          }
        }

        deserializedRows.push(deserializedRow)
      }

      return deserializedRows
    }

    return rows
  }

  protected prepareOutput<T>(data: T): QueryBuilderOutput<T> {
    const output = super.prepareOutput(data)
    this.logQueryBuilderResult(output)
    return output
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
   * Logs the SQL query and its parameters to the console if the `verboseMode` is not `disabled`.
   */
  protected logSQL(sql: string, params: Record<string, any>) {
    if (this.verboseMode === 'disabled') {
      return
    }

    this.logger(`Executing query`, this.verboseMode === 'anonymized' ? '(anonymized)' : '')
    this.logger(`> ${sql}`)

    const outputParams = this.verboseMode === 'anonymized' ? anonymizeObject(params) : params
    const hasParameters = !isEmpty(outputParams)

    if (hasParameters) {
      JSON.stringify(outputParams, null, 2)
        .split('\n')
        .forEach((param) => this.logger(`> ${param}`))
    }
  }

  /**
   * Logs the result of the query builder to the console if the `verboseMode` is not `disabled`.
   */
  protected logQueryBuilderResult(
    result: QueryBuilderResult<any, Record<string, string> | Record<string, string>[]>,
    afterQueryExecution = false,
  ) {
    if (this.verboseMode === 'disabled') {
      return
    }

    if (result.success) {
      this.logger(`Output`, this.verboseMode === 'anonymized' ? '(anonymized)' : '')
      const output = this.verboseMode === 'anonymized' ? anonymizeObject(result.data) : result.data
      JSON.stringify(output, null, 2)
        .split('\n')
        .forEach((line) => this.logger(`> ${line}`))
    } else {
      if (result.runtimeError) {
        this.logger(afterQueryExecution ? `Query failed with runtime error` : `Query not executed due to runtime error`)
        this.logger(`> ${result.runtimeError}`)
      } else {
        this.logger(`Query not executed due to input errors`)
        JSON.stringify(result.inputErrors, null, 2)
          .split('\n')
          .forEach((line) => this.logger(`> ${line}`))
      }
    }
  }

  /**
   * Logs the details of the executed query to the console if the `verboseMode` is not `disabled`.
   */
  protected logQueryDetails(queryDetails: QueryDetails) {
    if (this.verboseMode !== 'disabled' && queryDetails.result.success) {
      this.logger(`Query executed in ${Math.round(queryDetails.queryExecutionTime * 100) / 100}ms`)
    }
  }
}
