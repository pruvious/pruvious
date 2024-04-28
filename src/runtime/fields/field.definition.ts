import type { AuthUser, CollectionName, SupportedLanguage } from '#pruvious'
import type { ExtractKeywordsContext, ResolvedCollectionDefinition } from '../collections/collection.definition'
import { query } from '../collections/query'
import type { QueryBuilderInstance } from '../utility-types'
import { isNull } from '../utils/common'
import { matchesConditionalLogic } from '../utils/conditional-logic'
import { isObject, setProperty } from '../utils/object'
import type { _, __ } from '../utils/server/translate-string'
import { isString } from '../utils/string'

export interface FieldDefinition {
  /**
   * A unique field name.
   *
   * The name can contain only lowercase alphanumeric characters and hyphens.
   * It must begin with a letter, end with an alphanumeric character, and it cannot have two consecutive hyphens.
   *
   * Examples: 'video', 'gallery', 'time-range', etc.
   *
   * Note: In field declarations, the field name is referred to as the field **type** to avoid confusion with its assigned
   * property name (i.e. in collection definitions: `{ fields: { title: { type: 'text', ... } } }`)
   */
  name: string

  /**
   * The JavaScript and TypeScript type of the **casted** field value, and the corresponding database column type for storage.
   *
   * If a string is provided, it will be used for both JavaScript and TypeScript types,
   *
   * @example
   * ```typescript
   * { js: 'object', ts: '[number, number]', db: 'TEXT' }
   * ```
   */
  type:
    | {
        /**
         * The JavaScript data type of the **casted** field value.
         *
         * Note: Arrays are objects.
         */
        js: 'boolean' | 'number' | 'object' | 'string'

        /**
         * The **stringified** TypeScript type of the **casted** field value.
         * If not specified, the type of the `js` value will be used by default.
         *
         * You can use a function to dynamically generate this type.
         * It accepts a `context` argument with the following properties:
         *
         * - `definition` - The resolved field definition object.
         * - `fields` - An object representing all field definitions using key-value pairs.
         * - `name` - The property name used for declaring the field in a collection or block.
         * - `options` - The resolved field options used when declaring the field in a collection or block.
         *
         * Note: You can utilize all dynamically generated types by importing them from the `#pruvious` alias.
         *
         * @example
         * ```typescript
         * '[number, number]'
         * ```
         */
        ts?: string | ((context: FieldTypeContext) => string)

        /**
         * The database column type for storing the field value.
         *
         * If not specified, the column type will be automatically determined from the `js` value.
         *
         * **Caution:** Consider JavaScript Number limits (`MIN_SAFE_INTEGER` and `MAX_SAFE_INTEGER`).
         */
        db?: 'BIGINT' | 'BOOLEAN' | 'DECIMAL' | 'INTEGER' | 'TEXT'
      }
    | 'boolean'
    | 'number'
    | 'object'
    | 'string'

  /**
   * A function that sets the default value for this field.
   *
   * It accepts a `context` argument containing the field `definition` and `options` used in the declaration.
   *
   * This function can be used in `sanitizers` to set the default field value if the field input is optional
   * and `undefined` is provided during a model creation.
   *
   * @default () => null
   *
   * @example
   * ```typescript
   * ({ options }) => options.default ?? ''
   * ```
   */
  default?: (context: FieldContext) => any

  /**
   * Relative path of the Vue component responsible for rendering this field in the dashboard.
   * The path should be relative to your Nuxt app directory (e.g., `./components/VideoField.vue`).
   *
   * The Vue component should define the following props:
   *
   * - **`modelValue`** - The field value of type `FieldType['field-name']`.
   * - **`options`** - An object with the field options of type `FieldOptions['field-name']`.
   * - **`fieldKey`** _(optional)_ - A unique key for the field, automatically generated from the property name of the declared field.
   * - **`errors`** _(optional)_ - A key-value object containing validation errors of type `Record<string, string>`,
   *    where the key represents the `fieldKey` and the value represents the error message.
   * - **`disabled`** _(optional)_ - A boolean parameter indicating the disabled state of the field.
   * - **`compact`** _(optional)_ - A boolean parameter indicating the compact state of the field (e.g., for sidebars).
   * - **`record`** _(optional)_ - The current collection record as a reactive key-value object, containing all field names and their values.
   * - **`resolvedConditionalLogic`** _(optional)_ - The resolved conditional logic for all fields.
   * - **`history`** _(optional)_ - A `History` instance for the current record.
   *
   * @see https://vuejs.org/guide/components/v-model.html
   */
  vueComponent: string

  /**
   * The relative path of the Vue component that previews this field in the collection table overview.
   * The path should be relative to your Nuxt app directory (e.g., `./components/VideoFieldPreview.vue`).
   *
   * The Vue component should define the following props:
   *
   * - **`name`** - The declared field name in the collection.
   * - **`value`** - The field value of type `FieldType['field-name']`.
   * - **`options`** - An object with the field options of type `FieldOptions['field-name']`.
   * - **`canUpdate`** - A boolean parameter indicating whether the current user can update the field value.
   * - **`record`** - The current collection record as a key-value object, containing queried field names and their values.
   * - **`language`** - The current collection language.
   *
   * You can also define the `refresh` event emitter to trigger a table refresh.
   *
   * If not specified, a standard preview component will be used depending on the field type.
   */
  vuePreviewComponent?: string

  /**
   * The options used when creating an instance of this field.
   * Option names should follow camel-case formatting.
   *
   * These options are also passed to the Vue component responsible for rendering this fiel
   *
   * @example
   * ```typescript
   * defineField({
   *   name: 'gallery',
   *   options: {
   *     label: { ... },
   *     description: { ... },
   *   },
   * })
   *
   * // Auto-generated Vue helper:
   * galleryField({ label: 'Product images', description: '...' })
   * ```
   */
  options: Record<string, FieldOption>

  /**
   * An array of sanitizers to consistently apply against user inputs for this field.
   * The sanitizers are sequentially applied based on their order within the array.
   *
   * Sanitizers are applied before executing `validators`.
   *
   * Additional sanitizers can be appended when declaring this field in a collection or block.
   *
   * Each sanitizer function accepts a `context` argument with the following properties:
   *
   * - `definition` - The resolved field definition object.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `input` - A key-value object containing raw input values.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `operation` - The current query operation.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `query` - Utility function for creating a new query builder.
   * - `value` - The field value.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [
   *   trimSanitizer,
   *   ({ value }) => isString(value) && !value.endsWith('/') ? `${value}/` : value,
   * ]
   * ```
   */
  sanitizers?: FieldSanitizer[]

  /**
   * Custom function for evaluating conditional logic defined in field declarations.
   * It should return `true` if the conditional logic is met, otherwise `false`.
   * This function is invoked only when conditional logic is declared for the field and runs before executing `validators`.
   * If the conditional logic is not satisfied, it should set the field to its default value or throw errors.
   * Subsequent `validators` will not run for fields that have failed the conditional logic.
   *
   * The function accepts a `context` argument, which includes the following:
   *
   * - `conditionalLogic` - The declared conditional logic.
   * - `definition` - The resolved field definition object.
   * - `errors` - A key-value object with the current validation errors.
   * - `input` - An object containing sanitized and casted fields for processing.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `value` - The field value.
   *
   * @default
   * function ({ conditionalLogic, definition, input, name, options }) {
   *   if (!matchesConditionalLogic(input, name, conditionalLogic)) {
   *     input[name] = definition.default({ definition, name, options })
   *     return false
   *   }
   *
   *   return true
   * }
   */
  conditionalLogicMatcher?: (context: FieldConditionalLogicMatcherContext) => boolean

  /**
   * An array of validators to consistently execute against user inputs for this field.
   * The validators are sequentially executed based on their order within the array.
   *
   * Validators are executed after applying `sanitizers`.
   *
   * Each validator function accepts a `context` argument, which includes the following:
   *
   * - `_` - A helper function used to display validation errors in the default domain and a specific language.
   * - `__` - A helper function used to display validation errors in a specific domain and language.
   * - `allInputs` - All sanitized and casted field inputs or records (only available when creating or reading multiple records).
   * - `collection` - The resolved definition of the currently queried collection.
   * - `collections` - An object containing all collection definitions.
   * - `currentQuery` - The current query builder instance.
   * - `definition` - The resolved field definition object.
   * - `errors` - A key-value object with the current validation errors.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `input` - An object containing sanitized and casted fields for processing.
   * - `language` - Preferred user language for displaying validation errors.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `operation` - The current query operation.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `query` - Utility function for creating a new query builder.
   * - `value` - The field value.
   *
   * Additional validators can be appended when declaring this field in a collection or block.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [
   *   {
   *     onCreate: true,
   *     onUpdate: true,
   *     validator: (context) => context.options.required && requiredValidator(context),
   *   },
   *   stringValidator,
   *   ({ _, options, value }) => {
   *     if (!options.colors.includes(value)) {
   *       throw new Error(_("The color '$value' is not supported", { value }))
   *     }
   *   },
   * ]
   * ```
   */
  validators?: FieldValidator[]

  /**
   * Specifies the field's population settings.
   * These settings can be overridden during the field declaration within collections.
   *
   * @default false
   */
  population?: FieldPopulation | false

  /**
   * A function that generates search keywords from the field value.
   *
   * It accepts a `context` argument, which includes the following:
   *
   * - `definition` - The resolved field definition object.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `fieldValueType` - Indicates whether the context uses casted or populated field values.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `record` - The parent record containing all fields with the specified `search.fieldValueType` in the related collection.
   * - `value` - The field value (casted or populated, based on the `search.fieldValueType` parameter in the related collection).
   *
   * By default, a simple stringification function is used to create the keywords.
   *
   * @default ({ value }) => isObject(value) ? JSON.stringify(value) : isNull(value) ? '' : String(v
   */
  extractKeywords?: (context: ExtractKeywordsContext) => string | Promise<string>

  /**
   * A custom function that serializes the field value for storage in the database.
   * It accepts a `value` argument containing the field value.
   *
   * By default, the field value is serialized using `JSON.stringify` if it's an object.
   *
   * Note: This is only applicable to top-level fields of multi-entry collections.
   *
   * @default null
   */
  serialize?: ((value: any) => any) | null

  /**
   * A custom function that deserializes the field value from the database.
   * It accepts a `value` argument containing the serialized field value.
   *
   * By default, the field value is deserialized based on it's JavaScript type.
   *
   * Note: This is only applicable to top-level fields of multi-entry collections.
   *
   * @default null
   */
  deserialize?: ((value: any) => any) | null

  /**
   * Specifies the input settings for this field when used in the `create`, `createMany`, and `update` methods of the query builder.
   *
   * By default, the field will be marked as optional, with the casted TypeScript type, and wi
   */
  inputMeta?: FieldInputMeta
}

export interface FieldOption {
  /**
   * The **stringified** TypeScript type of the field option.
   *
   * Note: You can utilize all dynamically generated types by importing them from the `#pruvious` alias.
   *
   * @example
   * ```
   * defineField({
   *   ...
   *   options: {
   *     label: { type: 'string' },
   *     users: { type: `Pick<CollectionFieldName['users'], 'id' | 'email'>[]` },
   *   },
   * })
   * ```
   */
  type: string

  /**
   * A brief description of this field option, displayed in code comments.
   * Use an array to handle line breaks.
   */
  description?: string | string[]

  /**
   * Determines whether this option is required.
   *
   * @default false
   */
  required?: boolean

  /**
   * A function that generates the default value for this option if no value is specified.
   *
   * It accepts a `context` argument containing the property `name` used for declaring this field in a model.
   * Additionally, it contains the field's `definition` and all other `options` used in the declaration.
   *
   * Note: The `options` object does not contain default values for options that are not explicitly defined during the declaration.
   *
   * @default () => null
   *
   * @example
   * ```typescript
   * defineField({
   *   ...
   *   options: {
   *     label: {
   *       type: 'string',
   *       default: ({ name }) => titleCase(name, false),
   *     },
   *   },
   * })
   * ```
   */
  default?: (context: FieldContext) => any
}

export interface FieldContext {
  /**
   * The resolved field definition object.
   */
  definition: ResolvedFieldDefinition

  /**
   * The property name used for declaring the field in a collection or block.
   */
  name: string

  /**
   * The resolved field options used when declaring the field in a collection or block.
   *
   * Note: This object contains default values for options that are not explicitly defined during the declaration.
   */
  options: Record<string, any>
}

export interface FieldTypeContext extends FieldContext {
  /**
   * An object representing field definitions using key-value pairs.
   */
  fields: Record<string, ResolvedFieldDefinition>
}

export interface FieldInputContext extends FieldTypeContext {
  /**
   * The field value.
   */
  value: any
}

export interface FieldSanitizerContext extends FieldInputContext {
  /**
   * Key-value pairs where the key denotes field name, and value stands for its corresponding data.
   */
  input: Record<string, any>

  /**
   * The current query operation.
   */
  operation: 'create' | 'update'

  /**
   * Utility function for creating a new query builder.
   */
  query: typeof query
}

export interface FieldPopulatorContext extends FieldContext {
  /**
   * The field value.
   */
  value: any

  /**
   * The current query builder instance.
   * Utilize `query.clone()` to execute custom queries, such as data retrieval.
   */
  currentQuery: QueryBuilderInstance<CollectionName>

  /**
   * Utility function for creating a new query builder.
   */
  query: typeof query

  /**
   * An object representing field definitions using key-value pairs.
   */
  fields: Record<string, ResolvedFieldDefinition>
}

export type FieldGuardContext = FieldInputContext &
  TranslationHelpersContext & {
    /**
     * Represents the currently logged-in user initiating the request.
     */
    user: AuthUser | null

    /**
     * The current query operation.
     */
    operation: 'create' | 'update'

    /**
     * The input values used for creating or updating a record.
     * It is a regular key-value object, where the key represents the field name, and the value represents the field's value.
     */
    input?: Record<string, any>

    /**
     * Preferred user language for displaying validation errors.
     */
    language: SupportedLanguage

    /**
     * An array of input values used for creating multiple records.
     * Input values are regular key-value objects, where the key represents the field name, and the value represents the field's value.
     */
    allInputs?: Record<string, any>[]

    /**
     * The current query builder instance.
     * Utilize `query.clone()` to execute custom queries, such as data retrieval.
     */
    currentQuery: QueryBuilderInstance<CollectionName>

    /**
     * Utility function for creating a new query builder.
     */
    query: typeof query

    /**
     * A cache object for storing data made during executing all guards.
     * This object persists throughout the session, encompassing all collection and field guards, and can be utilized for purposes like query storage.
     *
     * @example
     * ```typescript
     * // Example guard for the `isAdmin` field within the `users` collection
     * async ({ _, user, cache, query }) => {
     *   if (!user?.isAdmin) {
     *     if (operation === 'create') {
     *       throw new Error(_('You are not authorized to create admin users'))
     *     }
     *
     *     cache.records ||= await (query as QueryBuilderInstance<'users'>)
     *       .clone()
     *       .select({ isAdmin: true })
     *       .clearGroup()
     *       .clearOffset()
     *       .clearLimit()
     *       .unpopulate()
     *       .all()
     *
     *     if (value && cache.records.some(({ isAdmin }) => !isAdmin)) {
     *       throw new Error(_('You are not authorized to promote users to admin status'))
     *     } else if (!value && cache.records.some(({ isAdmin }) => isAdmin)) {
     *       throw new Error(_('You are not authorized to demote admin users'))
     *     }
     *   }
     * }
     * ```
     */
    cache: Record<string, any>
  }

export interface FieldConditionalLogicMatcherContext extends FieldInputContext {
  /**
   * Conditional logic declared for a collection or block.
   */
  conditionalLogic: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string>

  /**
   * Represents the sanitized and casted fields input.
   *
   * It is a regular key-value object, where the key represents the field name, and the value represents the field's value.
   *
   * During read operations, the `input` object represents the current queried record.
   */
  input: Record<string, any>

  /**
   * A key-value object with the current validation errors.
   * Errors can be thrown in the matcher function or set manually in this object.
   */
  errors: Record<string, string>
}

export interface TranslationHelpersContext {
  /**
   * Fetch and display translated `text` from the `default` domain in the current language.
   * This function is designed for **Vue** applications.
   * For server-side use, import the same-named function from `#pruvious/server`.
   *
   * The current language is stored in the browser's local storage.
   * If the translation is not found in the current lang
   *
   * @example
   * ```typescript
   * _('Welcome, $name', { name: 'Padawan' })
   *
   * // Same as:
   * __('default', 'Welcome, $name', { name: 'Padawan' })
   * ```
   */
  _: typeof _

  /**
   * Fetch and display translated `text` from the specified `domain` in the current language.
   * This function is designed for **Vue** applications.
   * For server-side use, import the same-named function from `#pruvious/server`.
   *
   * The current language is stored in the browser's local storage.
   * If the translation is not found in the current lang
   *
   * @example
   * ```typescript
   * __('blog', 'Displayed: $count $entries', { count: 1 }) // 'Displayed: 1 post
   * __('blog', 'Displayed: $count $entries', { count: 2 }) // 'Displayed: 2 posts
   * ```
   */
  __: typeof __
}

export type FieldValidatorContext = FieldInputContext &
  TranslationHelpersContext & {
    /**
     * Represents all sanitized and casted field inputs for multiple records.
     *
     * This property is only available when creating or reading multiple records.
     */
    allInputs?: Record<string, any>[]

    /**
     * Represents the sanitized and casted fields input.
     *
     * It is a regular key-value object, where the key represents the field name, and the value represents the field's value.
     *
     * During read operations, the `input` object represents the current queried record.
     */
    input: Record<string, any>

    /**
     * The current query operation.
     */
    operation: 'create' | 'read' | 'update'

    /**
     * The current query builder instance.
     * Utilize `query.clone()` to execute custom queries, such as data retrieval.
     */
    currentQuery: QueryBuilderInstance<CollectionName>

    /**
     * Utility function for creating a new query builder.
     */
    query: typeof query

    /**
     * The resolved definition of the currently queried collection.
     */
    collection: ResolvedCollectionDefinition

    /**
     * Resolved definitions of all registered collections.
     */
    collections: Record<CollectionName, ResolvedCollectionDefinition>

    /**
     * A key-value object with the current validation errors.
     * Errors can be thrown in the validator function or set manually in this object.
     */
    errors: Record<string, string>

    /**
     * Preferred user language for displaying validation errors.
     */
    language: SupportedLanguage
  }

export type FieldGuard =
  | ((context: FieldGuardContext) => any | Promise<any>)
  | {
      /**
       * Determines whether to call this guard before creating records.
       *
       * Note: This parameter is only applicable to multi-entry collections.
       *
       * @default false
       */
      onCreate?: boolean

      /**
       * Determines whether to call this guard before updating records.
       *
       * @default false
       */
      onUpdate?: boolean

      /**
       * The guard function.
       *
       * It accepts a `context` argument, which includes the following:
       *
       * - `_` - A helper function used to display validation errors in the default domain and a specific language.
       * - `__` - A helper function used to display validation errors in a specific domain and language.
       * - `allInputs` - An array of input values used for creating multiple record.
       * - `cache` - A shared key-record object for caching queries across all guards.
       * - `currentQuery` - The current query builder instance.
       * - `definition` - The resolved field definition object.
       * - `fields` - An object representing all field definitions using key-value pairs.
       * - `input` - The input values used for creating or updating a record.
       * - `language` - Preferred user language for displaying validation errors.
       * - `name` - The property name used for declaring the field in a collection or block.
       * - `operation` - The current query operation.
       * - `options` - The resolved field options used when declaring the field in a collection or block.
       * - `query` - Utility function for creating a new query builder.
       * - `user` - The currently logged-in user or `null`.
       * - `value` - The field value.
       */
      guard: (context: FieldGuardContext) => any | Promise<any>
    }

export type FieldSanitizer =
  | ((context: FieldSanitizerContext) => any | Promise<any>)
  | {
      /**
       * Determines whether to call this sanitizer before creating records.
       *
       * @default false
       */
      onCreate?: boolean

      /**
       * Determines whether to call this sanitizer before updating records.
       *
       * @default false
       */
      onUpdate?: boolean

      /**
       * The sanitizer function.
       */
      sanitizer: (context: FieldSanitizerContext) => any | Promise<any>
    }

export type FieldValidator =
  | ((context: FieldValidatorContext) => any | Promise<any>)
  | {
      /**
       * Determines whether to call this validator before creating records.
       *
       * @default false
       */
      onCreate?: boolean

      /**
       * Determines whether to call this validator after fetching records from the database.
       *
       * @default false
       */
      onRead?: boolean

      /**
       * Determines whether to call this validator before updating records.
       *
       * @default false
       */
      onUpdate?: boolean

      /**
       * The validator function.
       *
       * It accepts a `context` argument, which includes the following:
       *
       * - `_` - A helper function used to display validation errors in the default domain and a specific language.
       * - `__` - A helper function used to display validation errors in a specific domain and language.
       * - `allInputs` - All sanitized and casted field inputs or records (only available when creating or reading multiple records).
       * - `collection` - The resolved definition of the currently queried collection.
       * - `collections` - An object containing all collection definitions.
       * - `currentQuery` - The current query builder instance.
       * - `definition` - The resolved field definition object.
       * - `errors` - A key-value object with the current validation errors.
       * - `fields` - An object representing all field definitions using key-value pairs.
       * - `input` - An object containing sanitized and casted fields for processing.
       * - `language` - Preferred user language for displaying validation errors.
       * - `name` - The property name used for declaring the field in a collection or block.
       * - `operation` - The current query operation.
       * - `options` - The resolved field options used when declaring the field in a collection or block.
       * - `query` - Utility function for creating a new query builder.
       * - `value` - The field value.
       */
      validator: (context: FieldValidatorContext) => any | Promise<any>
    }

export interface FieldPopulation {
  /**
   * The JavaScript and TypeScript field type returned from the `populator` function.
   *
   * If a string is provided, it will be used for both JavaScript and TypeScript types.
   *
   * @example
   * ```typescript
   * defineField({
   *   name: 'time-range',
   *   type: { js: 'object', ts: '[number, number]' },
   *   options: {},
   *   population: {
   *     type: { js: 'object', ts: '[string, string]' },
   *     populator: ({ value }) => value ? [new Date(value[0]).toISOString(), new Date(value[1]).toISOString()] : null,
   *   },
   * })
   * ```
   */
  type:
    | {
        /**
         * The JavaScript data type of the field value returned from the `populator` function..
         *
         * Note: Arrays are objects.
         */
        js: 'boolean' | 'number' | 'object' | 'string'

        /**
         * The **stringified** TypeScript type of the field value returned from the `populator` function.
         * If not specified, the type of the `js` value will be used by default.
         *
         * You can use a function to dynamically generate this type.
         * It accepts a `context` argument with the following properties:
         *
         * - `definition` - The resolved field definition object.
         * - `fields` - An object representing all field definitions using key-value pairs.
         * - `name` - The property name used for declaring the field in a collection or block.
         * - `options` - The resolved field options used when declaring the field in a collection or block.
         *
         * Note: You can utilize all dynamically generated types by importing them from the `#pruvious` alias.
         *
         * @example
         * ```typescript
         * '[string, string]'
         * ```
         */
        ts?: string | ((context: FieldTypeContext) => string)
      }
    | 'boolean'
    | 'number'
    | 'object'
    | 'string'

  /**
   * A function that transforms the **casted** field `value` into it's **populated** form.
   *
   * It accepts a `context` argument, which includes the following:
   *
   * - `currentQuery` - The current query builder instance.
   * - `definition` - The resolved field definition object.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `query` - Utility function for creating a new query builder.
   * - `value` - The field value.
   *
   * @example
   * ```typescript
   * defineField({
   *   name: 'time-range',
   *   type: { js: 'object', ts: '[number, number]' },
   *   options: {},
   *   population: {
   *     type: { js: 'object', ts: '[string, string]' },
   *     populator: ({ value }) => value ? [new Date(value[0]).toISOString(), new Date(value[1]).toISOString()] : null,
   *   },
   * })
   * ```
   */
  populator: (context: FieldPopulatorContext) => any | Promise<any>
}

export interface FieldInputMeta {
  /**
   * The allowed input type as a **stringified** TypeScript type.
   * If you specify a type that doesn't match with the **casted** field type, make sure to transform the field value using `sanitizers`.
   *
   * You can use a function to dynamically generate this type.
   * It accepts a `context` argument with the following properties:
   *
   * - `definition` - The resolved field definition object.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   *
   * By default, it returns the casted TypeScript field type.
   *
   * @example
   * ```typescript
   * defineField({
   *   ...
   *   type: 'number', // casted type
   *   sanitizers: [
   *     ({ value }) => isString(value) ? +value : value,
   *     ...
   *   ],
   *   inputMeta: {
   *     type: "'string' | 'number'", // input type
   *   },
   * })
   * ```
   */
  type?: string | ((context: FieldTypeContext) => string)

  /**
   * A function that returns a boolean value that indicates whether the field input is required in the `create` and `createMany`
   * methods of the query builder. In the `update` method, it's always optional.
   *
   * The function accepts a `context` argument containing the field `definition` and the property `name` and `options` used in the declaration.
   *
   * @default () => false
   *
   * @example
   * ```typescript
   * ({ options }) => !!options.required
   * ```
   */
  required?: (context: FieldContext) => boolean

  /**
   * A function that generates the code comment shown for the field in input objects.
   * Return an array to handle line breaks.
   *
   * The function accepts a `context` argument containing the field `definition` and the property `name` and `options` used in the declaration.
   *
   * @default () => ''
   *
   * @example
   * ```typescript
   * ({ options }) => options.description || ''
   * ```
   */
  codeComment?: (context: FieldContext) => string | string[]
}

export interface FieldAdditional {
  /**
   * An array of additional sanitizers to consistently apply against user inputs for this field.
   * The sanitizers are sequentially applied based on their order within the array, after the default field sanitizers.
   *
   * Sanitizers are applied before executing `validators`.
   *
   * Each sanitizer function accepts a `context` argument with the following properties:
   *
   * - `definition` - The resolved field definition object.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `input` - A key-value object containing raw input values.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `operation` - The current query operation.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `query` - Utility function for creating a new query builder.
   * - `value` - The field value.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [({ value }) => value === 'Voldemort' ? 'You-Know-Who' : value]
   * ```
   */
  sanitizers?: FieldSanitizer[]

  /**
   * Defines conditional logic for displaying and processing a field.
   * Fields that don't comply with this logic are set to their value, and further validation is skipped.
   *
   * Use relative paths to reference fields. Examples: `fieldName`, `./fieldName`, `../fieldName`.
   * Use absolute paths to reference top-level fields, e.g., `/topLevelField`.
   * Dot notation allows access to sub-fields, e.g., `parentField.childField`.
   * You can specify fields in a specific array element, like `repeaterField.0.subField`.
   *
   * @default undefined
   *
   * @example
   * ```typescript
   * // Match if sibling field 'foo' is true
   * { foo: true }
   *
   * // Match if parent (repeater) has more than 2 items
   * { '..': { gt: 2 } }
   *
   * // Match if 'foo' is true and 'bar' is 'baz' or 'qux'
   * { foo: true, $some: [{ bar: 'baz' }, { bar: 'qux' }] }
   * // More verbose alternative:
   * { $every: [{ foo: true }, { $some: [{ bar: 'baz' }, { bar: 'qux' }] }] }
   * ```
   */
  conditionalLogic?: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string>

  /**
   * An array of additional validators to consistently execute against user inputs for this field.
   * The validators are sequentially executed based on their order within the array, after the default field validators.
   *
   * Validators are executed after `sanitizers`.
   *
   * Each validator function accepts a `context` argument, which includes the following:
   *
   * - `allInputs` - All sanitized and casted field inputs or records (only available when creating or reading multiple records).
   * - `collections` - An object containing all collection definitions.
   * - `currentQuery` - The current query builder instance.
   * - `definition` - The resolved field definition object.
   * - `errors` - A key-value object with the current validation errors.
   * - `input` - An object containing sanitized and casted fields for processing.
   * - `name` - The property name used for declaring the field in a collection or block.
   * - `operation` - The current query operation.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `query` - Utility function for creating a new query builder.
   * - `value` - The field value.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [
   *   ({ _, language, value }) => {
   *     if (value === 'Voldemort') {
   *       throw new Error(_(language, 'Please pick a Muggle-friendly name'))
   *     }
   *   },
   * ]
   * ```
   */
  validators?: FieldValidator[]

  /**
   * Specifies the field's population settings.
   * If specified, they will override the default field `population` settings.
   *
   * @default undefined
   */
  population?: FieldPopulation

  /**
   * Specifies whether the field is hidden in the dashboard.
   *
   * @default false
   */
  hidden?: boolean
}

export interface CollectionFieldAdditional extends FieldAdditional {
  /**
   * Specifies whether to add an index to the column where the field value is stored.
   *
   * Note: Indexes are functional exclusively within multi-entry collections.
   *
   * @default false
   */
  index?: boolean

  /**
   * Determines whether the field value should be unique among records sharing the same `language` in the collection table.
   * If set to `perLanguage`, a unique constraint, including this field and the `language` field, will be created.
   * If set to `allLanguages`, the unique constraint will including only this field.
   *
   * To ensure unique input values, include `uniqueValidator` in the `validators` array.
   *
   * Note: This feature has limited support for SQLite databases.
   *       In SQLite, a normal composite index will be created instead of a unique constraint.
   *       For more details, see: https://github.com/sequelize/sequelize/pull/13647
   *
   * Unique constraints are only operational within multi-entry collections.
   *
   * @default false
   */
  unique?: 'perLanguage' | 'allLanguages' | false

  /**
   * Specifies whether the field column allows null values.
   *
   * Note: This option is applicable only to multi-entry collections.
   *
   * @default true
   */
  nullable?: boolean

  /***
   * Defines whether to establish a foreign key constraint on this field's column.
   *
   * Note: Foreign keys are functional exclusively with multi-entry collections.
   *
   * @default false
   */
  foreignKey?:
    | {
        /**
         * The name of the table to which the foreign key refers.
         * Collection tables use snake case, unlike the collection name, which is in kebab case
         * (e.g., the table for `collection-name` is `collection_name`).
         */
        table: string

        /**
         * The name of the column to which the foreign key refers.
         * Field columns are named in snake case, unlike the field name, which is in camel case
         * (e.g., the column for `fieldName` is `field_name`).
         *
         * @default 'id'
         */
        column?: string

        /**
         * A tuple specifying referential actions for the foreign key constraint when updates or deletions occur in the referenced table.
         *
         * @default ['ON UPDATE RESTRICT', 'ON DELETE SET NULL']
         */
        action?: [
          'ON UPDATE RESTRICT' | 'ON UPDATE CASCADE' | 'ON UPDATE SET NULL',
          'ON DELETE RESTRICT' | 'ON DELETE CASCADE' | 'ON DELETE SET NULL',
        ]
      }
    | false

  /**
   * Locks the field after creating, preventing it from updating.
   *
   * @default false
   */
  immutable?: boolean

  /**
   * Indicates if this field is translatable.
   * When set to `false`, the field value is synchronized across records that are translations of each other.
   * Please note that this feature is meaningful only when the field is declared within translatable collections.
   *
   * @default true
   */
  translatable?: boolean

  /**
   * An array of guards executed during the creation or updating of this field via the standard **API** routes
   * `/api/collections/[collection-name]`.
   * Guards are executed in sequence according to their array order, with the exception that they are not applied to admin users.
   *
   * Field guards come into play after the execution of collection guards.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [
   *   ({ _, language, name, user }) => {
   *     if (hasCapability(user, 'avada-kedavra')) {
   *       throw new Error(_(language, "The field '$name' is magic-immune", { name }))
   *     }
   *   },
   * ]
   * ```
   */
  guards?: FieldGuard[]

  /**
   * The label displayed in the dashboard when the field value is empty.
   *
   * @default '-'
   */
  emptyLabel?: string

  /**
   * Protected fields cannot be queried or returned by the standard API routes `/api/collections/[collection-name]`.
   *
   * @default false
   */
  protected?: boolean
}

export interface ResolvedFieldPopulation extends Required<FieldPopulation> {
  type: Required<FieldPopulation['type']> & object
}

export interface ResolvedFieldDefinition extends Required<FieldDefinition> {
  type: Required<FieldDefinition['type']> & object
  population: ResolvedFieldPopulation | false
  inputMeta: Required<FieldInputMeta>
}

export type ConditionalLogic =
  | { $every: (Record<string, ConditionalRule | boolean | number | string> | ConditionalLogic)[] }
  | { $some: (Record<string, ConditionalRule | boolean | number | string> | ConditionalLogic)[] }

export type ConditionalRule =
  | { eq: boolean | number | string }
  | { ne: boolean | number | string }
  | { gt: number | string }
  | { gte: number | string }
  | { lt: number | string }
  | { lte: number | string }
  | { regexp: string }

export function dbToJsType(type: 'BIGINT' | 'BOOLEAN' | 'DECIMAL' | 'INTEGER' | 'TEXT' | undefined) {
  return type ? (type === 'TEXT' ? 'string' : type === 'BOOLEAN' ? 'boolean' : 'number') : 'unknown'
}

export function resolveFieldPopulation(
  population: FieldPopulation | false | undefined,
): ResolvedFieldPopulation | false {
  return population
    ? {
        type: isString(population.type)
          ? { js: population.type, ts: population.type }
          : {
              js: population.type.js,
              ts: population.type.ts || population.type.js,
            },
        populator: population.populator,
      }
    : false
}

/**
 * Create a custom field type to be used in collections and blocks.
 *
 * This will automatically generate two functions intented to be used in Vue block components to declare prop types.
 * The function names are derived from the camel-cased field `name` and the `Field` or `Fields` suffix.
 *
 * Example 1: `defineField({ name: 'video', ... })` generates the functions `videoField()` and `videoSubfield()`.
 *
 * Example 2: `defineField({ name: 'time-range', ... })` generates the functions `timeRangeField()` and `timeRangeSubfield()`.
 *
 * To create your own Vue helpers for this field, additionally export the functions named `vueField` and `vueSubfield` from here.
 * They should accept at least two arguments, with the first reserved for the field `options` and the second for `additional` field settings.
 * The first function must return a valid Vue prop type value (e.g., `String`, `Object as unknown as PropType<...>`, etc.).
 * The second function must return the same just without `PropType` (e.g., `String`,
 */
export function defineField(definition: FieldDefinition): ResolvedFieldDefinition {
  return {
    name: definition.name,
    type: isString(definition.type)
      ? {
          js: definition.type,
          ts: definition.type,
          db: definition.type === 'boolean' ? 'BOOLEAN' : definition.type === 'number' ? 'DECIMAL' : 'TEXT',
        }
      : {
          js: definition.type.js,
          ts: definition.type.ts || definition.type.js,
          db:
            definition.type.db ||
            (definition.type.js === 'boolean' ? 'BOOLEAN' : definition.type.js === 'number' ? 'DECIMAL' : 'TEXT'),
        },
    default: definition.default || (() => null),
    vueComponent: definition.vueComponent,
    vuePreviewComponent: definition.vuePreviewComponent ?? '',
    options: definition.options,
    sanitizers: definition.sanitizers || [],
    conditionalLogicMatcher:
      definition.conditionalLogicMatcher ||
      (({ conditionalLogic, definition, input, name, options }) => {
        if (!matchesConditionalLogic(input, name, conditionalLogic)) {
          setProperty(input, name, definition.default({ definition, name, options }))
          return false
        }

        return true
      }),
    validators: definition.validators || [],
    population: resolveFieldPopulation(definition.population),
    extractKeywords:
      definition.extractKeywords ||
      (({ value }) => (isObject(value) ? JSON.stringify(value) : isNull(value) ? '' : String(value))),
    serialize: definition.serialize ?? null,
    deserialize: definition.deserialize ?? null,
    inputMeta: {
      type:
        definition.inputMeta?.type ||
        ((context) =>
          isString(context.definition.type)
            ? context.definition.type
            : (isString(context.definition.type.ts)
                ? context.definition.type.ts
                : context.definition.type.ts(context)) || context.definition.type.js),
      required: definition.inputMeta?.required || (() => false),
      codeComment: definition.inputMeta?.codeComment || (() => ''),
    },
  }
}
