import {
  __,
  database,
  isValidLanguageCode,
  primaryLanguage,
  type GenericDatabase,
  type LanguageCode,
  type SingletonContext,
  type Singletons,
} from '#pruvious/server'
import {
  ConditionalLogicResolver,
  extractInputFilters,
  normalizeQueryString,
  parseConditionalLogic,
  queryStringToUpdateQueryBuilderParams,
  SanitizedUpdateContext,
  UpdateContext,
  updateQueryBuilderParamsToQueryString,
  type DefaultQueryBuilderParamsOptions,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type Populator,
  type QueryBuilderResult,
  type QueryDetails,
  type UpdateInput,
  type UpdateQueryBuilderParamsOptions,
  type ValidationResult,
} from '@pruvious/orm'
import {
  deepClone,
  getProperty,
  isArray,
  isDefined,
  isEmpty,
  isNull,
  isObject,
  isUndefined,
  omit,
  resolveRelativeDotNotation,
  toArray,
  uniqueArray,
  type NonEmptyArray,
} from '@pruvious/utils'
import { hash } from 'ohash'
import { SingletonBaseQueryBuilder, type SingletonQueryBuilderParamsOptions } from './SingletonBaseQueryBuilder'

/**
 * A utility class for constructing and executing UPDATE queries on singletons in a type-safe manner.
 *
 * @example
 * ```ts
 * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
 *   .set({ logo: 456 })
 *   .returning(['logo', 'copyrightText'])
 *   .run()
 *
 * console.log(updatedThemeOptions)
 * // {
 * //   success: true,
 * //   data: {
 * //     logo: 456,
 * //     copyrightText: '© 2025 Example Inc.',
 * //   },
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedUpdate = await new SingletonUpdateQueryBuilder('ThemeOptions')
 *   .set({ logo: 'foo' })
 *   .returning(['logo', 'copyrightText'])
 *   .run()
 *
 * console.log(failedUpdate)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: {
 * //     'logo': 'The value must be a number or `null`',
 * //   },
 * // }
 * ```
 */
export class SingletonUpdateQueryBuilder<
  const TSingletonName extends keyof Singletons,
  TSingleton extends Singletons[TSingletonName] = Singletons[TSingletonName],
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TSingleton['TFieldNames'] = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends SingletonBaseQueryBuilder {
  protected rawInput: Record<string, any> = {}
  protected sanitizedInput: Record<string, any> = {}
  protected conditionalLogicResolver = new ConditionalLogicResolver()
  protected returnType: 'rows' | 'count' = 'count'
  protected returningFields: string[] = []
  protected populateFields: boolean = false

  constructor(singletonName: TSingletonName) {
    super(singletonName)
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
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('Student')
   *   .fromQueryString('returning=logo,copyrightText')
   *   .set({ logo: 456 })
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: Pick<UpdateQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'returning' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToUpdateQueryBuilderParams(queryString, { ...options, where: false })

    if (options?.language !== false) {
      const normalizedQS = normalizeQueryString(queryString)
      if (isDefined(normalizedQS.language)) {
        this.languageCode = normalizedQS.language.trim() || (null as any)
      } else if (options?.withDefaults) {
        this.languageCode = null
      }
    }

    if (params.returning) {
      this.returning(params.returning.includes('*') ? Object.keys(this.s().fields) : (params.returning as any))
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
   * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
   * - `populate` - Whether to populate fields after the UPDATE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = new SingletonUpdateQueryBuilder('Student')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=logo,copyrightText'
   * ```
   */
  toQueryString(
    options?: Pick<UpdateQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'returning' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    let queryString = updateQueryBuilderParamsToQueryString(
      {
        returning: this.returnType === 'rows' ? this.returningFields : undefined,
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      { ...options, where: false },
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
      sanitizedInput: this.sanitizedInput,
      languageCode: this.languageCode,
      returnType: this.returnType,
      returningFields: this.returningFields,
      populateFields: this.populateFields,
    })
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new SingletonUpdateQueryBuilder(this.singletonName)

    clone.cache = { ...this.cache }
    clone.customContextData = { ...this.customContextData }
    clone.verboseMode = this.verboseMode
    this.preparations = [...this.preparations]

    clone.rawInput = deepClone(this.rawInput)
    clone.sanitizedInput = deepClone(this.sanitizedInput)
    clone.conditionalLogicResolver = this.conditionalLogicResolver.clone()
    clone.languageCode = this.languageCode
    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Updates specific fields in the current singleton.
   *
   * This method will override any previously set fields.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  set(input: UpdateInput<TSingleton>): this {
    this.rawInput = deepClone(input)
    this.sanitizedInput = {}
    return this
  }

  /**
   * Specifies which translation of the singleton content should be updated.
   * If not set, content in the primary language will be updated.
   * Only works for singletons that have translations enabled.
   */
  language<TLanguageCode extends TSingleton['translatable'] extends true ? LanguageCode : never>(
    languageCode: TLanguageCode,
  ): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    TPopulateFields
  > {
    this.languageCode = languageCode as any
    return this
  }

  /**
   * Specifies which `fields` should be returned after the UPDATE operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TSingleton['TFieldNames']>(
    fields: NonEmptyArray<TReturningFields>,
  ): SingletonUpdateQueryBuilder<TSingletonName, TSingleton, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TSingleton['TFieldNames']>(
    field: TReturningFields,
  ): SingletonUpdateQueryBuilder<TSingletonName, TSingleton, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TSingleton['TFieldNames']>(
    fields: NonEmptyArray<TReturningFields> | TReturningFields,
  ) {
    this.returnType = 'rows'
    this.returningFields = uniqueArray(toArray(fields))
    return this as SingletonUpdateQueryBuilder<
      TSingletonName,
      TSingleton,
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
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returningAll()
   *   .run()
   *
   * console.log(updatedThemeOptions)
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
  returningAll(): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    'rows',
    TSingleton['TFieldNames'],
    true,
    TPopulateFields
  > {
    this.returnType = 'rows'
    this.returningFields = Object.keys(this.s().fields)
    return this as any
  }

  /**
   * Clears any previously set RETURNING fields and sets the return type to `count`.
   * This means the UPDATE operation will return the number of affected rows instead of the updated data.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .returning(['logo']) // This will be ignored
   *   .clearReturning()    // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: 1,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  clearReturning(): SingletonUpdateQueryBuilder<TSingletonName, TSingleton, 'count', never, false, TPopulateFields> {
    this.returnType = 'count'
    this.returningFields = []
    return this as any
  }

  /**
   * Specifies that the query should return populated field values.
   * Field populators transform the field value into a format suitable for application use.
   * They can retrieve related data from the database, format the value, or perform other operations.
   *
   * @example
   * ```ts
   * const updateThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .populate()
   *   .run()
   *
   * console.log(updateThemeOptions)
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
  populate(): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    true
  > {
    this.populateFields = true
    return this as any
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * new SingletonUpdateQueryBuilder('Student')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    false
  > {
    this.populateFields = true
    return this as any
  }

  /**
   * Executes the UPDATE query and returns the results.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedUpdate = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 'foo' })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(failedUpdate)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: undefined,
   * //   inputErrors: {
   * //     'logo': 'The value must be a number or `null`',
   * //   },
   * // }
   * ```
   */
  async run(): Promise<
    QueryBuilderResult<
      TReturnType extends 'count'
        ? number
        : TKnownReturningFields extends false
          ? Partial<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TSingleton['fields']>
                : ExtractCastedTypes<TSingleton['fields']>) & { id: number }
            > &
              Record<string, any>
          : Pick<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TSingleton['fields']>
                : ExtractCastedTypes<TSingleton['fields']>) & { id: number },
              TReturningFields & (keyof TSingleton['fields'] | 'id')
            >,
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
      query: { operation: 'insert', sql, params },
      customData: this.customContextData,
    } as const

    try {
      await this.runHooksBeforeQueryExecution(baseQueryDetails)
    } catch (error: any) {
      this.setRuntimeError(error.message)
      return this.prepareError('firstInputError')
    }

    try {
      const { result: rawResult, duration: queryExecutionTime } = (await database().execWithDuration(
        sql,
        params,
      )) as any
      const deserializedResult = await this.deserialize(
        isArray(rawResult) ? rawResult.map((r: any) => JSON.parse(r.value)) : [],
      )
      let result: any
      if (this.returnType === 'count') {
        result = this.prepareOutput(deserializedResult.length)
      } else {
        const filledResult = await this.fill(
          deserializedResult.length ? deserializedResult : [{}],
          this.returningFields,
        )
        const populatedResult = this.populateFields ? await this.populateFieldValues(filledResult) : filledResult
        result = this.prepareOutput(populatedResult[0])
      }
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
   * const valid = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .validate()
   *
   * console.log(valid)
   * // {
   * //   success: true,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const invalid = await new SingletonUpdateQueryBuilder('ThemeOptions')')
   *   .set({ logo: 'foo' })
   *   .validate()
   *
   * console.log(invalid)
   * // {
   * //   success: false,
   * //   runtimeError: undefined,
   * //   inputErrors: {
   * //     'logo': 'The value must be a number or `null`',
   * //   },
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
   * Validates the `rawInput` data before execution.
   */
  protected validateInputType() {
    if (!isObject(this.rawInput)) {
      this.setRuntimeError(__('pruvious-orm', 'The input must be an object'))
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

    if (this.returnType === 'rows') {
      if (this.returningFields.length) {
        this.validateColumnNames(this.returningFields)
      } else {
        this.setRuntimeError(__('pruvious-orm', 'At least one field must be returned'))
      }
    }
  }

  /**
   * Executes all `beforeInputSanitization` input filters using the provided `rawInput` data.
   */
  protected async applyInputFiltersBeforeSanitization() {
    const filters = extractInputFilters(this.s().fields, 'beforeInputSanitization')

    if (filters.length) {
      const context = this.createSingletonContext()

      for (const { callback, fieldName, field } of filters) {
        const value = await callback(this.rawInput[fieldName], field.withContext(context as any, { path: fieldName }))

        if (isDefined(value)) {
          this.rawInput[fieldName] = value
        } else if (isDefined(this.rawInput[fieldName])) {
          delete this.rawInput[fieldName]
        }
      }
    }
  }

  /**
   * Executes all field sanitizers defined for the singleton using the provided `rawInput` data.
   */
  protected async sanitizeInput() {
    this.sanitizedInput = {}

    const context = this.createSingletonContext()

    for (const [fieldName, value] of Object.entries(this.rawInput)) {
      if (isDefined(value)) {
        const field = this.s().fields[fieldName]

        if (field && !field.immutable) {
          this.sanitizedInput[fieldName] = value

          for (const sanitizer of field.model.sanitizers) {
            this.sanitizedInput[fieldName] = await sanitizer(
              this.sanitizedInput[fieldName],
              field.withContext(context as any, { path: fieldName }),
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

    for (const fieldName of Object.keys(this.sanitizedInput)) {
      const field = this.s().fields[fieldName]!

      if (field.dependencies.length) {
        for (const dependency of field.dependencies) {
          const referencedFieldPath = resolveRelativeDotNotation(fieldName, dependency)

          if (isUndefined(getProperty(this.sanitizedInput, referencedFieldPath))) {
            errors[fieldName] = __('pruvious-orm', 'This field requires `$field` to be present in the input data', {
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
      .setConditionalLogic(parseConditionalLogic(this.s().fields, this.sanitizedInput))
    this.conditionalLogicResolver.resolve()

    // Check for missing field references
    const errors: Record<string, string> = {}

    for (const fieldName of Object.keys(this.sanitizedInput)) {
      for (const referencedFieldPath of this.conditionalLogicResolver.getReferencedFieldPaths(fieldName)) {
        if (isUndefined(getProperty(this.sanitizedInput, referencedFieldPath))) {
          errors[fieldName] = __('pruvious-orm', 'This field requires `$field` to be present in the input data', {
            field: resolveRelativeDotNotation(fieldName, referencedFieldPath),
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
    const filters = extractInputFilters(this.s().fields, 'beforeInputValidation')

    if (filters.length) {
      const context = this.createSanitizedSingletonContext()

      for (const { callback, fieldName, field } of filters) {
        const value = await callback(
          this.sanitizedInput[fieldName],
          field.withSanitizedContext(context as any, {
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
    const context = this.createSanitizedSingletonContext()
    const promises: Promise<void>[] = []

    for (const [fieldName, value] of Object.entries(this.sanitizedInput)) {
      const field = this.s().fields[fieldName]!

      promises.push(
        new Promise<void>(async (resolve) => {
          for (const validator of [...field.model.validators, ...field.validators]) {
            try {
              await validator(
                value,
                field.withSanitizedContext(context as any, {
                  path: fieldName,
                  conditionalLogicResolver: this.conditionalLogicResolver,
                }),
                errors,
              )
            } catch (error: any) {
              if (error.message !== '__ignore') {
                errors[fieldName] = error.message || __('pruvious-orm', 'Invalid input')
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
    const filters = extractInputFilters(this.s().fields, 'beforeQueryExecution')

    if (filters.length) {
      const context = this.createSanitizedSingletonContext()

      for (const { callback, fieldName, field } of filters) {
        const value = await callback(
          this.sanitizedInput[fieldName],
          field.withSanitizedContext(context as any, {
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
      const fields = this.s().fields
      const context = this.createSanitizedSingletonContext()
      const promises: Promise<any>[] = []

      for (const row of rows) {
        const populatedRow: Record<string, any> = {}

        for (const [fieldName, value] of Object.entries(row)) {
          const populator: Populator<any, any> | undefined = fields[fieldName]?.model.populator

          if (populator) {
            promises.push(
              new Promise<void>(async (resolve) => {
                populatedRow[fieldName] = await populator(
                  value,
                  fields[fieldName]!.withSanitizedContext(context as any, {
                    path: fieldName,
                    conditionalLogicResolver: this.conditionalLogicResolver,
                  }),
                )
                resolve()
              }),
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
      const context = this.createSanitizedSingletonContext()

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
      const context = this.createSanitizedSingletonContext()

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
      const context = this.createSanitizedSingletonContext()

      for (const hook of this.s().hooks.afterQueryExecution) {
        await hook(context, queryDetails)
      }
    }
  }

  /**
   * Generates a new `UpdateContext` instance.
   */
  protected createContext(): UpdateContext<GenericDatabase> {
    return new UpdateContext({
      database: database() as any,
      cache: this.cache,
      rawInput: this.rawInput,
      getRawInputValue: (fieldPath, appendPaths) => getProperty(this.rawInput, fieldPath, appendPaths),
      whereCondition: [],
      language: useEvent().context.pruvious.language,
      customData: this.customContextData,
    })
  }

  /**
   * Generates a new `SanitizedUpdateContext` instance.
   */
  protected createSanitizedContext(): SanitizedUpdateContext<GenericDatabase> {
    return new SanitizedUpdateContext({
      database: database() as any,
      cache: this.cache,
      rawInput: this.rawInput,
      sanitizedInput: this.sanitizedInput,
      getRawInputValue: (fieldPath, appendPaths) => getProperty(this.rawInput, fieldPath, appendPaths),
      getSanitizedInputValue: (fieldPath, appendPaths) => getProperty(this.sanitizedInput, fieldPath, appendPaths),
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
      language: this.singleton.translatable ? (this.languageCode ?? primaryLanguage) : null,
    }) as any
  }

  /**
   * Generates a new `SingletonContext` instance.
   */
  protected createSanitizedSingletonContext(): SingletonContext {
    const context = this.createSanitizedContext()
    return Object.assign(context, {
      singleton: this.singleton,
      singletonName: this.singletonName,
      language: this.singleton.translatable ? (this.languageCode ?? primaryLanguage) : null,
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
   * Generates the SQL string and its corresponding parameters for the UPDATE query.
   */
  protected async toSQL(): Promise<{ sql: string; params: Record<string, any> }> {
    const sql =
      database().dialect === 'postgres'
        ? `insert into "Options" (key, value) values ($key, $value) on conflict (key) do update set value = ("Options".value::jsonb || $value::jsonb)::text returning value`
        : `insert into "Options" (key, value) values ($key, $value) on conflict (key) do update set value = json_patch(value, json($value)) returning value`
    const params = { key: `singleton_${this.singletonName}`, value: JSON.stringify(this.sanitizedInput) }

    if (this.singleton.translatable) {
      params.key += `_${this.languageCode ?? primaryLanguage}`
    }

    this.logSQL(sql, params)

    return { sql, params }
  }
}
