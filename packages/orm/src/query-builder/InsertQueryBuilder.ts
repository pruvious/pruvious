import type { I18n } from '@pruvious/i18n'
import {
  deepClone,
  getProperty,
  isArray,
  isDefined,
  isEmpty,
  isObject,
  isPrimitive,
  isUndefined,
  omit,
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
  InsertContext,
  parseConditionalLogic,
  SanitizedInsertContext,
  type ConditionalLogic,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type GenericCollection,
  type GenericDatabase,
  type GenericField,
  type Populator,
  type QueryDetails,
} from '../core'
import { DerivedQueryBuilder } from './DerivedQueryBuilder'
import { insertQueryBuilderParamsToQueryString, queryStringToInsertQueryBuilderParams } from './query-string'
import type {
  DefaultQueryBuilderParamsOptions,
  InsertInput,
  InsertQueryBuilderParamsOptions,
  QueryBuilderResult,
  ValidationResult,
} from './types'

/**
 * A utility class for constructing and executing INSERT queries on collections in a type-safe manner.
 *
 * @example
 * ```ts
 * const newStudents = await this.insertInto('Students')
 *   .values([
 *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
 *     { firstName: 'Luna', lastName: 'Lovegood', house: 3 },
 *     { firstName: 'Neville', lastName: 'Longbottom', house: 1 },
 *   ])
 *   .returning(['firstName', 'lastName'])
 *   .run()
 *
 * console.log(newStudents)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Draco', lastName: 'Malfoy' },
 * //     { firstName: 'Luna', lastName: 'Lovegood' },
 * //     { firstName: 'Neville', lastName: 'Longbottom' },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const insertedBookCount = await this.insertInto('Books')
 *   .values([
 *     { title: 'Hogwarts: A History', author: 'Bathilda Bagshot' },
 *     { title: 'Fantastic Beasts and Where to Find Them', author: 'Newt Scamander' },
 *   ])
 *   .run()
 *
 * console.log(insertedBookCount)
 * // {
 * //   success: true,
 * //   data: 2,
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedInsert = await this.insertInto('Spells')
 *   .values({ name: 'Avada Kedavra' })
 *   .returning(['name'])
 *   .run()
 *
 * console.log(failedInsert)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: [{
 * //     'type': 'This field is required',
 * //     'difficulty': 'This field is required',
 * //   }],
 * // }
 * ```
 */
export class InsertQueryBuilder<
  TCollections extends Record<string, GenericCollection>,
  const TCollectionName extends string,
  TCollection extends GenericCollection,
  TI18n extends I18n,
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TCollection['TColumnNames'] | 'id' = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends DerivedQueryBuilder<TCollections, TCollectionName, TCollection, TI18n> {
  public parseConditionalLogic: (
    fields: Record<string, Pick<GenericField, 'conditionalLogic' | 'model' | 'options'>>,
    input: Record<string, any>,
  ) => Record<string, ConditionalLogic | undefined>
  protected rawInput: Record<string, any>[] = []
  protected sanitizedInput: Record<string, any>[] = []
  protected conditionalLogicResolvers: ConditionalLogicResolver[] = []
  protected returnType: 'rows' | 'count' = 'count'
  protected returningFields: string[] = []
  protected rawInjections: {
    afterInsertIntoClause?: { raw: string; params: Record<string, any> }
    afterValuesClause?: { raw: string; params: Record<string, any> }
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
   * - `returning` - Comma-separated list of fields to return after the INSERT operation.
   * - `populate` - Whether to return populated field values after the INSERT operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const newStudents = await this.insertInto('Students')
   *   .fromQueryString('returning=firstName,lastName')
   *   .values([
   *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
   *     { firstName: 'Luna', lastName: 'Lovegood', house: 3 },
   *     { firstName: 'Neville', lastName: 'Longbottom', house: 1 },
   *   ])
   *   .run()
   *
   * console.log(newStudents)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //     { firstName: 'Luna', lastName: 'Lovegood' },
   * //     { firstName: 'Neville', lastName: 'Longbottom' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: InsertQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): InsertQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TI18n,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToInsertQueryBuilderParams(queryString, options)

    if (params.returning) {
      this.returning(
        params.returning.includes('*') ? ['id', ...Object.keys(this.c().fields)] : (params.returning as any),
      )
    } else if (options?.withDefaults) {
      this.clearReturning()
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
   * - `returning` - Comma-separated list of fields to return after the INSERT operation.
   * - `populate` - Whether to return populated field values after the INSERT operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.insertInto('Students')
   *   .values([
   *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
   *     { firstName: 'Luna', lastName: 'Lovegood', house: 3 },
   *     { firstName: 'Neville', lastName: 'Longbottom', house: 1 },
   *   ])
   *   .returning(['firstName', 'lastName'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=firstName,lastName'
   * ```
   */
  toQueryString(
    options?: InsertQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    return insertQueryBuilderParamsToQueryString(
      {
        returning: this.returnType === 'rows' ? this.returningFields : undefined,
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
    const clone = new InsertQueryBuilder(
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
    clone.preparations = [...this.preparations]

    clone.rawInput = deepClone(this.rawInput)
    clone.sanitizedInput = deepClone(this.sanitizedInput)
    clone.conditionalLogicResolvers = this.conditionalLogicResolvers.map((resolver) => resolver.clone())
    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.rawInjections = deepClone(this.rawInjections)
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Sets the data to be inserted into the collection as an array of row objects.
   *
   * This method will override any previously set input data.
   *
   * @example
   * ```ts
   * const newStudents = await this.insertInto('Students')
   *   .values([
   *     { firstName: 'Harry', lastName: 'Potter', house: 1 },
   *     { firstName: 'Hermione', lastName: 'Granger', house: 1 },
   *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
   *   ])
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(newStudents)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  values<T extends InsertInput<TCollection>>(input: T[] | T): this {
    this.rawInput = deepClone(toArray(input))
    this.sanitizedInput = []
    return this
  }

  /**
   * Specifies which `fields` should be returned after the INSERT operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const newStudent = await this.insertInto('Students')
   *   .values({ firstName: 'Hermione', lastName: 'Granger', house: 1 })
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(newStudent)
   * // {
   * //   success: true,
   * //   data: [{ firstName: 'Hermione', lastName: 'Granger' }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields>,
  ): InsertQueryBuilder<
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
  ): InsertQueryBuilder<
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
    return this as InsertQueryBuilder<
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
   * Specifies that all fields should be returned after the INSERT operation.
   *
   * @example
   * ```ts
   * const newHouse = await this.insertInto('Houses')
   *   .values({ name: 'Ravenclaw', founder: 'Rowena Ravenclaw' })
   *   .returningAll()
   *   .run()
   *
   * console.log(newHouse)
   * // {
   * //   success: true,
   * //   data: [{
   * //     id: 3,
   * //     name: 'Ravenclaw',
   * //     founder: 'Rowena Ravenclaw',
   * //     createdAt: 1724091250000,
   * //     updatedAt: 1724091250000,
   * //   }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returningAll(): InsertQueryBuilder<
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
   * This means the INSERT operation will return the number of affected rows instead of the inserted data.
   *
   * @example
   * ```ts
   * const insertedBookCount = await this.insertInto('Books')
   *   .values([
   *     { title: 'Hogwarts: A History', author: 'Bathilda Bagshot' },
   *     { title: 'Fantastic Beasts and Where to Find Them', author: 'Newt Scamander' },
   *   ])
   *   .returning(['id']) // This will be ignored
   *   .clearReturning()  // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(insertedBookCount)
   * // {
   * //   success: true,
   * //   data: 2,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  clearReturning(): InsertQueryBuilder<
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
    position: 'afterInsertIntoClause' | 'afterValuesClause' | 'afterReturningClause',
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
  clearRawInjection(position: 'all' | 'afterInsertIntoClause' | 'afterValuesClause' | 'afterReturningClause' = 'all') {
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
   * const newStudent = await this.insertInto('Students')
   *   .values({ firstName: 'Hermione', lastName: 'Granger', house: 1 })
   *   .returning(['id', 'house'])
   *   .populate()
   *   .run()
   *
   * console.log(newStudent)
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
  populate(): InsertQueryBuilder<
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
   * this.insertInto('Students')
   *   .values({ firstName: 'Hermione', lastName: 'Granger', house: 1 })
   *   .returning(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): InsertQueryBuilder<
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
   * Executes the INSERT query and returns the results.
   *
   * @example
   * ```ts
   * const newSpell = await this.insertInto('Spells')
   *   .values({ name: 'Expecto Patronum', type: 'Charm', difficulty: 'Advanced' })
   *   .returning(['name'])
   *   .run()
   *
   * console.log(newSpell)
   * // {
   * //   success: true,
   * //   data: [{ name: 'Expecto Patronum' }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedInsert = await this.insertInto('Spells')
   *   .values({ name: 'Avada Kedavra' })
   *   .returning(['name'])
   *   .run()
   *
   * console.log(failedInsert)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: undefined,
   * //   inputErrors: [{
   * //     'type': 'This field is required',
   * //     'difficulty': 'This field is required',
   * //   }],
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
      Record<string, string>[]
    >
  > {
    await this.runPreparations()

    if (this.hasErrors()) {
      return this.prepareError('allInputErrors')
    }

    this.validateInputType()
    this.validateParams()

    if (this.hasErrors()) {
      return this.prepareError('allInputErrors')
    }

    await this.applyInputFiltersBeforeSanitization()
    await this.sanitizeInput()
    this.resolveDependencies()
    await this.resolveConditionalLogic()
    await this.applyInputFiltersBeforeValidation()
    await this.validateInput()

    if (this.hasErrors()) {
      return this.prepareError('allInputErrors')
    }

    await this.applyInputFiltersBeforeQueryExecution()

    try {
      await this.runHooksBeforeQueryPreparation()
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('allInputErrors')
    }

    const { sql, params } = await this.toSQL()
    const baseQueryDetails = {
      query: { operation: 'insert', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('allInputErrors')
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
      const result = this.prepareError('allInputErrors', true)
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
   * const valid = await this.insertInto('Spells')
   *   .values({ name: 'Expecto Patronum', type: 'Charm', difficulty: 'Advanced' })
   *   .returning(['name'])
   *   .validate()
   *
   * console.log(valid)
   * // {
   * //   success: true,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const invalid = await this.insertInto('Spells')
   *   .values({ name: 'Avada Kedavra' })
   *   .returning(['name'])
   *   .validate()
   *
   * console.log(invalid)
   * // {
   * //   success: false,
   * //   runtimeError: undefined,
   * //   inputErrors: [{
   * //     'type': 'This field is required',
   * //     'difficulty': 'This field is required',
   * //   }],
   * // }
   * ```
   */
  async validate(): Promise<ValidationResult<Record<string, string>[]>> {
    const rawInput = deepClone(this.rawInput)
    const sanitizedInput = deepClone(this.sanitizedInput)
    const conditionalLogicResolvers = this.conditionalLogicResolvers.map((resolver) => resolver.clone())
    const cache = { ...this.cache }
    const customContextData = { ...this.customContextData }
    const verboseMode = this.verboseMode

    let result: ValidationResult<Record<string, string>[]> = {
      success: true,
      runtimeError: undefined,
      inputErrors: undefined,
    }

    this.cache = {}
    this.verboseMode = 'disabled'

    await this.runPreparations()

    if (this.hasErrors()) {
      result = omit(this.prepareError('allInputErrors'), ['data']) as any
    } else {
      this.validateInputType()
      this.validateParams()

      if (this.hasErrors()) {
        result = omit(this.prepareError('allInputErrors'), ['data']) as any
      } else {
        await this.applyInputFiltersBeforeSanitization()
        await this.sanitizeInput()
        this.resolveDependencies()
        await this.resolveConditionalLogic()
        await this.applyInputFiltersBeforeValidation()
        await this.validateInput()

        if (this.hasErrors()) {
          result = omit(this.prepareError('allInputErrors'), ['data']) as any
        }
      }
    }

    this.rawInput = rawInput
    this.sanitizedInput = sanitizedInput
    this.conditionalLogicResolvers = conditionalLogicResolvers
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
      const context = this.createContext(-1)

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
    if (!this.rawInput.length) {
      this.setRuntimeError(this._('At least one row must be inserted'))
    } else if (!this.rawInput.every(isObject)) {
      this.setRuntimeError(this._('The input must be an object or an array of objects'))
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
  }

  /**
   * Executes all `beforeInputSanitization` input filters using the provided `rawInput` data.
   */
  protected async applyInputFiltersBeforeSanitization() {
    for (const [i, item] of this.rawInput.entries()) {
      const filters = extractInputFilters(this.c().fields, 'beforeInputSanitization')

      if (filters.length) {
        const context = this.createContext(i)

        for (const { callback, fieldName, field } of filters) {
          const value = await callback(item[fieldName], field.withContext(context, { path: fieldName }))

          if (isDefined(value)) {
            item[fieldName] = value
          } else if (isDefined(item[fieldName])) {
            delete item[fieldName]
          }
        }
      }
    }
  }

  /**
   * Executes all field sanitizers defined for the collection using the provided `rawInput` data.
   *
   * This method also fills in default values for any missing fields.
   */
  protected async sanitizeInput() {
    this.sanitizedInput = []

    for (const [i, item] of this.rawInput.entries()) {
      const sanitizedItem: Record<string, any> = {}
      const context = this.createContext(i)

      for (const [fieldName, field] of Object.entries(this.c().fields)) {
        if (isDefined(item[fieldName])) {
          sanitizedItem[fieldName] = item[fieldName]

          for (const sanitizer of field.model.sanitizers) {
            sanitizedItem[fieldName] = await sanitizer(
              sanitizedItem[fieldName],
              field.withContext(context, { path: fieldName }),
            )
          }
        } else if (!field.required) {
          sanitizedItem[fieldName] = deepClone(field.default)
        }
      }

      this.sanitizedInput.push(sanitizedItem)
    }
  }

  /**
   * Resolves all field dependencies for the provided `sanitizedInput` data.
   */
  protected resolveDependencies() {
    for (const [i, item] of this.rawInput.entries()) {
      const errors: Record<string, string> = {}

      for (const [fieldName, field] of Object.entries(this.c().fields)) {
        if (isDefined(item[fieldName]) && field.dependencies.length) {
          for (const dependency of field.dependencies) {
            const referencedFieldPath = resolveRelativeDotNotation(fieldName, dependency)

            if (isUndefined(getProperty(item, referencedFieldPath))) {
              errors[fieldName] = this._('This field requires `$field` to be present in the input data', {
                field: referencedFieldPath,
              })
              break
            }
          }
        }
      }

      if (!isEmpty(errors)) {
        this.inputErrors[i] = { ...errors, ...this.inputErrors[i] }
      }
    }
  }

  /**
   * Resolves all conditional logic for the provided `sanitizedInput` data.
   */
  protected async resolveConditionalLogic() {
    this.conditionalLogicResolvers = []

    for (const item of this.sanitizedInput.values()) {
      const resolver = new ConditionalLogicResolver()
        .setInput(item)
        .setConditionalLogic(this.parseConditionalLogic(this.c().fields, item))
      resolver.resolve()

      // Set default values for `required` fields that are missing from the input data and do not meet their conditional logic
      for (const [fieldName, field] of Object.entries(this.c().fields)) {
        if (isUndefined(item[fieldName]) && field.required && !resolver.results[fieldName]) {
          item[fieldName] = deepClone(field.default)
        }
      }

      this.conditionalLogicResolvers.push(resolver)
    }
  }

  /**
   * Executes all `beforeInputValidation` input filters using the provided `sanitizedInput` data.
   */
  protected async applyInputFiltersBeforeValidation() {
    for (const [i, item] of this.sanitizedInput.entries()) {
      const filters = extractInputFilters(this.c().fields, 'beforeInputValidation')

      if (filters.length) {
        const context = this.createSanitizedContext(i)

        for (const { callback, fieldName, field } of filters) {
          const value = await callback(
            item[fieldName],
            field.withSanitizedContext(context, {
              path: fieldName,
              conditionalLogicResolver: this.conditionalLogicResolvers[i],
            }),
          )

          if (isDefined(value)) {
            item[fieldName] = value
          } else if (isDefined(item[fieldName])) {
            delete item[fieldName]
          }
        }
      }
    }
  }

  /**
   * Executes all field validators using the `sanitizedInput` data and `conditionalLogicResolvers` results.
   */
  protected async validateInput() {
    const promises: Promise<void>[] = []

    promises.push(
      new Promise<void>(async (resolve) => {
        for (const [i, item] of this.sanitizedInput.entries()) {
          const errors: Record<string, string> = {}
          const context = this.createSanitizedContext(i)
          const promises2: Promise<void>[] = []

          for (const [fieldName, field] of Object.entries(this.c().fields)) {
            const value = item[fieldName]

            promises2.push(
              new Promise<void>(async (resolve2) => {
                for (const validator of [...field.model.validators, ...field.validators]) {
                  try {
                    await validator(
                      value,
                      field.withSanitizedContext(context, {
                        path: fieldName,
                        conditionalLogicResolver: this.conditionalLogicResolvers[i],
                      }),
                      errors,
                    )
                  } catch (error: any) {
                    if (error.message !== '_ignore') {
                      errors[fieldName] = error.message || this._('Invalid input')
                    }
                    break
                  }
                }
                resolve2()
              }),
            )
          }

          await Promise.all(promises2)

          if (!isEmpty(errors)) {
            this.inputErrors[i] = { ...errors, ...this.inputErrors[i] }
          }
        }

        resolve()
      }),
    )

    await Promise.all(promises)
  }

  /**
   * Executes all `beforeQueryExecution` input filters using the provided `sanitizedInput` data.
   */
  protected async applyInputFiltersBeforeQueryExecution() {
    for (const [i, item] of this.sanitizedInput.entries()) {
      const filters = extractInputFilters(this.c().fields, 'beforeQueryExecution')

      if (filters.length) {
        const context = this.createSanitizedContext(i)

        for (const { callback, fieldName, field } of filters) {
          const value = await callback(
            item[fieldName],
            field.withSanitizedContext(context, {
              path: fieldName,
              conditionalLogicResolver: this.conditionalLogicResolvers[i],
            }),
          )

          if (isDefined(value)) {
            item[fieldName] = value
          } else if (isDefined(item[fieldName])) {
            delete item[fieldName]
          }
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
      const promises: Promise<any>[] = []

      for (const [i, row] of rows.entries()) {
        const populatedRow: Record<string, any> = {}
        const context = this.createSanitizedContext(i)

        for (const [column, value] of Object.entries(row)) {
          const populator: Populator<any, any> | undefined = fields[column]?.model.populator

          if (populator) {
            promises.push(
              new Promise<void>(async (resolve) => {
                populatedRow[column] = await populator(
                  value,
                  fields[column].withSanitizedContext(context, {
                    path: column,
                    conditionalLogicResolver: this.conditionalLogicResolvers[i],
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
      const context = this.createSanitizedContext(-1)

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
      const context = this.createSanitizedContext(-1)

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
      const context = this.createSanitizedContext(-1)

      for (const hook of this.c().hooks.afterQueryExecution) {
        await hook(context, queryDetails)
      }
    }
  }

  /**
   * Generates a new `InsertContext` instance with an input item at the specified `inputIndex`.
   */
  protected createContext(inputIndex: number): InsertContext<GenericDatabase> {
    return new InsertContext({
      queryBuilder: this,
      collection: this.c(),
      collectionName: this.collectionName,
      database: this.db,
      cache: this.cache,
      rawInput: this.rawInput,
      inputIndex,
      getRawInputValue: (fieldPath, appendPaths) => getProperty(this.rawInput[inputIndex], fieldPath, appendPaths),
      language: this.contextLanguage,
      customData: this.customContextData,
    })
  }

  /**
   * Generates a new `SanitizedInsertContext` instance with an input item at the specified `inputIndex`.
   */
  protected createSanitizedContext(inputIndex: number): SanitizedInsertContext<GenericDatabase> {
    return new SanitizedInsertContext({
      queryBuilder: this,
      collection: this.c(),
      collectionName: this.collectionName,
      database: this.db,
      cache: this.cache,
      rawInput: this.rawInput,
      sanitizedInput: this.sanitizedInput,
      inputIndex,
      getRawInputValue: (fieldPath, appendPaths) => getProperty(this.rawInput[inputIndex], fieldPath, appendPaths),
      getSanitizedInputValue: (fieldPath, appendPaths) =>
        getProperty(this.sanitizedInput[inputIndex], fieldPath, appendPaths),
      language: this.contextLanguage,
      customData: this.customContextData,
    })
  }

  /**
   * Generates the SQL string and its corresponding parameters for the INSERT query.
   */
  protected async toSQL(): Promise<{ sql: string; params: Record<string, any> }> {
    const columns = this.getColumnIdentifiers(Object.keys(this.c().fields))
    const values: string[][] = []
    const params: Record<string, any> = {
      ...this.rawInjections.afterInsertIntoClause?.params,
      ...this.rawInjections.afterValuesClause?.params,
      ...this.rawInjections.afterReturningClause?.params,
    }

    let i = 0

    for (const inputItem of this.sanitizedInput) {
      const valuesItem: string[] = []

      for (const [fieldName, field] of Object.entries(this.c().fields)) {
        valuesItem.push(`$p${++i}`)
        try {
          params[`p${i}`] = await field.model.serializer(inputItem[fieldName] ?? null)
        } catch {
          params[`p${i}`] = isPrimitive(field.default) ? field.default : JSON.stringify(field.default)
        }
      }

      values.push(valuesItem)
    }

    const namedParams = values.map((valuesItem) => `(${valuesItem.join(', ')})`).join(', ')

    let sql = `insert into ${this.getTableIdentifier()}`
    sql += this.rawInjections.afterInsertIntoClause ? ` ${this.rawInjections.afterInsertIntoClause.raw}` : ''
    sql += columns.length ? ` (${columns}) values ${namedParams}` : ` default values`
    sql += this.rawInjections.afterValuesClause ? ` ${this.rawInjections.afterValuesClause.raw}` : ''

    if (this.returnType === 'rows') {
      sql += ` returning ${this.getColumnIdentifiers(this.returningFields)}`
    }

    sql += this.rawInjections.afterReturningClause ? ` ${this.rawInjections.afterReturningClause.raw}` : ''

    this.logSQL(sql, params)

    return { sql, params }
  }
}
