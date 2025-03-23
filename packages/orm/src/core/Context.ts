import type {
  ExtractDomains,
  ExtractHandlesByDomainAndLanguage,
  ExtractInput,
  ExtractTranslatableStringsDefinitions,
  I18n,
} from '@pruvious/i18n'
import type {
  DeleteQueryBuilder,
  InsertQueryBuilder,
  SelectQueryBuilder,
  UpdateQueryBuilder,
  WhereCondition,
} from '../query-builder'
import type { GenericCollection } from './Collection'
import type { GenericDatabase } from './Database'

/**
 * Context payload passed to sanitizer hooks during all query builder operations (INSERT, SELECT, UPDATE, DELETE).
 * It contains the target collection and operation-specific details.
 */
export type Context<TDatabase extends GenericDatabase> =
  | InsertContext<TDatabase>
  | SelectContext<TDatabase>
  | UpdateContext<TDatabase>
  | DeleteContext<TDatabase>

/**
 * Context payload passed to all hooks after input sanitization during some query builder operations (INSERT, UPDATE).
 * It contains the target collection and operation-specific details.
 */
export type SanitizedContext<TDatabase extends GenericDatabase> =
  | SanitizedInsertContext<TDatabase>
  | SanitizedUpdateContext<TDatabase>

export interface BaseContextOptions<TDatabase extends GenericDatabase> {
  /**
   * The collection being operated on.
   * It may be `undefined` if the operation is performed outside of a collection query builder.
   */
  collection?: GenericCollection

  /**
   * The name of the collection being operated on.
   * It may be `undefined` if the operation is performed outside of a collection query builder.
   */
  collectionName?: string

  /**
   * The current `Database` instance.
   */
  database: TDatabase

  /**
   * An object for storing temporary data that is shared between hooks.
   *
   * For example, you can use the `useCache(cache)` method in the `SelectQueryBuilder` class to automatically
   * cache query results and reuse them in subsequent hooks.
   *
   * The `_tmp` cache key is removed before executing `afterQueryExecution` hooks and returning query results.
   * This can be used as a runtime store, for example, to synchronize timestamps across multiple collection fields.
   */
  cache: Record<string, any>

  /**
   * Additional data provided by the `QueryBuilder` through the `withCustomContextData()` method.
   */
  customData?: Record<string, any>

  /**
   * The target language code for translations provided by the `i18n` instance.
   */
  language: string
}

export interface InsertContextOptions<TDatabase extends GenericDatabase> extends BaseContextOptions<TDatabase> {
  /**
   * The current `InsertQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  queryBuilder?: InsertQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    'rows' | 'count',
    string,
    boolean,
    boolean
  >

  /**
   * An array of objects containing the raw input data for the new records.
   */
  rawInput: Record<string, any>[]

  /**
   * The index of the current input object being processed.
   * If the context is being used in a hook that does not process inputs (e.g. collection hooks), this value is `-1`.
   *
   * @example
   * ```ts
   * const currentInput = context.rawInput[context.inputIndex]
   * ```
   */
  inputIndex: number

  /**
   * Retrieves the raw value of a specific field from the `rawInput` data using its path in dot notation.
   * It returns the value for the current `inputIndex` being processed.
   *
   * @example
   * ```ts
   * const email = context.getRawInputValue('email')
   * // Same as: const email = context.rawInput[context.inputIndex].email
   *
   * const image = context.getRawInputValue('gallery.0.image')
   * // Same as: const image = context.rawInput[context.inputIndex].gallery?.[0]?.image
   * // Same as: const image = context.context.getRawInputValue('gallery', 0, 'image')
   * ```
   */
  getRawInputValue: <T = any>(fieldPath: string, ...appendPaths: string[]) => T
}

export interface SanitizedInsertContextOptions<TDatabase extends GenericDatabase>
  extends InsertContextOptions<TDatabase> {
  /**
   * An array of objects containing the sanitized input data for the new records.
   */
  sanitizedInput: Record<string, any>[]

  /**
   * Retrieves the sanitized value of a specific field from the `sanitizedInput` data using its path in dot notation.
   * It returns the value for the current `inputIndex` being processed.
   *
   * @example
   * ```ts
   * const email = context.getSanitizedInputValue('email')
   * // Same as: const email = context.sanitizedInput[context.inputIndex].email
   *
   * const image = context.getSanitizedInputValue('gallery.0.image')
   * // Same as: const image = context.sanitizedInput[context.inputIndex].gallery?.[0]?.image
   * // Same as: const image = context.context.getSanitizedInputValue('gallery', 0, 'image')
   * ```
   */
  getSanitizedInputValue: <T = any>(fieldPath: string, ...appendPaths: string[]) => T
}

export interface SelectContextOptions<TDatabase extends GenericDatabase> extends BaseContextOptions<TDatabase> {
  /**
   * The current `SelectQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  queryBuilder?: SelectQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    string,
    boolean,
    boolean
  >

  /**
   * An array of WHERE conditions to filter the records for selection.
   * Use the `setWhereCondition` method in any `QueryBuilder` class to apply these conditions.
   */
  readonly whereCondition: WhereCondition[]
}

export interface UpdateContextOptions<TDatabase extends GenericDatabase> extends BaseContextOptions<TDatabase> {
  /**
   * The current `UpdateQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  queryBuilder?: UpdateQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    'rows' | 'count',
    string,
    boolean,
    boolean
  >

  /**
   * An object containing the raw input data for updating existing records.
   */
  rawInput: Record<string, any>

  /**
   * Retrieves the value of a specific field from the raw input data using its path in dot notation.
   *
   * @example
   * ```ts
   * const email = context.getRawInputValue('email')
   * // Same as: const email = context.rawInput.email
   *
   * const image = context.getRawInputValue('gallery.0.image')
   * // Same as: const image = context.rawInput.gallery?.[0]?.image
   * // Same as: const image = context.getRawInputValue('gallery', 0, 'image')
   * ```
   */
  getRawInputValue: <T = any>(fieldPath: string, ...appendPaths: string[]) => T

  /**
   * An array of WHERE conditions to filter the records for updating.
   * This allows precise targeting of records to be modified.
   * Use the `setWhereCondition` method in any `QueryBuilder` class to apply these conditions.
   */
  whereCondition: WhereCondition[]
}

export interface SanitizedUpdateContextOptions<TDatabase extends GenericDatabase>
  extends UpdateContextOptions<TDatabase> {
  /**
   * An object containing the sanitized input data for updating existing records.
   */
  sanitizedInput: Record<string, any>

  /**
   * Retrieves the sanitized value of a specific field from the sanitized input data using its path in dot notation.
   *
   * @example
   * ```ts
   * const email = context.getSanitizedInputValue('email')
   * // Same as: const email = context.sanitizedInput.email
   *
   * const image = context.getSanitizedInputValue('gallery.0.image')
   * // Same as: const image = context.sanitizedInput.gallery?.[0]?.image
   * // Same as: const image = context.getSanitizedInputValue('gallery', 0, 'image')
   * ```
   */
  getSanitizedInputValue: <T = any>(fieldPath: string, ...appendPaths: string[]) => T
}

export interface DeleteContextOptions<TDatabase extends GenericDatabase> extends BaseContextOptions<TDatabase> {
  /**
   * The current `DeleteQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  queryBuilder?: DeleteQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    'rows' | 'count',
    string,
    boolean,
    boolean
  >

  /**
   * An array of WHERE conditions to filter the records for deletion.
   * This allows precise targeting of records to be deleted.
   * Use the `setWhereCondition` method in any `QueryBuilder` class to apply these conditions.
   */
  readonly whereCondition: WhereCondition[]
}

export class BaseContext<TDatabase extends GenericDatabase> {
  /**
   * The collection being operated on.
   * It may be `undefined` if the operation is performed outside of a collection query builder.
   */
  readonly collection?: GenericCollection

  /**
   * The name of the collection being operated on.
   * It may be `undefined` if the operation is performed outside of a collection query builder.
   */
  readonly collectionName?: string

  /**
   * The current `Database` instance.
   */
  readonly database: TDatabase

  /**
   * An object for storing temporary data that is shared between hooks.
   *
   * For example, you can use the `useCache(cache)` method in the `SelectQueryBuilder` class to automatically
   * cache query results and reuse them in subsequent hooks.
   *
   * The `_tmp` cache key is removed before executing `afterQueryExecution` hooks and returning query results.
   * This can be used as a runtime store, for example, to synchronize timestamps across multiple collection fields.
   */
  readonly cache: Record<string, any>

  /**
   * Additional data provided by the `QueryBuilder` through the `withCustomContextData()` method.
   */
  readonly customData: Record<string, any>

  /**
   * The `I18n` instance for translating error messages and other text.
   */
  protected i18n: TDatabase['i18n']

  /**
   * The target language code for translations provided by the `i18n` instance.
   */
  protected language: string

  constructor(options: BaseContextOptions<TDatabase>) {
    this.collection = options.collection
    this.collectionName = options.collectionName
    this.database = options.database
    this.cache = options.cache
    this.customData = options.customData ?? {}
    this.i18n = options.database.i18n
    this.language = options.language
    this.__ = this.__.bind(this)
    this._ = this._.bind(this)
  }

  /**
   * Retrieves a translated string for a given `domain` and `handle`, with optional `input` parameters.
   * The language is automatically resolved by the hook caller.
   *
   * Translations are defined in the `i18n` option of the `Database` class.
   *
   * @example
   * ```ts
   * __('pruvious-orm', "The field `$field` does not exist", { field: 'email' })
   * // "The field 'email' does not exist"
   *
   * __('pruvious-orm', 'This field is required')
   * // 'This field is required'
   * ```
   */
  __<
    TDomain extends ExtractDomains<ExtractTranslatableStringsDefinitions<TDatabase['i18n']>>,
    THandle extends ExtractHandlesByDomainAndLanguage<
      TDomain,
      string,
      ExtractTranslatableStringsDefinitions<TDatabase['i18n']>
    >,
    TInput extends ExtractInput<
      TDomain,
      string,
      THandle & string,
      ExtractTranslatableStringsDefinitions<TDatabase['i18n']>
    >,
  >(domain: TDomain, handle: THandle, input?: TInput): string {
    return (this.i18n as I18n).__$(domain, this.language, handle as any, input as any)
  }

  /**
   * A shorthand method for retrieving translated strings from the `default` domain.
   * This method is equivalent to calling `__` with `default` as the domain.
   * The language is automatically resolved by the hook caller.
   *
   * Translations are defined in the `i18n` option of the `Database` class.
   *
   * @example
   * ```ts
   * _('Welcome')
   * // Same as: __('default', 'Welcome')
   * // Returns: 'Willkommen'
   *
   * _('Logged in as $name', { name: 'Severus Snape' })
   * // Same as: __('default', 'Logged in as $name', { name: 'Severus Snape' })
   * // Returns: 'Angemeldet als Severus Snape'
   * ```
   */
  _<
    THandle extends ExtractHandlesByDomainAndLanguage<
      'default',
      string,
      ExtractTranslatableStringsDefinitions<TDatabase['i18n']>
    >,
    TInput extends ExtractInput<
      'default',
      string,
      THandle & string,
      ExtractTranslatableStringsDefinitions<TDatabase['i18n']>
    >,
  >(handle: THandle, input?: TInput): string {
    return (this.i18n as I18n).__$('default', this.language, handle as any, input as any)
  }
}

/**
 * Context payload that is passed to sanitizer hooks during the INSERT operation.
 */
export class InsertContext<TDatabase extends GenericDatabase> extends BaseContext<TDatabase> {
  /**
   * The current query builder operation being performed.
   */
  readonly operation = 'insert'

  /**
   * The current `InsertQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  readonly queryBuilder?: InsertQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    'rows' | 'count',
    string,
    boolean,
    boolean
  >

  /**
   * An array of objects containing the raw input data for the new records.
   */
  readonly rawInput: InsertContextOptions<TDatabase>['rawInput']

  /**
   * The index of the current input object being processed.
   *
   * @example
   * ```ts
   * const currentInput = context.rawInput[context.inputIndex]
   * ```
   */
  readonly inputIndex: InsertContextOptions<TDatabase>['inputIndex']

  /**
   * Retrieves the raw value of a specific field from the `rawInput` data using its path in dot notation.
   * It returns the value for the current `inputIndex` being processed.
   *
   * @example
   * ```ts
   * const email = context.getRawInputValue('email')
   * // Same as: const email = context.rawInput[context.inputIndex].email
   *
   * const image = context.getRawInputValue('gallery.0.image')
   * // Same as: const image = context.rawInput[context.inputIndex].gallery?.[0]?.image
   * // Same as: const image = context.getRawInputValue('gallery', 0, 'image')
   * ```
   */
  readonly getRawInputValue: InsertContextOptions<TDatabase>['getRawInputValue']

  constructor(options: InsertContextOptions<TDatabase>) {
    super(options)
    this.queryBuilder = options.queryBuilder
    this.rawInput = options.rawInput
    this.inputIndex = options.inputIndex
    this.getRawInputValue = options.getRawInputValue
  }
}

/**
 * Context payload that is passed to all hooks after input sanitization during the INSERT operation.
 */
export class SanitizedInsertContext<TDatabase extends GenericDatabase> extends InsertContext<TDatabase> {
  /**
   * An array of objects containing the sanitized input data for the new records.
   */
  readonly sanitizedInput: SanitizedInsertContextOptions<TDatabase>['sanitizedInput']

  /**
   * Retrieves the sanitized value of a specific field from the `sanitizedInput` data using its path in dot notation.
   * It returns the value for the current `inputIndex` being processed.
   *
   * @example
   * ```ts
   * const email = context.getSanitizedInputValue('email')
   * // Same as: const email = context.sanitizedInput[context.inputIndex].email
   *
   * const image = context.getSanitizedInputValue('gallery.0.image')
   * // Same as: const image = context.sanitizedInput[context.inputIndex].gallery?.[0]?.image
   * // Same as: const image = context.getSanitizedInputValue('gallery', 0, 'image')
   * ```
   */
  readonly getSanitizedInputValue: SanitizedInsertContextOptions<TDatabase>['getSanitizedInputValue']

  constructor(options: SanitizedInsertContextOptions<TDatabase>) {
    super(options)
    this.sanitizedInput = options.sanitizedInput
    this.getSanitizedInputValue = options.getSanitizedInputValue
  }
}

/**
 * Context payload that is passed to all hooks during the SELECT operation.
 */
export class SelectContext<TDatabase extends GenericDatabase> extends BaseContext<TDatabase> {
  /**
   * The current query builder operation being performed.
   */
  readonly operation = 'select'

  /**
   * The current `SelectQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  readonly queryBuilder?: SelectQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    string,
    boolean,
    boolean
  >

  /**
   * An array of WHERE conditions to filter the records for selection.
   * Use the `setWhereCondition` method in any `QueryBuilder` class to apply these conditions.
   */
  readonly whereCondition: SelectContextOptions<TDatabase>['whereCondition']

  constructor(options: SelectContextOptions<TDatabase>) {
    super(options)
    this.queryBuilder = options.queryBuilder
    this.whereCondition = options.whereCondition
  }
}

/**
 * Context payload that is passed to sanitizer hooks during the UPDATE operation.
 */
export class UpdateContext<TDatabase extends GenericDatabase> extends BaseContext<TDatabase> {
  /**
   * The current query builder operation being performed.
   */
  readonly operation = 'update'

  /**
   * The current `UpdateQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  readonly queryBuilder?: UpdateQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    'rows' | 'count',
    string,
    boolean,
    boolean
  >

  /**
   * An object containing the raw input data for updating existing records.
   */
  readonly rawInput: UpdateContextOptions<TDatabase>['rawInput']

  /**
   * Retrieves the value of a specific field from the raw input data using its path in dot notation.
   *
   * @example
   * ```ts
   * const email = context.getRawInputValue('email')
   * // Same as: const email = context.rawInput.email
   *
   * const image = context.getRawInputValue('gallery.0.image')
   * // Same as: const image = context.rawInput.gallery?.[0]?.image
   * // Same as: const image = context.getRawInputValue('gallery', 0, 'image')
   * ```
   */
  readonly getRawInputValue: UpdateContextOptions<TDatabase>['getRawInputValue']

  /**
   * An array of WHERE conditions to filter the records for updating.
   * This allows precise targeting of records to be modified.
   * Use the `setWhereCondition` method in any `QueryBuilder` class to apply these conditions.
   */
  readonly whereCondition: UpdateContextOptions<TDatabase>['whereCondition']

  constructor(options: UpdateContextOptions<TDatabase>) {
    super(options)
    this.queryBuilder = options.queryBuilder
    this.rawInput = options.rawInput
    this.getRawInputValue = options.getRawInputValue
    this.whereCondition = options.whereCondition
  }
}

/**
 * Context payload that is passed to all hooks after input sanitization during the UPDATE operation.
 */
export class SanitizedUpdateContext<TDatabase extends GenericDatabase> extends UpdateContext<TDatabase> {
  /**
   * An object containing the sanitized input data for updating existing records.
   */
  readonly sanitizedInput: SanitizedUpdateContextOptions<TDatabase>['sanitizedInput']

  /**
   * Retrieves the sanitized value of a specific field from the sanitized input data using its path in dot notation.
   *
   * @example
   * ```ts
   * const email = context.getSanitizedInputValue('email')
   * // Same as: const email = context.sanitizedInput.email
   *
   * const image = context.getSanitizedInputValue('gallery.0.image')
   * // Same as: const image = context.sanitizedInput.gallery?.[0]?.image
   * // Same as: const image = context.getSanitizedInputValue('gallery', 0, 'image')
   * ```
   */
  readonly getSanitizedInputValue: SanitizedUpdateContextOptions<TDatabase>['getSanitizedInputValue']

  constructor(options: SanitizedUpdateContextOptions<TDatabase>) {
    super(options)
    this.sanitizedInput = options.sanitizedInput
    this.getSanitizedInputValue = options.getSanitizedInputValue
  }
}

/**
 * Context payload that is passed to all hooks during the DELETE operation.
 */
export class DeleteContext<TDatabase extends GenericDatabase> extends BaseContext<TDatabase> {
  /**
   * The current query builder operation being performed.
   */
  readonly operation = 'delete'

  /**
   * The current `DeleteQueryBuilder` instance for the collection being operated on.
   * If the operation is performed outside of a collection query builder, this value may be `undefined`.
   */
  readonly queryBuilder?: DeleteQueryBuilder<
    Record<string, GenericCollection>,
    string,
    GenericCollection,
    I18n,
    'rows' | 'count',
    string,
    boolean,
    boolean
  >

  /**
   * An array of WHERE conditions to filter the records for deletion.
   * This allows precise targeting of records to be deleted.
   * Use the `setWhereCondition` method in any `QueryBuilder` class to apply these conditions.
   */
  readonly whereCondition: DeleteContextOptions<TDatabase>['whereCondition']

  constructor(options: DeleteContextOptions<TDatabase>) {
    super(options)
    this.queryBuilder = options.queryBuilder
    this.whereCondition = options.whereCondition
  }
}
