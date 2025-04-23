import {
  resolveCustomComponentPath,
  type Blocks,
  type Collections,
  type GenericDatabase,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import {
  Field,
  type ConditionalLogic,
  type ContextField,
  type Database,
  type DeleteContext,
  type FieldDefinition,
  type GenericFieldModel,
  type InsertContext,
  type SanitizedContextField,
  type SanitizedInsertContext,
  type SanitizedUpdateContext,
  type SelectContext,
  type UpdateContext,
  type Validator,
} from '@pruvious/orm'
import {
  cleanMerge,
  deepClone,
  isDefined,
  omit,
  pick,
  type DefaultFalse,
  type DefaultTrue,
  type OmitUndefined,
} from '@pruvious/utils'
import { colorize } from 'consola/utils'
import { hash } from 'ohash'
import type { PropType } from 'vue'
import { warnWithContext } from '../debug/console'
import type { ResolveFromLayersResult } from '../utils/resolve'
import { transformFieldGuardsToValidators } from './guards'

export interface DefineFieldOptions<
  TModel extends GenericFieldModel,
  TNullable extends boolean | undefined,
  TCustomOptions extends Record<string, any> | undefined,
  TUIOptions extends GenericPickFieldUIOptions | undefined | false,
  TOmitOptions extends keyof CombinedFieldOptions<
    TModel,
    TModel['TOptions'],
    DefaultFalse<TNullable>,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >,
> {
  /**
   * The field's model.
   *
   * The value must be an instance of `FieldModel`.
   * It defines the field's core configuration, including data type, default value, serializers, sanitizers, validators, and more.
   *
   * @see https://pruvious.com/docs/field-models (@todo set up this link)
   *
   * @example
   * ```ts
   * import { defineField } from '#pruvious/server'
   * import { textFieldModel } from '@pruvious/orm'
   *
   * export default defineField({
   *   model: textFieldModel(),
   *   // ...
   * })
   * ```
   */
  model: TModel

  /**
   * A function that returns a string representing the field's TypeScript type after casting.
   * It is used for resolving relational field types from other collections in cases where circular references prevent automatic type inference.
   *
   * If not specified, the field type is automatically resolved from the field model's `dataType`:
   *
   * - `bigint`  => `number`
   * - `boolean` => `boolean`
   * - `numeric` => `number`
   * - `text`    => `string`
   *
   * The `nullable` option is also taken into account when determining the casted type.
   *
   * The function receives a `context` object with the following properties:
   *
   * - `field` - The current field instance.
   * - `collections` - An object containing all collection definitions (key-value pairs).
   * - `blocks` - An object containing all block definitions (key-value pairs).
   *
   * @example
   * ```ts
   * () => number[]
   * ```
   */
  castedTypeFn?: (context: {
    field: Field<
      TModel,
      TModel['TOptions'] & (TCustomOptions extends undefined ? never : TCustomOptions),
      DefaultFalse<TNullable>,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      GenericDatabase
    >
    collections: Collections
    blocks: Blocks
  }) => string

  /**
   * A function that returns a string representing the field's TypeScript type after populating.
   * It is used for resolving relational field types from other collections in cases where circular references prevent automatic type inference.
   *
   * If not specified, the field type is automatically resolved from the field model's `dataType`:
   *
   * - `bigint`  => `number`
   * - `boolean` => `boolean`
   * - `numeric` => `number`
   * - `text`    => `string`
   *
   * The `nullable` option is also taken into account when determining the populated type.
   *
   * The function receives a `context` object with the following properties:
   *
   * - `field` - The current field instance.
   * - `collections` - An object containing all collection definitions (key-value pairs).
   * - `blocks` - An object containing all block definitions (key-value pairs).
   *
   * @example
   * ```ts
   * ({ options }) => `(${options.allowValues.map((value) => `'${value}'`).join(' | ')})[]`
   * ```
   */
  populatedTypeFn?: (context: {
    field: Field<
      TModel,
      TModel['TOptions'] & (TCustomOptions extends undefined ? never : TCustomOptions),
      DefaultFalse<TNullable>,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      GenericDatabase
    >
    collections: Collections
    blocks: Blocks
  }) => string

  /**
   * A function that returns a string representing the field's TypeScript type for input values in blocks.
   * It is used for resolving field types in blocks where circular references prevent automatic type inference.
   *
   * If not specified, the field type is automatically resolved from the field model's `dataType`:
   *
   * - `bigint`  => `number | string`
   * - `boolean` => `Booleanish`
   * - `numeric` => `number | string`
   * - `text`    => `number | string`
   *
   * The `nullable` option is also taken into account when determining the input type.
   *
   * The function receives a `context` object with the following properties:
   *
   * - `field` - The current field instance.
   * - `collections` - An object containing all collection definitions (key-value pairs).
   * - `blocks` - An object containing all block definitions (key-value pairs).
   *
   * @example
   * ```ts
   * ({ options }) => `(${options.allowValues.map((value) => `'${value}'`).join(' | ')})[]`
   * ```
   */
  inputTypeFn?: (context: {
    field: Field<
      TModel,
      TModel['TOptions'] & (TCustomOptions extends undefined ? never : TCustomOptions),
      DefaultFalse<TNullable>,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      GenericDatabase
    >
    collections: Collections
    blocks: Blocks
  }) => string

  /**
   * Determines if the field can accept `null` values.
   *
   * @default false
   */
  nullable?: TNullable

  /**
   * The default value for the field.
   * If not specified, the field model's `defaultValue` is used.
   *
   * @default undefined
   */
  default?: TModel['TCastedType'] | (DefaultFalse<TNullable> extends true ? null : never)

  /**
   * An array of callback functions that sanitize an input value for this field model.
   * The functions receive the following arguments in order:
   *
   * - `value` - The input value to sanitize.
   * - `contextField` - The current context field object.
   *
   * Sanitizers defined here run after the default sanitizers specified by the field's `model`.
   *
   * @default []
   *
   * @example
   * ```ts
   * new FieldModel<{}, 'boolean', boolean, Booleanish>({
   *   dataType: 'boolean',
   *   sanitizers: [(value) => castToBoolean(value)],
   *   // ...
   * })
   * ```
   */
  sanitizers?: ((
    /**
     * The input value to sanitize.
     */
    value: TModel['TCastedType'],

    /**
     * The current context field object.
     */
    contextField: ContextField<
      TModel,
      TModel['TOptions'] & (TCustomOptions extends undefined ? never : TCustomOptions),
      DefaultFalse<TNullable>,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      Database,
      InsertContext<GenericDatabase> | UpdateContext<GenericDatabase>
    >,
  ) => TModel['TCastedType'] | null | Promise<TModel['TCastedType'] | null>)[]

  /**
   * An array of callback functions that validate an input value for this field.
   * The functions receive the following arguments in order:
   *
   * - `value` - The input value to validate.
   * - `sanitizedContextField` - The current context field object.
   * - `errors` - An object for storing validation errors (keys use dot notation).
   *
   * Functions should throw an error or set an error message in `errors` if the value is invalid.
   *
   * Validators execute sequentially:
   *
   * - first running the built-in validators for the selected field `model`,
   * - then running the validators defined here,
   * - and finally the validators from the field options as specified when declaring the field in a collection, singleton, or block.
   *
   * @default []
   *
   * @example
   * ```ts
   * [
   *   (value, sanitizedContextField, errors) => {
   *     if (value === 'Voldemort') {
   *       throw new Error('You know who')
   *     }
   *   },
   * ]
   * ```
   */
  validators?: Validator<
    TModel,
    TModel['TOptions'] & (TCustomOptions extends undefined ? never : TCustomOptions),
    DefaultFalse<TNullable>,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >[]

  /**
   * A function that transforms the field value into a format suitable for application use.
   * It can be used retrieve related data from the database, format the value, or perform other operations.
   * Populators are executed before the query builder returns the resulting rows.
   *
   * The function receives the following arguments in order:
   *
   * - `value` - The casted field value.
   * - `contextField` - The current context field object.
   *
   * The function should return the populated field value or a `Promise` that resolves to it.
   *
   * If not specified, the default populator of the field `model` is used (if available).
   *
   * @default undefined
   *
   * @example
   * ```ts
   * (value, { context }) => {
   *   return value === 'Voldemort' ? context._('You know who') : value
   * }
   * ```
   */
  populator?: (
    /**
     * The casted field value.
     */
    value: TModel['TCastedType'],

    /**
     * The current context field object.
     */
    contextField: ContextField<
      TModel,
      TModel['TOptions'] & (TCustomOptions extends undefined ? never : TCustomOptions),
      DefaultFalse<TNullable>,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      Database,
      | SanitizedInsertContext<GenericDatabase>
      | SelectContext<GenericDatabase>
      | SanitizedUpdateContext<GenericDatabase>
      | DeleteContext<GenericDatabase>
    >,
  ) => TModel['TPopulatedType'] | Promise<TModel['TPopulatedType']>

  /**
   * An object containing custom options specific to the field type, along with their default values.
   *
   * - Object keys represent the custom option names.
   * - Object values are the default values for each custom option.
   *
   * These options are merged with the `FieldDefinition` and `FieldModelDefinition` options.
   *
   * Reserved option names:
   *
   * - `autoGenerated` - Indicates if the field value is automatically generated.
   * - `conditionalLogic` - Defines conditional logic for this field.
   * - `default` - The default value for the field.
   * - `dependencies` - Defines which other fields become required when this field is present.
   * - `immutable` - Determines if the field value cannot be changed after initial creation (only applies to top-level fields).
   * - `nullable` - Determines if the field can accept `null` values.
   * - `required` - Specifies whether the field value is mandatory during creation.
   *
   * Special option names:
   *
   * - `structure` - A map of key-value objects with `Field` instances describing each item of a structure.
   * - `subfields` - A key-value object of `Field` instances representing the subfields of a field.
   * - `ui` - An object that configures how this field is displayed in the user interface.
   *
   * @example
   * ```ts
   * import { defineField } from '#pruvious/server'
   *
   * const customOptions: {
   *   foo: boolean
   *   bar?: string
   * } = {
   *   // Set default values here (even for required options)
   *   foo: true,
   *   bar: '',
   * }
   *
   * export default defineField({
   *   customOptions,
   *   // ...
   * })
   * ```
   */
  customOptions?: TCustomOptions

  /**
   * Controls which settings are available for customizing this field's appearance in the user interface.
   * These UI options can be configured per field using `defineField({ ui: { ... } })`.
   * You can selectively enable/disable specific UI options, or set to `false` to disable all UI options.
   *
   * @default
   * {
   *   hidden: true,
   *   label: true,
   *   description: true,
   *   placeholder: false,
   *   dataTable: true,
   *   customComponent: true,
   *   customTableComponent: true,
   *   customFilterComponent: true
   * }
   */
  uiOptions?: TUIOptions

  /**
   * Specifies which option names should be excluded from the field options during field instance creation.
   * This is useful when certain options don't apply to a specific field type.
   *
   * @default []
   *
   * @example
   * ```ts
   * // server/fields/integer.ts
   * import { defineField } from '#pruvious/server'
   *
   * export default defineField({
   *   model: numberFieldModel(),
   *   omitOptions: ['decimalPlaces'],
   *   // ...
   * })
   * ```
   */
  omitOptions?: TOmitOptions[]
}

export interface PickFieldUIOptions<
  THidden extends boolean | undefined,
  TLabel extends boolean | undefined,
  TDescription extends boolean | undefined,
  TPlaceholder extends boolean | undefined,
  TDataTable extends boolean | undefined,
  TCustomComponent extends boolean | undefined,
  TCustomTableComponent extends boolean | undefined,
  TCustomFilterComponent extends boolean | undefined,
> {
  /**
   * Specifies whether to include a hidden option for the field.
   * This option is used to hide the field from the user interface.
   *
   * @default true
   */
  hidden?: THidden

  /**
   * Specifies whether to include a label option for the field.
   * The label can be provided as a string (non-translatable) or a function that returns a string (translatable).
   *
   * @default true
   */
  label?: TLabel

  /**
   * Specifies whether to include a description option for the field.
   * The description can be provided as a string (non-translatable) or a function that returns a string (translatable).
   *
   * @default true
   */
  description?: TDescription

  /**
   * Specifies whether to include a placeholder option for the field.
   * The placeholder can be provided as a string (non-translatable) or a function that returns a string (translatable).
   *
   * @default false
   */
  placeholder?: TPlaceholder

  /**
   * Specifies whether to include a data table option for the field.
   * This option is used to configure how the field behaves when displayed in a data table.
   *
   * @default true
   */
  dataTable?: TDataTable

  /**
   * Specifies whether to include a custom component option for the field.
   * This option is used to define a custom component for rendering the field in the user interface.
   *
   * @default true
   */
  customComponent?: TCustomComponent

  /**
   * Specifies whether to include a custom table component option for the field.
   * This option is used to define a custom component for rendering the field in the table view.
   *
   * @default true
   */
  customTableComponent?: TCustomTableComponent

  /**
   * Specifies whether to include a custom filter component option for the field.
   * This option is used to define a custom component for rendering the field in data table filters.
   *
   * @default true
   */
  customFilterComponent?: TCustomFilterComponent
}

type GenericPickFieldUIOptions = PickFieldUIOptions<
  boolean | undefined,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined
>

export interface FieldUIOptions<
  THidden extends boolean | undefined,
  TLabel extends boolean | undefined,
  TDescription extends boolean | undefined,
  TPlaceholder extends boolean | undefined,
  TDataTable extends boolean | undefined,
  TCustomComponent extends boolean | undefined,
  TCustomTableComponent extends boolean | undefined,
  TCustomFilterComponent extends boolean | undefined,
> {
  /**
   * Controls the visibility of the field in the user interface.
   * When set to `true`, the field is hidden in forms but remains visible in data tables and accessible via the API.
   *
   * To exclude the field from specific data table views, use the `dataTable` UI option, if available for this field type.
   *
   * @default false
   */
  hidden?: DefaultTrue<THidden> extends true ? boolean : never

  /**
   * The label for the field.
   *
   * If not specified, the field name will be automatically transformed to Title case and used as the label.
   * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * label: 'First name'
   *
   * // Function (translatable)
   * label: ({ __ }) => __('pruvious-dashboard', 'First name')
   *
   * // Field name transformation (default)
   * // Example: the field name `firstName` is transformed into `__('pruvious-dashboard', 'First name')`
   * label: undefined
   * ```
   */
  label?: DefaultTrue<TLabel> extends true
    ? string | ((context: TranslatableStringCallbackContext) => string) | undefined
    : never

  /**
   * The description for the field.
   * Supports basic markdown formatting.
   *
   * For simple descriptions, you can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * For expandable descriptions, use an object with:
   *
   * - `text` - The content that can be expanded or collapsed.
   * - `showLabel` - The label text displayed in the 'Show description' button.
   * - `hideLabel` - The label text displayed in the 'Hide description' button.
   * - `expanded` - Boolean flag to set whether the content is initially expanded (defaults to `false`).
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * description: 'The first name of the user'
   *
   * // Function (translatable)
   * description: ({ __ }) => __('pruvious-dashboard', 'The first name of the user')
   *
   * // Expandable description
   * description: {
   *   text: ({ __ }) => __('pruvious-dashboard', '...'),
   * }
   * ```
   */
  description?: DefaultTrue<TDescription> extends true
    ?
        | string
        | ((context: TranslatableStringCallbackContext) => string)
        | undefined
        | {
            /**
             * The content of the expandable description.
             *
             * You can either provide a string or a function that returns a string.
             * The function receives an object with `_` and `__` properties to access the translation functions.
             */
            text: string | ((context: TranslatableStringCallbackContext) => string)

            /**
             * The label text displayed in the 'Show description' button.
             *
             * You can either provide a string or a function that returns a string.
             * The function receives an object with `_` and `__` properties to access the translation functions.
             *
             * @default
             * ({ __ }) => __('pruvious-dashboard', 'Show description')
             */
            showLabel?: string | ((context: TranslatableStringCallbackContext) => string)

            /**
             * The label text displayed in the 'Hide description' button.
             *
             * You can either provide a string or a function that returns a string.
             * The function receives an object with `_` and `__` properties to access the translation functions.
             *
             * @default
             * ({ __ }) => __('pruvious-dashboard', 'Hide description')
             */
            hideLabel?: string | ((context: TranslatableStringCallbackContext) => string)

            /**
             * Specifies whether the content is initially expanded.
             *
             * @default false
             */
            expanded?: boolean
          }
    : never

  /**
   * The placeholder for the field.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * placeholder: 'Enter your first name'
   *
   * // Function (translatable)
   * placeholder: ({ __ }) => __('pruvious-dashboard', 'Enter your first name')
   * ```
   */
  placeholder?: DefaultFalse<TPlaceholder> extends true
    ? string | ((context: TranslatableStringCallbackContext) => string) | undefined
    : never

  /**
   * Configuration options for how this field behaves when displayed in a data table.
   * Controls visibility, sorting, and filtering capabilities.
   *
   * You can provide either an object with specific settings or a boolean to enable/disable all options at once.
   *
   * @default
   * {
   *   visible: true,
   *   sortable: true,
   *   filterable: true
   * }
   */
  dataTable?: DefaultTrue<TDataTable> extends true
    ?
        | {
            /**
             * Whether this field should be visible as a column in the data table.
             *
             * @default true
             */
            visible?: boolean

            /**
             * Whether this field can be sorted in the data table.
             *
             * @default true
             */
            sortable?: boolean

            /**
             * Whether this field can be filtered in the data table.
             *
             * @default true
             */
            filterable?: boolean
          }
        | boolean
        | undefined
    : never

  /**
   * Custom component to render the field in the user interface.
   * The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
   *
   * The following rules apply:
   *
   * - The function name (`resolvePruviousComponent` or `resolveNamedPruviousComponent`) must remain unchanged and not be aliased.
   * - The import `path` must be a literal string, not a variable.
   * - The import `path` can be:
   *   - A path starting with the alias `>/`.
   *     - This path is resolved relative to the `<srcDir>` directory of the Nuxt layer where the function is called.
   *   - A path starting with the Nuxt alias `@/` or `~/`.
   *     - This path is resolved relative to the first matching `<srcDir>` directory in the Nuxt layer hierarchy.
   *   - An absolute path to a `.vue` component.
   *   - A path for an npm module.
   * - When working within the `<sharedDir>` directory, always use `resolveNamedPruviousComponent()` instead of `resolvePruviousComponent()`.
   *
   * The final component displayed is resolved in the following order, with the first match being used:
   *
   * - It first attempts to render the component `<srcDir>/<pruvious.dir.fields.components>/<dataContainerType>/<dataContainerName>/<fieldPath>.vue`.
   *   - For example, if the field name is `email` and it is defined in the `Users` collection,
   *     it will try to render the component `app/fields/collections/Users/email.vue`.
   *   - In another example, for a nested field: if the field path is `variants.0.color` and it is defined in the `Products` collection,
   *     it will attempt to render the component `app/fields/collections/Products/variants/0/color.vue`,
   *     followed by `app/fields/collections/Products/variants/[n]/color.vue`.
   *   - The directory structure must match the field path structure.
   *     - For instance, the field path `variants.0.color` must correspond to the directory structure
   *       `app/fields/collections/Products/variants/[n]/color.vue`.
   *       The structure `app/fields/collections/Products/variants[n].color.vue` will not work.
   *     - Use `[n]` as a placeholder for array indexes.
   * - It then tries to render the `customComponent` specified in this field's options.
   * - Finally, it attempts to render the component `<srcDir>/<pruvious.dir.fields.components>/<fieldType>.vue`.
   *   - For example, if the field type is `text`, it will try to render the component `app/fields/text.vue`.
   *
   * Field components receive the following props:
   *
   * - @todo
   *
   * Field components can emit the following events:
   *
   * - @todo
   *
   * @example
   * ```ts
   * import { resolvePruviousComponent } from '#pruvious/server'
   *
   * // Correct
   * resolvePruviousComponent('>/components/MyComponent.vue')
   * resolvePruviousComponent('/Project/app/components/MyComponent.vue')
   *
   * // Incorrect
   * resolvePruviousComponent(`>/components/${name}.vue`)
   * resolvePruviousComponent('MyComponent')
   * ```
   */
  customComponent?: DefaultTrue<TCustomComponent> extends true ? string : never

  /**
   * Custom component to render the field in the table view.
   * The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
   *
   * The following rules apply:
   *
   * - The function name (`resolvePruviousComponent` or `resolveNamedPruviousComponent`) must remain unchanged and not be aliased.
   * - The import `path` must be a literal string, not a variable.
   * - The import `path` can be:
   *   - A path starting with the alias `>/`.
   *     - This path is resolved relative to the `<srcDir>` directory of the Nuxt layer where the function is called.
   *   - A path starting with the Nuxt alias `@/` or `~/`.
   *     - This path is resolved relative to the first matching `<srcDir>` directory in the Nuxt layer hierarchy.
   *   - An absolute path to a `.vue` component.
   *   - A path for an npm module.
   * - When working within the `<sharedDir>` directory, always use `resolveNamedPruviousComponent()` instead of `resolvePruviousComponent()`.
   *
   * The final component displayed is resolved in the following order, with the first match being used:
   *
   * - It first attempts to render the component
   *   `<srcDir>/<pruvious.dir.fields.components>/<dataContainerType>/<dataContainerName>/<fieldPath>.table.vue`.
   *   - For example, if the field name is `email` and it is defined in the `Users` collection,
   *     it will try to render the component `app/fields/collections/Users/email.table.vue`.
   *   - In another example, for a nested field: if the field path is `variants.0.color` and it is defined in the `Products` collection,
   *     it will attempt to render the component `app/fields/collections/Products/variants/0/color.table.vue`,
   *     followed by `app/fields/collections/Products/variants/[n]/color.table.vue`.
   *   - The directory structure must match the field path structure.
   *     - For instance, the field path `variants.0.color` must correspond to the directory structure
   *       `app/fields/collections/Products/variants/[n]/color.table.vue`.
   *       The structure `app/fields/collections/Products/variants[n].color.table.vue` will not work.
   *     - Use `[n]` as a placeholder for array indexes.
   * - It then tries to render the `customTableComponent` specified in this field's options.
   * - Finally, it attempts to render the component `<srcDir>/<pruvious.dir.fields.components>/<fieldType>.table.vue`.
   *   - For example, if the field type is `text`, it will try to render the component `app/fields/text.table.vue`.
   *
   * Custom table components receive the following props:
   *
   * - @todo
   *
   * @example
   * ```ts
   * import { resolvePruviousComponent } from '#pruvious/server'
   *
   * // Correct
   * resolvePruviousComponent('>/components/MyComponent.vue')
   * resolvePruviousComponent('/Project/app/components/MyComponent.vue')
   *
   * // Incorrect
   * resolvePruviousComponent(`>/components/${name}.vue`)
   * resolvePruviousComponent('MyComponent')
   * ```
   */
  customTableComponent?: DefaultTrue<TCustomTableComponent> extends true ? string : never

  /**
   * Custom component to render the field in data table filters.
   * The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
   *
   * The following rules apply:
   *
   * - The function name (`resolvePruviousComponent` or `resolveNamedPruviousComponent`) must remain unchanged and not be aliased.
   * - The import `path` must be a literal string, not a variable.
   * - The import `path` can be:
   *   - A path starting with the alias `>/`.
   *     - This path is resolved relative to the `<srcDir>` directory of the Nuxt layer where the function is called.
   *   - A path starting with the Nuxt alias `@/` or `~/`.
   *     - This path is resolved relative to the first matching `<srcDir>` directory in the Nuxt layer hierarchy.
   *   - An absolute path to a `.vue` component.
   *   - A path for an npm module.
   * - When working within the `<sharedDir>` directory, always use `resolveNamedPruviousComponent()` instead of `resolvePruviousComponent()`.
   *
   * The final component displayed is resolved in the following order, with the first match being used:
   *
   * - It first attempts to render the component
   *   `<srcDir>/<pruvious.dir.fields.components>/<dataContainerType>/<dataContainerName>/<fieldPath>.filter.vue`.
   *   - For example, if the field name is `email` and it is defined in the `Users` collection,
   *     it will try to render the component `app/fields/collections/Users/email.filter.vue`.
   *   - In another example, for a nested field: if the field path is `variants.0.color` and it is defined in the `Products` collection,
   *     it will attempt to render the component `app/fields/collections/Products/variants/0/color.filter.vue`,
   *     followed by `app/fields/collections/Products/variants/[n]/color.filter.vue`.
   *   - The directory structure must match the field path structure.
   *     - For instance, the field path `variants.0.color` must correspond to the directory structure
   *       `app/fields/collections/Products/variants/[n]/color.filter.vue`.
   *       The structure `app/fields/collections/Products/variants[n].color.filter.vue` will not work.
   *     - Use `[n]` as a placeholder for array indexes.
   * - It then tries to render the `customfilterComponent` specified in this field's options.
   * - Finally, it attempts to render the component `<srcDir>/<pruvious.dir.fields.components>/<fieldType>.filter.vue`.
   *   - For example, if the field type is `text`, it will try to render the component `app/fields/text.filter.vue`.
   *
   * Custom filter components receive the following props:
   *
   * - @todo
   *
   * @example
   * ```ts
   * import { resolvePruviousComponent } from '#pruvious/server'
   *
   * // Correct
   * resolvePruviousComponent('>/components/MyComponent.vue')
   * resolvePruviousComponent('/Project/app/components/MyComponent.vue')
   *
   * // Incorrect
   * resolvePruviousComponent(`>/components/${name}.vue`)
   * resolvePruviousComponent('MyComponent')
   * ```
   */
  customFilterComponent?: DefaultTrue<TCustomFilterComponent> extends true ? string : never
}

export type GenericFieldUIOptions = FieldUIOptions<
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined
>

export type ResolveFieldUIOptions<TUIOptions extends GenericPickFieldUIOptions | undefined | false> = [
  TUIOptions,
] extends [false]
  ? {}
  : {
      /**
       * Configures how this field is displayed in the user interface.
       */
      ui?: TUIOptions extends undefined
        ? GenericFieldUIOptions
        : TUIOptions extends GenericPickFieldUIOptions
          ? OmitUndefined<
              FieldUIOptions<
                TUIOptions['hidden'],
                TUIOptions['label'],
                TUIOptions['description'],
                TUIOptions['placeholder'],
                TUIOptions['dataTable'],
                TUIOptions['customComponent'],
                TUIOptions['customTableComponent'],
                TUIOptions['customFilterComponent']
              >
            >
          : never
    }

export type CombinedFieldOptions<
  TModel extends GenericFieldModel,
  TOptions extends TModel['TOptions'],
  TNullable extends boolean | undefined,
  TRequired extends boolean | undefined,
  TImmutable extends boolean | undefined,
  TAutoGenerated extends boolean | undefined,
  TConditionalLogic extends ConditionalLogic | undefined,
  TDatabase extends GenericDatabase,
> = Omit<
  FieldDefinition<TModel, TOptions, TNullable, TRequired, TImmutable, TAutoGenerated, TConditionalLogic, TDatabase>,
  'model' | 'options' | 'nullable'
> &
  Omit<TOptions, 'populator'> & {
    /**
     * An array of functions that control access to the field.
     * These functions are only executed during CRUD operations when using the following utility functions from `#pruvious/server`:
     *
     * - `guardedQueryBuilder()`
     * - `guardedInsertInto(collection)`
     * - `guardedSelectFrom(collection)`
     * - `guardedUpdate(collection)`
     * - `guardedDeleteFrom(collection)`
     *
     * Every field guard function receives the following arguments:
     *
     * - `value` - The input value for the field.
     * - `sanitizedContextField` - The current context field object.
     * - `errors` - An object for storing validation errors (keys use dot notation).
     *
     * Field guards act as additional validators that perform permission checks and throw errors when validation fails.
     * Any error messages from guards appear in the `inputErrors` object when getting query builder results.
     * If a guard validation fails, the query builder execution stops, behaving similarly to standard validator failures.
     *
     * @example
     * ```ts
     * // @todo
     * ```
     */
    guards?: FieldGuard<
      TModel,
      TOptions,
      DefaultFalse<TNullable>,
      DefaultFalse<TRequired>,
      DefaultFalse<TImmutable>,
      DefaultFalse<TAutoGenerated>,
      TConditionalLogic,
      GenericDatabase
    >[]
  }

export type FieldGuard<
  TModel extends GenericFieldModel,
  TOptions extends TModel['TOptions'],
  TNullable extends boolean,
  TRequired extends boolean,
  TImmutable extends boolean,
  TAutoGenerated extends boolean,
  TConditionalLogic extends ConditionalLogic | undefined,
  TDatabase extends GenericDatabase,
> = (
  /**
   * The sanitized input value.
   */
  value: TNullable extends false ? TModel['TCastedType'] : TModel['TCastedType'] | null,

  /**
   * The current context field object.
   */
  sanitizedContextField: SanitizedContextField<
    TModel,
    TOptions,
    TNullable,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    TDatabase,
    SanitizedInsertContext<TDatabase> | SanitizedUpdateContext<TDatabase>
  >,

  /**
   * An object for storing validation errors (keys use dot notation).
   */
  errors: Record<string, string>,
) => any

const warned: string[] = []

/**
 * Creates a new field type for Pruvious collections.
 *
 * Use this as the default export in a file within the `server/fields/` directory.
 * The filename determines the field name, which should be in camelCase (e.g. 'gallery.ts', 'googleMaps.ts', etc.).
 *
 * Defined fields can be imported from:
 *
 * - `#pruvious/server` for server-side usage in collection definitions.
 * - `#pruvious/client` for client-side usage in Vue components when defining block fields.
 *
 * ---
 *
 * Each field type can have dedicated components for editing and showing field values in data tables.
 * The components are auto-registered when you create a file with the field name inside the `app/fields/` directory.
 *
 * - For table view components, add `.table` to the filename (e.g., `app/fields/gallery.table.vue`).
 * - For filter components, add `.filter` to the filename (e.g., `app/fields/gallery.filter.vue`).
 * - For regular view components, use no suffix or add `.regular` (e.g., `app/fields/gallery.vue` or `app/fields/gallery.regular.vue`).
 *
 * @see https://pruvious.com/docs/custom-fields (@todo set up this link)
 *
 * @example
 * ```ts
 * // server/fields/myField.ts
 * import { defineField } from '#pruvious/server'
 *
 * const customOptions: {
 *   foo: boolean
 *   bar?: string
 * } = {
 *   // Set default values here (even for required options)
 *   foo: true,
 *   bar: '',
 * }
 *
 * export default defineField({
 *   model: textFieldModel(),
 *   customOptions,
 * })
 * ```
 */
export function defineField<
  TModel extends GenericFieldModel,
  const TNullable extends boolean | undefined,
  const TCustomOptions extends Record<string, any> | undefined,
  const TUIOptions extends GenericPickFieldUIOptions | undefined | false,
  const TOptions extends TModel['TOptions'] = TModel['TOptions'] &
    (TCustomOptions extends undefined ? {} : TCustomOptions) &
    ResolveFieldUIOptions<TUIOptions>,
  const TOmitOptions extends keyof CombinedFieldOptions<
    TModel,
    TModel['TOptions'],
    DefaultFalse<TNullable>,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  > = never,
>(options: DefineFieldOptions<TModel, TNullable, TCustomOptions, TUIOptions, TOmitOptions>) {
  const fieldTypeOptions = options

  return {
    /**
     * Creates a new `Field` instance.
     *
     * This function is intended for server-side use in collection definitions.
     * For client-side usage, import the equivalent function from `#pruvious/client`.
     */
    serverFn: function <
      const TRequired extends boolean | undefined,
      const TImmutable extends boolean | undefined,
      const TAutoGenerated extends boolean | undefined,
      TConditionalLogic extends ConditionalLogic | undefined,
    >(
      options: Omit<
        CombinedFieldOptions<
          TModel,
          TOptions,
          DefaultFalse<TNullable>,
          TRequired,
          TImmutable,
          TAutoGenerated,
          TConditionalLogic,
          GenericDatabase
        >,
        TOmitOptions
      > &
        (TCustomOptions extends undefined ? never : TCustomOptions),
    ): Field<
      TModel,
      TOptions,
      DefaultFalse<TNullable>,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    > {
      const { fieldType, location }: { fieldType: string; location: ResolveFromLayersResult } = this as any
      const defaultCustomOptions = fieldTypeOptions.customOptions ? deepClone(fieldTypeOptions.customOptions) : {}

      for (const reservedOption of [
        'autoGenerated',
        'conditionalLogic',
        'default',
        'dependencies',
        'immutable',
        'nullable',
        'required',
      ]) {
        if (isDefined((defaultCustomOptions as Record<string, any>)[reservedOption])) {
          const warnKey = `${location.file.absolute}:reservedOption:${reservedOption}`
          if (!warned.includes(warnKey)) {
            warned.push(warnKey)
            delete (defaultCustomOptions as Record<string, any>)[reservedOption]
            warnWithContext(
              `The option name \`${reservedOption}\` is reserved and cannot be used as a custom option.`,
              [
                `Reserved option names: ` +
                  ['autoGenerated', 'conditionalLogic', 'default', 'dependencies', 'immutable', 'nullable', 'required']
                    .map((option) => colorize('dim', option))
                    .join(', '),
                `Source: ${colorize('dim', location.file.relative)}`,
              ],
            )
          }
        }
      }

      const customOptionKeys = Object.keys(defaultCustomOptions)
      const omitOptions = (fieldTypeOptions.omitOptions ?? []).filter(
        (option: any) => !customOptionKeys.includes(option),
      )
      const filteredOptions: Record<string, any> = omit(options as any, omitOptions)
      const model = {
        ...fieldTypeOptions.model,
        sanitizers: [...fieldTypeOptions.model.sanitizers, ...(fieldTypeOptions.sanitizers ?? [])],
      }
      const modelOptionKeys = Object.keys(model.defaultOptions)
      const ui: GenericFieldUIOptions = options.ui ? deepClone(options.ui) : {}
      const userProvidedCustomOptions = pick(filteredOptions, customOptionKeys as any)
      const validators = [
        ...transformFieldGuardsToValidators(filteredOptions.guards ?? ([] as any)),
        ...(fieldTypeOptions.validators ?? []),
        ...(filteredOptions.validators ?? []),
      ]

      if (
        ui.customComponent &&
        fieldTypeOptions.uiOptions !== false &&
        fieldTypeOptions.uiOptions?.customComponent !== false
      ) {
        ui.customComponent = ui.customComponent.includes('/')
          ? hash(
              resolveCustomComponentPath({
                component: ui.customComponent,
                file: location.file.absolute,
                srcDir: location.layer.config.srcDir,
              }),
            )
          : ui.customComponent
      }

      if (
        ui.customTableComponent &&
        fieldTypeOptions.uiOptions !== false &&
        fieldTypeOptions.uiOptions?.customTableComponent !== false
      ) {
        ui.customTableComponent = ui.customTableComponent.includes('/')
          ? hash(
              resolveCustomComponentPath({
                component: ui.customTableComponent,
                file: location.file.absolute,
                srcDir: location.layer.config.srcDir,
              }),
            )
          : ui.customTableComponent
      }

      if (
        ui.customFilterComponent &&
        fieldTypeOptions.uiOptions !== false &&
        fieldTypeOptions.uiOptions?.customFilterComponent !== false
      ) {
        ui.customFilterComponent = ui.customFilterComponent.includes('/')
          ? hash(
              resolveCustomComponentPath({
                component: ui.customFilterComponent,
                file: location.file.absolute,
                srcDir: location.layer.config.srcDir,
              }),
            )
          : ui.customFilterComponent
      }

      const field = new Field({
        model,
        options: cleanMerge(
          pick(filteredOptions, modelOptionKeys as any),
          defaultCustomOptions,
          userProvidedCustomOptions,
          fieldTypeOptions.uiOptions !== false
            ? {
                ui: {
                  ...pick(
                    { hidden: false, ...ui },
                    [
                      fieldTypeOptions.uiOptions?.hidden === false ? undefined : 'hidden',
                      fieldTypeOptions.uiOptions?.label === false ? undefined : 'label',
                      fieldTypeOptions.uiOptions?.description === false ? undefined : 'description',
                      fieldTypeOptions.uiOptions?.placeholder === true ? 'placeholder' : undefined,
                      fieldTypeOptions.uiOptions?.dataTable === false ? undefined : 'dataTable',
                      fieldTypeOptions.uiOptions?.customComponent === false ? undefined : 'customComponent',
                      fieldTypeOptions.uiOptions?.customTableComponent === false ? undefined : 'customTableComponent',
                      fieldTypeOptions.uiOptions?.customFilterComponent === false ? undefined : 'customFilterComponent',
                    ].filter(Boolean) as (keyof GenericFieldUIOptions)[],
                  ),
                  ...(defaultCustomOptions as any).ui,
                  ...omit(userProvidedCustomOptions.ui, [
                    'customComponent',
                    'customTableComponent',
                    'customFilterComponent',
                  ]),
                },
              }
            : ({} as any),
          { populator: fieldTypeOptions.populator },
          { _fieldType: fieldType, _dataType: model.dataType },
        ) as any,
        nullable: fieldTypeOptions.nullable ?? false,
        default: fieldTypeOptions.default,
        ...omit(filteredOptions, [...modelOptionKeys, 'guards'] as any),
        validators,
      }) as any

      const typeMap = { bigint: 'number', boolean: 'boolean', numeric: 'number', text: 'string' }
      const nullUnion = fieldTypeOptions.nullable ? ' | null' : ''
      field.castedTypeFn = fieldTypeOptions.castedTypeFn ?? (() => typeMap[model.dataType] + nullUnion)
      field.populatedTypeFn = fieldTypeOptions.populatedTypeFn ?? (() => typeMap[model.dataType] + nullUnion)
      field.inputTypeFn =
        fieldTypeOptions.inputTypeFn ??
        (() => (model.dataType === 'boolean' ? 'Booleanish' : 'number | string') + nullUnion)

      return field
    },

    /**
     * Creates a new `Field` instance.
     *
     * This function is intended for client-side use in Vue components.
     * For server-side usage, import the equivalent function from `#pruvious/server`.
     */
    clientFn: function <
      const TRequired extends boolean | undefined,
      const TImmutable extends boolean | undefined,
      const TAutoGenerated extends boolean | undefined,
      TConditionalLogic extends ConditionalLogic | undefined,
    >(
      options: Omit<
        CombinedFieldOptions<
          TModel,
          TOptions,
          DefaultFalse<TNullable>,
          TRequired,
          TImmutable,
          TAutoGenerated,
          TConditionalLogic,
          GenericDatabase
        >,
        TOmitOptions
      > &
        (TCustomOptions extends undefined ? never : TCustomOptions),
    ): { type: PropType<TModel['TPopulatedType']>; required: true } & {
      field: Field<
        TModel,
        TOptions,
        DefaultFalse<TNullable>,
        TRequired,
        TImmutable,
        TAutoGenerated,
        TConditionalLogic,
        GenericDatabase
      >
    } {
      return null as any
    },

    /**
     * Represents the type structure for this field's configuration options.
     *
     * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
     */
    TOptions: undefined as unknown as Omit<
      CombinedFieldOptions<
        TModel,
        TOptions,
        DefaultFalse<TNullable>,
        boolean,
        boolean,
        boolean,
        ConditionalLogic | undefined,
        GenericDatabase
      >,
      TOmitOptions
    > &
      (TCustomOptions extends undefined ? never : TCustomOptions),
  }
}
