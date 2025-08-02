import type { I18n } from '@pruvious/i18n'
import {
  deepClone,
  getProperty,
  isArray,
  isBoolean,
  isDefined,
  isEmpty,
  isObject,
  isPrimitive,
  isUndefined,
  omit,
  remap,
  resolveRelativeDotNotation,
  toArray,
  uniqueArray,
  type ExtractSQLParams,
  type NonEmptyArray,
} from '@pruvious/utils'
import { hash } from 'ohash'
import {
  ConditionalLogicResolver,
  extractInputFilters,
  parseConditionalLogic,
  SanitizedUpdateContext,
  UpdateContext,
  type ConditionalLogic,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type GenericCollection,
  type GenericDatabase,
  type GenericField,
  type Populator,
  type QueryDetails,
} from '../core'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import { queryStringToUpdateQueryBuilderParams, updateQueryBuilderParamsToQueryString } from './query-string'
import type {
  DefaultQueryBuilderParamsOptions,
  QueryBuilderResult,
  UpdateInput,
  UpdateQueryBuilderParamsOptions,
  ValidationResult,
} from './types'

/**
 * A utility class for constructing and executing UPDATE queries on collections in a type-safe manner.
 *
 * @example
 * ```ts
 * const updatedStudent = await this.update('Students')
 *   .set({ house: 2, prefect: true })
 *   .where('firstName', '=', 'Harry')
 *   .where('lastName', '=', 'Potter')
 *   .returning(['firstName', 'lastName', 'house', 'prefect'])
 *   .run()
 *
 * console.log(updatedStudent)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true }
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const updatedBookCount = await this.update('Books')
 *   .set({ author: 'Newt Scamander' })
 *   .where('title', '=', 'Fantastic Beasts and Where to Find Them')
 *   .run()
 *
 * console.log(updatedBookCount)
 * // {
 * //   success: true,
 * //   data: 1,
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedUpdate = await this.update('Spells')
 *   .set({ difficulty: 'Impossible' })
 *   .where('name', '=', 'Expelliarmus')
 *   .returning(['name', 'difficulty'])
 *   .run()
 *
 * console.log(failedUpdate)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: {
 * //     'difficulty': 'Invalid difficulty level',
 * //   },
 * // }
 * ```
 */
export class UpdateQueryBuilder<
  TCollections extends Record<string, GenericCollection>,
  const TCollectionName extends string,
  TCollection extends GenericCollection,
  TI18n extends I18n,
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TCollection['TColumnNames'] | 'id' = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection, TI18n> {
  public parseConditionalLogic: (
    fields: Record<string, Pick<GenericField, 'conditionalLogic' | 'model' | 'options'>>,
    input: Record<string, any>,
  ) => Record<string, ConditionalLogic | undefined>
  protected rawInput: Record<string, any> = {}
  protected sanitizedInput: Record<string, any> = {}
  protected conditionalLogicResolver = new ConditionalLogicResolver()
  protected returnType: 'rows' | 'count' = 'count'
  protected returningFields: string[] = []
  protected rawInjections: {
    afterUpdateClause?: { raw: string; params: Record<string, any> }
    afterSetClause?: { raw: string; params: Record<string, any> }
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
    this.parseConditionalLogic = parseConditionalLogic
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to populate fields after the UPDATE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
   *   .fromQueryString('returning=prefect&where=firstName[=][Harry],lastName[=][Potter]')
   *   .set({ prefect: true })
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { prefect: true },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: UpdateQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): UpdateQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToUpdateQueryBuilderParams(queryString, options)

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
   * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to populate fields after the UPDATE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.update('Students')
   *   .set({ prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returning('prefect')
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=prefect&where=firstName[=][Harry],lastName[=][Potter]'
   * ```
   */
  toQueryString(
    options?: UpdateQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    return updateQueryBuilderParamsToQueryString(
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
      sanitizedInput: this.sanitizedInput,
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
    const clone = new UpdateQueryBuilder(
      this.collections,
      this.collectionName,
      this.i18n,
      this.db,
      this.contextLanguage,
      this.logger,
    )

    clone.parseConditionalLogic = this.parseConditionalLogic
    clone.cache = { ...this.cache }
    clone.customContextData = { ...this.customContextData }
    clone.verboseMode = this.verboseMode
    this.preparations = [...this.preparations]

    clone.whereCondition = deepClone(this.whereCondition)

    clone.rawInput = deepClone(this.rawInput)
    clone.sanitizedInput = deepClone(this.sanitizedInput)
    clone.conditionalLogicResolver = this.conditionalLogicResolver.clone()
    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.rawInjections = deepClone(this.rawInjections)
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Updates specified fields of records in the current collection that match the provided conditions.
   *
   * This method will override any previously set fields.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 2, prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returning(['firstName', 'lastName', 'house', 'prefect'])
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  set(input: UpdateInput<TCollection>): this {
    this.rawInput = deepClone(input)
    this.sanitizedInput = {}
    return this
  }

  /**
   * Specifies which `fields` should be returned after the UPDATE operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 2, prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returning(['firstName', 'lastName', 'house', 'prefect'])
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields>,
  ): UpdateQueryBuilder<
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
  ): UpdateQueryBuilder<
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
    return this as UpdateQueryBuilder<
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
   * Specifies that all fields should be returned after the UPDATE operation.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 2, prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returningAll()
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     {
   * //       id: 1,
   * //       firstName: 'Harry',
   * //       middleName: null,
   * //       lastName: 'Potter',
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
  returningAll(): UpdateQueryBuilder<
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
   * This means the UPDATE operation will return the number of affected rows instead of the updated data.
   *
   * @example
   * ```ts
   * const updatedBookCount = await this.update('Books')
   *   .where('author', '=', 'Newt Scamander')
   *   .returning(['id']) // This will be ignored
   *   .clearReturning()  // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(updatedBookCount)
   * // {
   * //   success: true,
   * //   data: 1,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  clearReturning(): UpdateQueryBuilder<
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
    position: 'afterUpdateClause' | 'afterSetClause' | 'afterWhereClause' | 'afterReturningClause',
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
    position: 'all' | 'afterUpdateClause' | 'afterSetClause' | 'afterWhereClause' | 'afterReturningClause' = 'all',
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
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 1 })
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()
   *   .run()
   *
   * console.log(updatedStudent)
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
  populate(): UpdateQueryBuilder<
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
   * this.update('Students')
   *   .set({ house: 1 })
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): UpdateQueryBuilder<
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
   * Executes the UPDATE query and returns the results.
   *
   * @example
   * ```ts
   * const updatedSpell = await this.update('Spells')
   *   .set({ difficulty: 'Beginner' })
   *   .where('name', '=', 'Lumos')
   *   .returning(['name', 'difficulty'])
   *   .run()
   *
   * console.log(updatedSpell)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Lumos', difficulty: 'Beginner' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedUpdate = await this.update('Spells')
   *   .set({ difficulty: 'Advanced' })
   *   .where('name', '=', 'Hocus Pocus')
   *   .returning(['name', 'difficulty'])
   *   .run()
   *
   * console.log(failedUpdate)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: 'Spell not found',
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
      Record<string, string>
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('firstInputError')
    }

    this.validateInputType()
    this.validateParams()

    if (this.hasErrors()) {
      return this.prepareError('firstInputError')
    }

    await this.applyInputFiltersBeforeSanitization()
    await this.sanitizeInput()
    this.resolveDependencies()
    this.resolveConditionalLogic()
    await this.applyInputFiltersBeforeValidation()
    await this.validateInput()

    if (this.hasErrors()) {
      return this.prepareError('firstInputError')
    }

    await this.applyInputFiltersBeforeQueryExecution()

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('firstInputError')
    }

    const { sql, params } = await this.toSQL()
    const baseQueryDetails = {
      query: { operation: 'update', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('firstInputError')
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
      const result = this.prepareError('firstInputError', true)
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
   * Validates the input parameters and returns the validation result.
   *
   * @example
   * ```ts
   * const valid = await this.update('Spells')
   *   .set({ difficulty: 'Beginner' })
   *   .where('name', '=', 'Lumos')
   *   .returning(['name', 'difficulty'])
   *   .validate()
   *
   * console.log(valid)
   * // {
   * //   success: true,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const invalid = await this.update('Spells')
   *   .set({ difficulty: 'Advanced' })
   *   .where('name', '=', 'Hocus Pocus')
   *   .returning(['name', 'difficulty'])
   *   .validate()
   *
   * console.log(invalid)
   * // {
   * //   success: false,
   * //   runtimeError: 'Spell not found',
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async validate(): Promise<ValidationResult<Record<string, string>>> {
    const rawInput = deepClone(this.rawInput)
    const sanitizedInput = deepClone(this.sanitizedInput)
    const conditionalLogicResolver = this.conditionalLogicResolver.clone()
    const cache = { ...this.cache }
    const customContextData = { ...this.customContextData }
    const verboseMode = this.verboseMode

    let result: ValidationResult<Record<string, string>> = {
      success: true,
      runtimeError: undefined,
      inputErrors: undefined,
    }

    this.cache = {}
    this.verboseMode = 'disabled'

    await this.runPreparations()

    if (this.hasErrors()) {
      result = omit(this.prepareError('firstInputError'), ['data']) as any
    } else {
      this.validateInputType()
      this.validateParams()

      if (this.hasErrors()) {
        result = omit(this.prepareError('firstInputError'), ['data']) as any
      } else {
        await this.applyInputFiltersBeforeSanitization()
        await this.sanitizeInput()
        this.resolveDependencies()
        this.resolveConditionalLogic()
        await this.applyInputFiltersBeforeValidation()
        await this.validateInput()

        if (this.hasErrors()) {
          result = omit(this.prepareError('firstInputError'), ['data']) as any
        }
      }
    }

    this.rawInput = rawInput
    this.sanitizedInput = sanitizedInput
    this.conditionalLogicResolver = conditionalLogicResolver
    this.runtimeError = undefined
    this.inputErrors = []
    this.cache = cache
    this.customContextData = customContextData
    this.verboseMode = verboseMode

    return result
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
   * Validates the `rawInput` data before execution.
   */
  protected validateInputType() {
    if (!isObject(this.rawInput)) {
      this.setRuntimeError(this._('The input must be an object'))
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
   * Executes all `beforeInputSanitization` input filters using the provided `rawInput` data.
   */
  protected async applyInputFiltersBeforeSanitization() {
    const filters = extractInputFilters(this.c().fields, 'beforeInputSanitization')

    if (filters.length) {
      const context = this.createContext()

      for (const { callback, fieldName, field } of filters) {
        const value = await callback(this.rawInput[fieldName], field.withContext(context, { path: fieldName }))

        if (isDefined(value)) {
          this.rawInput[fieldName] = value
        } else if (isDefined(this.rawInput[fieldName])) {
          delete this.rawInput[fieldName]
        }
      }
    }
  }

  /**
   * Executes all field sanitizers defined for the collection using the provided `rawInput` data.
   */
  protected async sanitizeInput() {
    this.sanitizedInput = {}

    const context = this.createContext()

    for (const [column, value] of Object.entries(this.rawInput)) {
      if (isDefined(value)) {
        const field = this.c().fields[column]

        if (field && !field.immutable) {
          this.sanitizedInput[column] = value

          for (const sanitizer of field.model.sanitizers) {
            this.sanitizedInput[column] = await sanitizer(
              this.sanitizedInput[column],
              field.withContext(context, { path: column }),
            )
          }
        }
      }
    }
  }

  /**
   * Resolves all field dependencies for the provided `sanitizedInput` data.
   */
  protected resolveDependencies() {
    const errors: Record<string, string> = {}

    for (const column of Object.keys(this.sanitizedInput)) {
      const field = this.c().fields[column]

      if (field.dependencies.length) {
        for (const dependency of field.dependencies) {
          const referencedFieldPath = resolveRelativeDotNotation(column, dependency)

          if (isUndefined(getProperty(this.sanitizedInput, referencedFieldPath))) {
            errors[column] = this._('This field requires `$field` to be present in the input data', {
              field: referencedFieldPath,
            })
            break
          }
        }
      }
    }

    if (!isEmpty(errors)) {
      this.inputErrors[0] = { ...errors, ...this.inputErrors[0] }
    }
  }

  /**
   * Resolves all conditional logic for the provided `sanitizedInput` data.
   */
  protected resolveConditionalLogic() {
    this.conditionalLogicResolver = new ConditionalLogicResolver()
      .setInput(this.sanitizedInput)
      .setConditionalLogic(this.parseConditionalLogic(this.c().fields, this.sanitizedInput))
    this.conditionalLogicResolver.resolve()

    // Check for missing field references
    const errors: Record<string, string> = {}

    for (const column of Object.keys(this.sanitizedInput)) {
      for (const referencedFieldPath of this.conditionalLogicResolver.getReferencedFieldPaths(column)) {
        if (isUndefined(getProperty(this.sanitizedInput, referencedFieldPath))) {
          errors[column] = this._('This field requires `$field` to be present in the input data', {
            field: resolveRelativeDotNotation(column, referencedFieldPath),
          })
          break
        }
      }
    }

    if (!isEmpty(errors)) {
      this.inputErrors[0] = { ...errors, ...this.inputErrors[0] }
    }
  }

  /**
   * Executes all `beforeInputValidation` input filters using the provided `sanitizedInput` data.
   */
  protected async applyInputFiltersBeforeValidation() {
    const filters = extractInputFilters(this.c().fields, 'beforeInputValidation')

    if (filters.length) {
      const context = this.createSanitizedContext()

      for (const { callback, fieldName, field } of filters) {
        const value = await callback(
          this.sanitizedInput[fieldName],
          field.withSanitizedContext(context, {
            path: fieldName,
            conditionalLogicResolver: this.conditionalLogicResolver,
          }),
        )

        if (isDefined(value)) {
          this.sanitizedInput[fieldName] = value
        } else if (isDefined(this.sanitizedInput[fieldName])) {
          delete this.sanitizedInput[fieldName]
        }
      }
    }
  }

  /**
   * Executes all field validators using the provided `sanitizedInput` data and `conditionalLogicResolver` results.
   */
  protected async validateInput() {
    const errors: Record<string, string> = {}
    const context = this.createSanitizedContext()
    const promises: Promise<void>[] = []

    for (const [column, value] of Object.entries(this.sanitizedInput)) {
      const field = this.c().fields[column]

      promises.push(
        new Promise<void>(async (resolve) => {
          for (const validator of [...field.model.validators, ...field.validators]) {
            try {
              await validator(
                value,
                field.withSanitizedContext(context, {
                  path: column,
                  conditionalLogicResolver: this.conditionalLogicResolver,
                }),
                errors,
              )
            } catch (error: any) {
              if (error.message !== '_ignore') {
                errors[column] = error.message || this._('Invalid input')
              }
              break
            }
          }
          resolve()
        }),
      )
    }

    await Promise.all(promises)

    if (!isEmpty(errors)) {
      this.inputErrors[0] = { ...errors, ...this.inputErrors[0] }
    }
  }

  /**
   * Executes all `beforeQueryExecution` input filters using the provided `sanitizedInput` data.
   */
  protected async applyInputFiltersBeforeQueryExecution() {
    const filters = extractInputFilters(this.c().fields, 'beforeQueryExecution')

    if (filters.length) {
      const context = this.createSanitizedContext()

      for (const { callback, fieldName, field } of filters) {
        const value = await callback(
          this.sanitizedInput[fieldName],
          field.withSanitizedContext(context, {
            path: fieldName,
            conditionalLogicResolver: this.conditionalLogicResolver,
          }),
        )

        if (isDefined(value)) {
          this.sanitizedInput[fieldName] = value
        } else if (isDefined(this.sanitizedInput[fieldName])) {
          delete this.sanitizedInput[fieldName]
        }
      }
    }
  }

  /**
   * Applies all available field populators to the provided `rows` and returns a new array with the populated values.
   */
  protected async populateFieldValues(rows: any) {
    if (isArray<Record<string, any>>(rows)) {
      const populatedRows: Record<string, any>[] = []
      const fields = this.c().fields
      const context = this.createSanitizedContext()
      const promises: Promise<any>[] = []

      for (const row of rows) {
        const populatedRow: Record<string, any> = {}

        for (const [column, value] of Object.entries(row)) {
          const populator: Populator<any, any> | undefined = fields[column]?.model.populator

          if (populator) {
            promises.push(
              new Promise<void>(async (resolve) => {
                populatedRow[column] = await populator(
                  value,
                  fields[column].withSanitizedContext(context, {
                    path: column,
                    conditionalLogicResolver: this.conditionalLogicResolver,
                  }),
                )
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
      const context = this.createSanitizedContext()

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
      const context = this.createSanitizedContext()

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
      const context = this.createSanitizedContext()

      for (const hook of this.c().hooks.afterQueryExecution) {
        await hook(context, queryDetails)
      }
    }
  }

  /**
   * Generates a new `UpdateContext` instance.
   */
  protected createContext(): UpdateContext<GenericDatabase> {
    return new UpdateContext({
      queryBuilder: this as any,
      collection: this.c(),
      collectionName: this.collectionName,
      database: this.db,
      cache: this.cache,
      rawInput: this.rawInput,
      getRawInputValue: (fieldPath, appendPaths) => getProperty(this.rawInput, fieldPath, appendPaths),
      whereCondition: this.getWhereCondition(),
      language: this.contextLanguage,
      customData: this.customContextData,
    })
  }

  /**
   * Generates a new `SanitizedUpdateContext` instance.
   */
  protected createSanitizedContext(): SanitizedUpdateContext<GenericDatabase> {
    return new SanitizedUpdateContext({
      queryBuilder: this as any,
      collection: this.c(),
      collectionName: this.collectionName,
      database: this.db,
      cache: this.cache,
      rawInput: this.rawInput,
      sanitizedInput: this.sanitizedInput,
      getRawInputValue: (fieldPath, appendPaths) => getProperty(this.rawInput, fieldPath, appendPaths),
      getSanitizedInputValue: (fieldPath, appendPaths) => getProperty(this.sanitizedInput, fieldPath, appendPaths),
      whereCondition: this.getWhereCondition(),
      language: this.contextLanguage,
      customData: this.customContextData,
    })
  }

  /**
   * Generates the SQL string and its corresponding parameters for the UPDATE query.
   */
  protected async toSQL(): Promise<{ sql: string; params: Record<string, any> }> {
    const values: string[] = []
    const params: Record<string, any> = {
      ...this.rawInjections.afterUpdateClause?.params,
      ...this.rawInjections.afterSetClause?.params,
      ...this.rawInjections.afterWhereClause?.params,
      ...this.rawInjections.afterReturningClause?.params,
    }

    let i = 0

    for (const [column, value] of Object.entries(this.sanitizedInput)) {
      const field = this.c().fields[column]

      values.push(`${this.escapeIdentifier(column)} = $p${++i}`)
      try {
        params[`p${i}`] = await field.model.serializer(value)
      } catch {
        params[`p${i}`] = isPrimitive(field.default) ? field.default : JSON.stringify(field.default)
      }
    }

    if (!values.length) {
      values.push('"id" = "id"')
    }

    let sql = `update ${this.getTableIdentifier()}`
    sql += this.rawInjections.afterUpdateClause ? ` ${this.rawInjections.afterUpdateClause.raw}` : ''
    sql += ` set ${values.join(', ')}`
    sql += this.rawInjections.afterSetClause ? ` ${this.rawInjections.afterSetClause.raw}` : ''

    const where = this.whereConditionToSQL(i)
    i = where.index
    sql += where.sql
    sql += this.rawInjections.afterWhereClause ? ` ${this.rawInjections.afterWhereClause.raw}` : ''
    Object.assign(params, where.params)

    if (this.returnType === 'rows') {
      sql += ` returning ${this.getColumnIdentifiers(this.returningFields)}`
    }

    sql += this.rawInjections.afterReturningClause ? ` ${this.rawInjections.afterReturningClause.raw}` : ''

    const preparedParams = remap(params, (k, v) => [k, isBoolean(v) ? +v : v])

    this.logSQL(sql, preparedParams)

    return { sql, params: preparedParams }
  }
}
