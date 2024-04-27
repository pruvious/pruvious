import {
  primaryLanguage,
  supportedLanguages,
  type CastedFieldType,
  type CollectionField,
  type CollectionFieldName,
  type ImmutableFieldName,
  type PopulatedFieldType,
  type SelectableFieldName,
  type SingleCollectionName,
  type SupportedLanguage,
  type UpdateInput,
} from '#pruvious'
import { collections, fields } from '#pruvious/server'
import type { WhereOptions as SequelizeWhereOptions } from 'sequelize'
import { cache } from '../instances/cache'
import { db } from '../instances/database'
import { getModuleOption } from '../instances/state'
import { clearPageCache } from '../plugins/page-cache'
import { clearArray, isArray, sortNaturalByProp, uniqueArray } from '../utils/array'
import { isNull } from '../utils/common'
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
} from '../utils/object'
import { _, __ } from '../utils/server/translate-string'
import type { ResolvedCollectionDefinition } from './collection.definition'
import { resolveCollectionFieldOptions } from './field-options.resolver'
import { query as _query } from './query'
import type { PickFields, ValidationError } from './query-builder'
import type { QueryStringParams } from './query-string'

type UpdateResult<ReturnedFieldType, ReturnableFieldName extends string & keyof ReturnedFieldType> =
  | {
      /**
       * Indicates whether the update was successful.
       */
      success: true

      /**
       * The updated record.
       */
      record: Pick<ReturnedFieldType, ReturnableFieldName>
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

/**
 * Executes database queries for a single-entry `collection`.
 *
 * @see https://pruvious.com/docs/query-builder#single-entry-collections
 */
export class SingleQueryBuilder<
  CollectionName extends SingleCollectionName,
  ReturnableFieldName extends SelectableFieldName[CollectionName] = SelectableFieldName[CollectionName],
  ReturnedFieldType extends Record<keyof CastedFieldType[CollectionName], any> = CastedFieldType[CollectionName],
> {
  private table!: string

  private selectedFields: string[] = []

  private languageOption: SupportedLanguage = primaryLanguage

  private populateOption: boolean = false

  private fallbackOption: boolean = true

  protected contextLanguageOption: SupportedLanguage

  constructor(private collection: CollectionName, contextLanguage: SupportedLanguage = primaryLanguage) {
    this.contextLanguageOption = contextLanguage
    this.table = getModuleOption('singleCollectionsTable')
    this.selectAll()
  }

  /**
   * Apply query string parameters to the current query.
   *
   * @example
   * ```typescript
   * export default defineEventHandler((event) => {
   *   const qs = getQueryStringParams(event, 'settings')
   *
   *   if (qs.errors.length) {
   *     setResponseStatus(event, 400)
   *     return qs.errors.join('\n')
   *   }
   *
   *   return query('settings').applyQueryStringParams(qs.params).read()
   * })
   * ```
   */
  applyQueryStringParams(
    params: Partial<QueryStringParams<CollectionName>>,
  ): SingleQueryBuilder<
    CollectionName,
    SelectableFieldName[CollectionName],
    (
      | CastedFieldType[CollectionName]
      | PopulatedFieldType[CollectionName]
      | Record<SelectableFieldName[CollectionName], undefined>
    ) & { [key in keyof CastedFieldType[CollectionName]]: unknown }
  > {
    if (isKeyOf(params, 'select')) this.selectedFields = uniqueArray(params.select!)
    if (isKeyOf(params, 'language')) this.languageOption = params.language!
    if (isKeyOf(params, 'populate')) this.populateOption = params.populate!

    return this as any
  }

  /**
   * Specify the `fields` to be selected and returned from the query.
   *
   * @example
   * ```typescript
   * // Selects the 'logo' and 'copyright' fields from the 'settings' collection
   * await query('settings').select({ logo: true, copyright: true }).read()
   * // Output: { logo: ..., copyright: '...' }
   * ```
   */
  select<T extends SelectableFieldName[CollectionName]>(
    fields: PickFields<SelectableFieldName[CollectionName], T> | T[],
  ): SingleQueryBuilder<CollectionName, T, ReturnedFieldType> {
    clearArray(this.selectedFields).push(...(isArray(fields) ? uniqueArray(fields) : Object.keys(fields)))
    return this as any
  }

  /**
   * Select all fields from the queried collection.
   *
   * @example
   * ```typescript
   * // Select all fields from the 'settings' collection
   * await query('settings').selectAll().read()
   * // Output: { field1: '...', field2: '...', ... }
   * ```
   */
  selectAll(): SingleQueryBuilder<CollectionName, SelectableFieldName[CollectionName], ReturnedFieldType> {
    const collection: ResolvedCollectionDefinition = collections[this.collection]
    clearArray(this.selectedFields).push(...Object.keys(collection.fields))
    return this as any
  }

  /**
   * Exclude specified `fields` from the query result.
   *
   * @example
   * ```typescript
   * // Don't return the 'secret' field from the 'settings' collection
   * const product = await query('settings').deselect({ secret: true }).read()
   * console.log(product.secret)
   * // Output: undefined
   * ```
   */
  deselect<T extends ReturnableFieldName>(
    fields: PickFields<ReturnableFieldName, T> | T[],
  ): SingleQueryBuilder<CollectionName, Exclude<ReturnableFieldName, T>, ReturnedFieldType> {
    const fieldsObj = isArray(fields) ? Object.fromEntries(fields.map((field) => [field, true])) : fields
    this.selectedFields = this.selectedFields.filter((fieldName) => !(fieldsObj as any)[fieldName])
    return this as any
  }

  /**
   * Set the language code for the query result.
   * If no language is specified or the code is invalid, the primary language is used.
   * Non-translatable collections always return results in the primary language.
   *
   * @example
   * ```typescript
   * // Select the German version of the 'settings' collection
   * await query('settings').language('de').read()
   * ```
   */
  language(code: SupportedLanguage): SingleQueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType> {
    if (collections[this.collection].translatable && supportedLanguages.includes(code)) {
      this.languageOption = code
    }

    return this
  }

  /**
   * Retrieve the currently queried language code.
   *
   * @example
   * ```typescript
   * query('settings').getLanguage() // 'en'
   * ```
   */
  getLanguage(): SupportedLanguage {
    return this.languageOption
  }

  /**
   * Enable field population to retrieve populated field values in the query results.
   *
   * By default, the query builder returns the casted field values without populating related data.
   *
   * @example
   * ```typescript
   * // Without population:
   * await query('settings').select({ blogLandingPage: true }).read()
   * // Output: { blogLandingPage: 1 }
   *
   * // With population:
   * await query('settings').select({ blogLandingPage: true }).populate().read()
   * // Output: { blogLandingPage: { id: 1, path: '/blog' } }
   * ```
   */
  populate(): SingleQueryBuilder<
    CollectionName,
    ReturnableFieldName,
    PopulatedFieldType[CollectionName] & { [key in keyof CastedFieldType[CollectionName]]: unknown }
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
   * await populatedsettingsQuery.select({ blogLandingPage: true }).unpopulate().read()
   * // Output: { blogLandingPage: 1 }
   *
   * // With population:
   * await populatedsettingsQuery.select({ blogLandingPage: true }).read()
   * // Output: { blogLandingPage: { id: 1, path: '/blog' } }
   * ```
   */
  unpopulate(): SingleQueryBuilder<CollectionName, ReturnableFieldName, CastedFieldType[CollectionName]> {
    this.populateOption = false
    return this as any
  }

  /**
   * Check whether the query results will be returned with casted or populated field values.
   *
   * @example
   * ```typescript
   * query('settings').getFieldValueType() // 'casted'
   * query('settings').populate().getFieldValueType() // 'populated'
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
   * await query('settings').select({ blogLandingPage: true }).read()
   * // Output: { blogLandingPage: 1 }
   *
   * // With population:
   * await query('settings').select({ blogLandingPage: true }).setFieldValueType('populated').read()
   * // Output: { blogLandingPage: { id: 1, path: '/blog' } }
   * ```
   */
  setFieldValueType(
    type: 'casted',
  ): SingleQueryBuilder<CollectionName, ReturnableFieldName, CastedFieldType[CollectionName]>

  setFieldValueType(
    type: 'populated',
  ): SingleQueryBuilder<
    CollectionName,
    ReturnableFieldName,
    PopulatedFieldType[CollectionName] & { [key in keyof CastedFieldType[CollectionName]]: unknown }
  >

  setFieldValueType(type: 'casted' | 'populated'): SingleQueryBuilder<
    CollectionName,
    ReturnableFieldName,
    (CastedFieldType[CollectionName] | PopulatedFieldType[CollectionName]) & {
      [key in keyof CastedFieldType[CollectionName]]: unknown
    }
  >

  setFieldValueType(type: 'casted' | 'populated'): SingleQueryBuilder<any> {
    this.populateOption = type === 'populated'
    return this
  }

  /**
   * Revalidate fields after fetching from the database and set their values to default if validation fails.
   * This prevents returning invalid existing data in case field or collection definitions are updated.
   *
   * By default, fallback validation is enabled.
   */
  fallback(): SingleQueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType> {
    this.fallbackOption = true
    return this
  }

  /**
   * Disable field validation after fetching, potentially speeding up database queries.
   * Beware that this may result in invalid data if field or collection definitions change.
   *
   * By default, fallback validation is enabled.
   */
  noFallback(): SingleQueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType> {
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
  ): SingleQueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType> {
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
      languageOption: this.languageOption,
      populateOption: this.populateOption,
      fallbackOption: this.fallbackOption,
      contextLanguageOption: this.contextLanguageOption,
    })
  }

  /**
   * Create a new query builder with the same state as this one.
   */
  clone(): SingleQueryBuilder<CollectionName, ReturnableFieldName, ReturnedFieldType> {
    const query: any = new SingleQueryBuilder(this.collection)

    for (const [key, value] of Object.entries(this.getOptions())) {
      query[key] = value
    }

    return query
  }

  /**
   * Reset all query builder options to their default values.
   */
  reset(): SingleQueryBuilder<CollectionName, SelectableFieldName[CollectionName], CastedFieldType[CollectionName]> {
    return this.selectAll().language(primaryLanguage).unpopulate().fallback().contextLanguage(primaryLanguage)
  }

  /**
   * Retrieve collection data that corresponds to the current query parameters.
   *
   * @example
   * ```typescript
   * // Read the 'settings' collection
   * await query('settings').read()
   * // Output: { field1: '...', field2: '...', ... }
   * ```
   */
  async read(): Promise<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    const start = performance.now()
    const key = this.generateCacheKey()
    const cached = await this.readFromCache(key)

    if (cached) {
      return cached
    }

    const record =
      ((await (await db()).model(this.table).findOne({ ...(await this.applySequelizeWhere()), raw: true })) as any) ||
      (await this.ensureRecord())

    const data = {
      ...Object.fromEntries(
        Object.keys(collections[this.collection].fields).map((fieldName) => [fieldName, undefined]),
      ),
      id: +record.id,
      language: record.language,
      ...JSON.parse(record.data),
    }

    await this.validateAndFallbackDataAfterFetch(data)

    for (const fieldName in data) {
      if (!this.selectedFields.includes(fieldName)) {
        delete data[fieldName]
      }
    }

    if (this.populateOption) {
      await this.populateRecord(data)
    }

    if (!this.hasNonCachedFieldInSelect()) {
      await this.storeInCache(key, data, start)
    }

    return data
  }

  /**
   * Validate the `input` data.
   *
   * @returns A Promise that resolves to an object containing validation errors for fields with failed validation.
   */
  async validate(
    input: Record<string, any>,
    operation: 'read' | 'update',
    skipFields?: string[],
  ): Promise<ValidationError<ReturnableFieldName>> {
    const errors: Record<string, string> = {}

    for (const fieldName of this.getOperableFields(input)) {
      if (skipFields?.includes(fieldName)) {
        continue
      }

      const declaration = collections[this.collection].fields[fieldName]
      const definition = fields[declaration.type]

      if (definition) {
        for (const validator of [...definition.validators, ...(declaration.additional?.validators ?? [])]) {
          try {
            if (
              isFunction(validator) ||
              (operation === 'read' && validator.onRead) ||
              (operation === 'update' && validator.onUpdate)
            ) {
              await (isFunction(validator) ? validator : validator.validator)({
                _: _ as any,
                __: __ as any,
                allInputs: undefined,
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

    return errors as any
  }

  /**
   * Update fields of a single-entry collection.
   *
   * @returns A Promise that resolves to an `UpdateResult` object.
   *          If successful, the updated fields will be available in the `record` property.
   *          If there are any field validation errors, they will be available in the `errors` property.
   *          The `message` property may contain an optional error message if there are issues during the database query.
   *
   * @example
   * ```typescript
   * const result = await query('settings').update({
   *   logo: 2,
   *   blogLandingPage: 15,
   *   copyright: '2077',
   * })
   *
   * if (result.success) {
   *   console.log('Updated record:', result.record)
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

    const existing =
      ((await (await db()).model(this.table).findOne({ ...(await this.applySequelizeWhere()), raw: true })) as any) ||
      (await this.ensureRecord())

    const prepared = this.prepareInput(input)
    const sanitized = await this.sanitize(prepared)
    const conditionalLogicResults = this.applyConditionalLogic(sanitized)

    if (Object.keys(conditionalLogicResults.errors).length) {
      return { success: false, errors: conditionalLogicResults.errors }
    }

    const validationErrors = await this.validate(sanitized, 'update', conditionalLogicResults.failed)

    if (Object.keys(validationErrors).length) {
      return { success: false, errors: validationErrors }
    }

    const data = { ...JSON.parse(existing.data), ...sanitized }

    if (collections[this.collection].updatedAtField) {
      data[collections[this.collection].updatedAtField as string] = Date.now()
    }

    try {
      await (await db())
        .model(this.table)
        .update({ data: JSON.stringify(data) }, (await this.applySequelizeWhere()) as any)

      const updated: any = await (await db())
        .model(this.table)
        .findOne({ ...(await this.applySequelizeWhere()), raw: true })

      const updatedData = { id: +updated.id, language: updated.language, ...JSON.parse(updated.data) }

      for (const fieldName of Object.keys(updatedData)) {
        if (!collections[this.collection].fields[fieldName]) {
          delete updatedData[fieldName]
        }
      }

      if (collections[this.collection].translatable) {
        const syncedData: Record<string, any> = {}

        for (const fieldName of Object.keys(updatedData)) {
          if (collections[this.collection].fields[fieldName].additional?.translatable === false) {
            syncedData[fieldName] = updatedData[fieldName]
          }
        }

        if (Object.keys(syncedData).length) {
          for (const language of supportedLanguages.filter((language) => language !== this.languageOption)) {
            const relatedRecord = await this.clone()
              .reset()
              .language(language as SupportedLanguage)
              .read()

            await (await db())
              .model(this.table)
              .update(
                { data: JSON.stringify({ ...relatedRecord, ...syncedData }) },
                { where: { name: this.collection, language } },
              )
          }
        }
      }

      await this.validateAndFallbackDataAfterFetch(updatedData)

      for (const fieldName in updatedData) {
        if (!this.selectedFields.includes(fieldName)) {
          delete updatedData[fieldName]
        }
      }

      if (this.populateOption) {
        await this.populateRecord(updatedData)
      }

      await this.clearCache()

      return {
        success: true,
        record: updatedData,
      }
    } catch (e: any) {
      return { success: false, errors: {}, message: e.message }
    }
  }

  private async applySequelizeWhere(): Promise<
    Partial<{
      where: SequelizeWhereOptions<any>
    }>
  > {
    return {
      where: {
        name: this.collection,
        language: this.languageOption,
      },
    }
  }

  private async validateAndFallbackDataAfterFetch(data: Record<string, any>) {
    if (this.fallbackOption) {
      const errors = await this.validate(data, 'read')
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
              data,
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
            const value = getProperty(data, parentPath)

            for (const [fieldPath, value] of sortNaturalByProp(Object.entries(filterArrays), '0').reverse()) {
              filterArrays[parentPath] = value
            }
          } else if (!/\.[a-z_$][a-z0-9_$]*\.fields\./i.test) {
            deleteProperty(data, fieldPath)
          }
        } else if (/\.[0-9]+$/.test(fieldPath)) {
          const parentPath = fieldPath.split('.').slice(0, -1).join('.')
          const value = getProperty(data, parentPath)

          if (isArray(value)) {
            filterArrays[parentPath] = value
          }
        } else if (!/\.[a-z_$][a-z0-9_$]*\.fields\./i.test) {
          deleteProperty(data, fieldPath)
        }
      }

      for (const [fieldPath, value] of Object.entries(filterArrays)) {
        setProperty(
          data,
          fieldPath,
          value.filter((v) => !isNull(v)),
        )
      }
    }
  }

  private async populateRecord(record: Record<string, any>) {
    for (const fieldName of this.selectedFields) {
      const declaration = collections[this.collection].fields[fieldName]
      const definition = fields[declaration.type]
      const population = declaration.additional?.population ?? definition.population

      if (population) {
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

  private prepareInput<T extends Record<string, any>>(input: T): T {
    return objectOmit(
      objectPick(input, Object.keys(collections[this.collection].fields) as any[]),
      this.getImmutableFields(),
    ) as T
  }

  private getImmutableFields(): ImmutableFieldName[CollectionName][] {
    return Object.keys(collections[this.collection].fields).filter(
      (fieldName) => collections[this.collection].fields[fieldName].additional?.immutable,
    ) as ImmutableFieldName[CollectionName][]
  }

  private getOperableFields(input: Record<string, any>): CollectionFieldName[CollectionName][] {
    return Object.keys(input).filter(
      (fieldName) =>
        fieldName !== 'id' &&
        fieldName !== 'language' &&
        collections[this.collection].fields[fieldName] &&
        fieldName !== collections[this.collection].createdAtField &&
        fieldName !== collections[this.collection].updatedAtField,
    ) as CollectionFieldName[CollectionName][]
  }

  private async sanitize(input: Record<string, any>): Promise<Record<string, any>> {
    const sanitized: Record<string, any> = {}

    for (const fieldName of this.getOperableFields(input)) {
      const declaration = collections[this.collection].fields[fieldName]

      if (declaration) {
        const definition = fields[declaration.type]

        if (definition) {
          sanitized[fieldName] = (input as any)[fieldName]

          for (const sanitizer of [...definition.sanitizers, ...(declaration.additional?.sanitizers ?? [])]) {
            try {
              if (isFunction(sanitizer) || sanitizer.onUpdate) {
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
                  operation: 'update',
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

  private applyConditionalLogic(sanitized: Record<string, any>): { errors: Record<string, string>; failed: string[] } {
    const errors: Record<string, string> = {}
    const failed: string[] = []

    for (const [name, value] of Object.entries(sanitized)) {
      const declaration = collections[this.collection].fields[name]
      const definition = fields[declaration.type]

      if (declaration.additional?.conditionalLogic) {
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

  private hasNonCachedFieldInSelect(): boolean {
    if (collections[this.collection].cacheQueries !== false) {
      return this.selectedFields.some((fieldName) => collections[this.collection].nonCachedFields.includes(fieldName))
    }

    return false
  }

  private generateCacheKey(): string {
    if (collections[this.collection].cacheQueries !== false) {
      let key = `pruvious:query:${this.collection}:select:${this.selectedFields.join(',')}`
      key += `:language:${JSON.stringify(this.languageOption)}`
      key += `:populate:${this.populateOption}`
      key += `:fallback:${this.fallbackOption}`

      return key
    }

    return ''
  }

  private async storeInCache(key: string, value: any, start: number): Promise<void> {
    const cacheQueries = collections[this.collection].cacheQueries

    if (cacheQueries !== false && performance.now() - start > cacheQueries) {
      await (await cache())?.set(key, JSON.stringify(value))
    }
  }

  private async readFromCache(key: string): Promise<any> {
    if (collections[this.collection].cacheQueries !== false) {
      const value = await (await cache())?.get(key)
      return value ? JSON.parse(value) : null
    }

    return null
  }

  protected async clearCache(): Promise<void> {
    const collection = collections[this.collection]

    if (collection.clearCacheRules && collection.clearCacheRules.onUpdate !== false) {
      await (await cache())?.flushDb()
      await clearPageCache()
    }
  }

  private async ensureRecord(): Promise<Record<string, any>> {
    const now = Date.now()
    const input: Record<string, any> = {
      language: this.languageOption,
      name: this.collection,
      data: {},
    }

    for (const fieldName in collections[this.collection].fields) {
      if (fieldName !== 'id' && fieldName !== 'language') {
        const definition = fields[collections[this.collection].fields[fieldName].type]

        if (definition) {
          input.data[fieldName] = definition.default({
            definition,
            name: fieldName,
            options: collections[this.collection].fields[fieldName].options,
          })
        }
      }
    }

    if (collections[this.collection].createdAtField) {
      input.data[collections[this.collection].createdAtField as string] = now
    }

    if (collections[this.collection].updatedAtField) {
      input.data[collections[this.collection].updatedAtField as string] = now
    }

    input.data = JSON.stringify(input.data)

    await (await db()).model(this.table).create(input)

    return (await db()).model(this.table).findOne({ ...(await this.applySequelizeWhere()), raw: true }) as any
  }
}
