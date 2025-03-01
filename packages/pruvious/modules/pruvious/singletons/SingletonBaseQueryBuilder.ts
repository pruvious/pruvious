import {
  __,
  singletons,
  type GenericSingleton,
  type LanguageCode,
  type SingletonContext,
  type Singletons,
} from '#pruvious/server'
import type { QueryBuilderError, QueryBuilderOutput, QueryBuilderResult, QueryDetails } from '@pruvious/orm'
import { anonymizeObject, deepClone, isArray, isDefined, isEmpty, isUndefined } from '@pruvious/utils'
import { debug } from '../debug/console'

export interface SingletonQueryBuilderParamsOptions {
  /**
   * Controls whether the populate parameter can be used in the query.
   *
   * @default true
   */
  language?: boolean
}

export type SingletonQueryBuilderPrepareCallback = (context: SingletonContext) => any

export class SingletonBaseQueryBuilder {
  protected singleton: GenericSingleton
  protected languageCode: LanguageCode | null = null
  protected customContextData: Record<string, any> = {}
  protected verboseMode: 'disabled' | 'anonymized' | 'all' = 'disabled'
  protected preparations: SingletonQueryBuilderPrepareCallback[] = []

  protected runtimeError?: string
  protected inputErrors: Record<string, string>[] = []
  protected cache: Record<string, any> = {}

  constructor(protected singletonName: keyof Singletons) {
    this.singleton = singletons[singletonName] as any
  }

  /**
   * Retrieves the current `singleton` as a `GenericSingleton`.
   */
  protected s(): GenericSingleton {
    return (
      this.singleton ?? {
        fields: {},
        hooks: { beforeQueryPreparation: [], beforeQueryExecution: [], afterQueryExecution: [] },
      }
    )
  }

  /**
   * Adds custom context data to the current query builder.
   * The provided `customData` object is shallow-merged with the existing one.
   *
   * This data is passed to all field hooks as `context.customData`.
   * Use this to provide additional information to hooks that isn't available in the query builder.
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
   * await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .verbose()
   *   .get()
   *
   * // Executing query (anonymized)
   * // > select @todo
   * // Output (anonymized)
   * // > {
   * // >   "logo": "number",
   * // >   "copyrightText": "string"
   * // > }
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
   * await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .verbose() // This will be ignored
   *   .silent()  // This will disable logging
   *   .get()
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
   * The callback runs prior to query execution methods like `get()`, `run()`, and `validate()`.
   *
   * Callbacks may throw an error to halt query execution and return a `QueryBuilderRuntimeError`.
   *
   * Multiple preparation callbacks can be added and will execute in registration order.
   *
   * @example
   * ```ts
   * const allowInsert = false
   *
   * await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .prepare(({ _, customData }) => {
   *     if (customData.abort) {
   *       throw new Error(_('This action is not allowed'))
   *     }
   *   })
   *   .get()
   * ```
   */
  prepare(callback: SingletonQueryBuilderPrepareCallback) {
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
   * Validates the `columns` to ensure they exist in the current `singleton`.
   */
  protected validateColumnNames(columns: string[]) {
    if (isUndefined(this.runtimeError)) {
      for (const column of columns) {
        if (column !== 'id' && !this.s().fields[column]) {
          return this.setRuntimeError(__('pruvious-orm', 'The field `$field` does not exist', { field: column }))
        }
      }
    }
  }

  /**
   * Sets a runtime error message if one does not already exist.
   */
  protected setRuntimeError(message: string) {
    if (isUndefined(this.runtimeError)) {
      this.runtimeError = message
    }
  }

  /**
   * Sets a field-specific input error message at the specified index.
   * If an error already exists for the field, it is not overwritten.
   *
   * @param index The index matching the input array order.
   * @param fieldPath The field path using dot notation.
   * @param message The error message.
   *
   * @example
   * ```ts
   * this.setInputError(0, 'firstName', 'This field is required')
   * this.setInputError(0, 'notes.0.text', 'This field is required')
   * this.setInputError(2, 'firstName', 'This field is required')
   * ```
   */
  protected setInputError(index: number, fieldPath: string, message: string) {
    const inputErrors = this.inputErrors[index] || {}

    if (isUndefined(inputErrors[fieldPath])) {
      inputErrors[fieldPath] = message
    }
  }

  /**
   * Checks if the form has any errors.
   */
  protected hasErrors() {
    return isDefined(this.runtimeError) || this.inputErrors.length > 0
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
      const fields = this.s().fields

      for (const row of rows) {
        const deserializedRow: Record<string, any> = {}

        for (const [column, value] of Object.entries(row)) {
          if (fields[column]) {
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

  /**
   * Fills in missing fields with their default values.
   */
  protected fill(rows: any, fieldNames: string[]) {
    if (isArray<Record<string, any>>(rows)) {
      const filledRows: Record<string, any>[] = []
      const fields = this.s().fields

      for (const row of rows) {
        const filledRow: Record<string, any> = {}

        for (const fieldName of fieldNames) {
          if (fields[fieldName]) {
            filledRow[fieldName] = isDefined(row[fieldName]) ? row[fieldName] : deepClone(fields[fieldName].default)
          }
        }

        filledRows.push(filledRow)
      }

      return filledRows
    }

    return rows
  }

  /**
   * Creates a `QueryBuilderOutput` object to return if the query is successful.
   */
  protected prepareOutput<T>(data: T): QueryBuilderOutput<T> {
    delete this.cache['__tmp']

    return {
      success: true,
      data,
      runtimeError: undefined,
      inputErrors: undefined,
    }
  }

  /**
   * Creates a `QueryBuilderError` object to return if the query fails or is invalid.
   * If `first` is `true`, only the first input error is returned.
   * By default, all input errors are returned as an array.
   */
  protected prepareError<T extends 'allInputErrors' | 'firstInputError' | 'noInputErrors' = 'allInputErrors'>(
    inputErrorsReturnMode?: T,
  ) {
    delete this.cache['__tmp']

    return {
      success: false,
      data: undefined,
      runtimeError: this.runtimeError,
      inputErrors:
        isDefined(this.runtimeError) || inputErrorsReturnMode === 'noInputErrors'
          ? undefined
          : inputErrorsReturnMode === 'firstInputError'
            ? (this.inputErrors[0] ?? {})
            : this.inputErrors,
    } as QueryBuilderError<
      T extends 'firstInputError'
        ? Record<string, string>
        : T extends 'noInputErrors'
          ? undefined
          : Record<string, string>[]
    >
  }

  /**
   * Logs the SQL query and its parameters to the console if the `verboseMode` is not `disabled`.
   */
  protected logSQL(sql: string, params: Record<string, any>) {
    if (this.verboseMode === 'disabled') {
      return
    }

    debug(`Executing query`, this.verboseMode === 'anonymized' ? '(anonymized)' : '')
    debug(`> ${sql}`)

    const outputParams = this.verboseMode === 'anonymized' ? anonymizeObject(params) : params
    const hasParameters = !isEmpty(outputParams)

    if (hasParameters) {
      JSON.stringify(outputParams, null, 2)
        .split('\n')
        .forEach((param) => debug(`> ${param}`))
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
      debug(`Output`, this.verboseMode === 'anonymized' ? '(anonymized)' : '')
      const output = this.verboseMode === 'anonymized' ? anonymizeObject(result.data) : result.data
      JSON.stringify(output, null, 2)
        .split('\n')
        .forEach((line) => debug(`> ${line}`))
    } else {
      if (result.runtimeError) {
        debug(afterQueryExecution ? `Query failed with runtime error` : `Query not executed due to runtime error`)
        debug(`> ${result.runtimeError}`)
      } else {
        debug(`Query not executed due to input errors`)
        JSON.stringify(result.inputErrors, null, 2)
          .split('\n')
          .forEach((line) => debug(`> ${line}`))
      }
    }
  }

  /**
   * Logs the details of the executed query to the console if the `verboseMode` is not `disabled`.
   */
  protected logQueryDetails(queryDetails: QueryDetails) {
    if (this.verboseMode !== 'disabled' && queryDetails.result.success) {
      debug(`Query executed in ${Math.round(queryDetails.queryExecutionTime * 100) / 100}ms`)
    }
  }
}
