import type {
  DeleteContext,
  InsertContext,
  SanitizedInsertContext,
  SanitizedUpdateContext,
  SelectContext,
  UpdateContext,
} from './Context'
import type { ContextField } from './ContextField'
import type { Database, GenericDatabase } from './Database'
import type { GenericField, InputFilters } from './Field'
import type { SanitizedContextField } from './SanitizedContextField'
import type { ConditionalLogic, DataType, SerializedType } from './types'

interface IFieldModel {
  /**
   * The primitive data type of the field.
   * For top-level fields, this determines the database column type.
   *
   * Supported data types:
   *
   * - `bigint`
   * - `boolean`
   * - `numeric`
   * - `text`
   */
  dataType: string

  /**
   * The default value for the field.
   */
  defaultValue: any

  /**
   * Default option values for all fields of this model type.
   */
  defaultOptions: any

  /**
   * An optional function that serializes the field value before saving it to the database.
   * Only applies to top-level fields.
   *
   * @example
   * ```ts
   * (value) => isNull(value) ? null : JSON.stringify(value)
   * ```
   */
  serializer?: any

  /**
   * An optional function that deserializes the field value after reading it from the database.
   * Only applies to top-level fields.
   *
   * @example
   * ```ts
   * (value) => isNull(value) ? null : JSON.parse(value)
   * ```
   */
  deserializer?: any

  /**
   * An array of callback functions that sanitize an input value for this field model.
   * The functions receive the following arguments in order:
   *
   * - `value` - The input value to sanitize.
   * - `contextField` - The current context field object.
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
  sanitizers?: any

  /**
   * An array of callback functions that validate an input value for this field model.
   * The functions receive the following arguments in order:
   *
   * - `value` - The input value to validate.
   * - `sanitizedContextField` - The current context field object.
   * - `errors` - An object for storing validation errors (keys use dot notation).
   *
   * Functions should throw an error or set an error message in `errors` if the value is invalid.
   *
   * Validators specified here run before any custom validators defined for the field.
   *
   * @default []
   *
   * @example
   * ```ts
   * [
   *   (value, sanitizedContextField, errors) => {
   *     if (!isString(value) && !isNull(value)) {
   *       throw new Error('Invalid input type')
   *     }
   *   },
   * ]
   * ```
   */
  validators?: any

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
   * @default undefined
   *
   * @example
   * ```ts
   * (value, { context }) => {
   *   if (value) {
   *     const house = await context.database
   *       .queryBuilder()
   *       .selectFrom('Houses')
   *       .select('name')
   *       .where('id', '=', value)
   *       .useCache(context.cache)
   *       .first()
   *
   *     if (house.success) {
   *       return house.data
   *     }
   *   }
   *
   *   return null
   * }
   * ```
   */
  populator?: any

  /**
   * A key-value object of `Field` instances representing the subfields of this field.
   *
   * - Object keys represent the subfield names.
   * - Object values are instances of the `Field` class.
   *
   * Set to `undefined` if the field has no subfields.
   *
   * @example
   * ```ts
   * {
   *   label: new Field({ model: textFieldModel(), options: {} }),
   *   link: new Field({ model: textFieldModel(), nullable: false, options: {} }),
   * }
   * ```
   */
  subfields?: any

  /**
   * A map of key-value objects describing each item of a structure.
   *
   * - Map keys are unique item identifiers (keys).
   *   - These keys will be included in the field value (which is an array of objects).
   *   - Each object in the array will contain an additional `$key` property.
   * - Map values are subfield definition objects where:
   *   - Keys represent subfield names.
   *   - Values are `Field` class instances.
   *
   * Set to `undefined` if the field has no structured subfields.
   *
   * @example
   * ```ts
   * {
   *   image: {
   *     src: new Field({ model: textFieldModel(), options: {}, required: true }),
   *     alt: new Field({ model: textFieldModel(), options: {} }),
   *   },
   *   video: {
   *     src: new Field({ model: textFieldModel(), options: {}, required: true }),
   *     autoplay: new Field({ model: booleanFieldModel(), options: {} }),
   *   },
   * }
   * ```
   */
  structure?: any

  /**
   * Input filters allow you to set or modify the field's input value at specific stages during INSERT or UPDATE queries.
   * They run regardless of whether an input value is provided in the query.
   * The following filters are available:
   *
   * - `beforeInputSanitization` - Runs before the input value is sanitized.
   * - `beforeInputValidation` - Runs before the input value is validated.
   * - `beforeQueryExecution` - Runs before the query is executed.
   *
   * Each filter receives the following arguments in order:
   *
   * - `value` - The current input value to filter (`undefined` if no value is provided).
   * - `contextField` - The current context field object.
   *
   * The filter function should return a field value or a `Promise` that resolves to a field value.
   * Returning `undefined` will remove the corresponding field from the input data.
   *
   * Filters can be defined as functions or as objects with the following properties:
   *
   * - `order` - A number that determines the order in which the filter runs (defaults to `10`).
   * - `callback` - The filter function.
   *
   * Fields with a lower input filter `order` are processed before those with a higher `order`.
   *
   * @example
   * ```ts
   * {
   *   name: 'autoGeneratedTimestamp',
   *   model: numberFieldModel(),
   *   inputFilters: {
   *     // With default order (10)
   *     beforeInputSanitization: (rawValue, contextField) => {
   *       return contextField.context.operation === 'update' ? Date.now() : rawValue
   *     },
   *
   *     // The `beforeQueryExecution` filter with order `0` will run before any other
   *     // `beforeQueryExecution` filters with higher order (including the default
   *     // order of `10`) in other fields.
   *     beforeQueryExecution: {
   *       order: 0,
   *       callback: (sanitizedValue, sanitizedContextField) => {
   *         return sanitizedContextField.context.operation === 'insert' ? Date.now() : sanitizedValue
   *       },
   *     },
   *   },
   * }
   * ```
   */
  inputFilters?: any
}

export interface FieldModelDefinition<
  TOptions extends Record<string, any>,
  TDataType extends DataType,
  TCastedType,
  TPopulatedType,
  TInputType,
  TSubfields extends Record<string, GenericField> | undefined,
  TStructure extends { [$key: string]: Record<string, GenericField> } | undefined,
> extends IFieldModel {
  dataType: TDataType
  defaultValue: TCastedType | null
  defaultOptions: Required<TOptions>
  serializer?: (value: any) => SerializedType[TDataType] | null | Promise<SerializedType[TDataType] | null>
  deserializer?: (value: any) => TCastedType | null | Promise<TCastedType | null>
  sanitizers?: Sanitizer<TCastedType, any>[]
  validators?: BaseValidator[]
  populator?: Populator<TCastedType, TPopulatedType>
  subfields?: TSubfields
  structure?: TStructure
  inputFilters?: InputFilters<
    GenericFieldModel,
    TOptions,
    boolean,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >
}

export type Sanitizer<TCastedType, TValue> = (
  /**
   * The input value to sanitize.
   */
  value: TValue,

  /**
   * The current context field object.
   */
  contextField: ContextField<
    GenericFieldModel,
    Record<string, any>,
    boolean,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    Database,
    InsertContext<GenericDatabase> | UpdateContext<GenericDatabase>
  >,
) => TCastedType | null | Promise<TCastedType | null>

export type BaseValidator = (
  /**
   * The raw (unsanitized) input value to validate.
   */
  value: any,

  /**
   * The current context field object.
   */
  sanitizedContextField: SanitizedContextField<
    GenericFieldModel,
    Record<string, any>,
    boolean,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    Database,
    SanitizedInsertContext<GenericDatabase> | SanitizedUpdateContext<GenericDatabase>
  >,

  /**
   * An object for storing validation errors (keys use dot notation).
   */
  errors: Record<string, string>,
) => any

export type Populator<TCastedType, TPopulatedType> = (
  /**
   * The casted field value.
   */
  value: TCastedType,

  /**
   * The current context field object.
   */
  contextField: ContextField<
    GenericFieldModel,
    Record<string, any>,
    boolean,
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
) => TPopulatedType | Promise<TPopulatedType>

export type GenericFieldModel = FieldModel<
  Record<string, any>,
  DataType,
  any,
  any,
  any,
  Record<string, GenericField> | undefined,
  { [$key: string]: Record<string, GenericField> } | undefined
>

/**
 * Defines the model of a field and serves as a bridge between the database and the application.
 */
export class FieldModel<
  TOptions extends Record<string, any>,
  const TDataType extends DataType,
  const TCastedType,
  const TPopulatedType,
  const TInputType,
  TSubfields extends Record<string, GenericField> | undefined,
  TStructure extends { [$key: string]: Record<string, GenericField> } | undefined,
> implements IFieldModel
{
  readonly dataType: TDataType
  readonly defaultValue: TCastedType | null
  readonly defaultOptions: Required<TOptions>
  readonly serializer: (value: any) => SerializedType[TDataType] | null | Promise<SerializedType[TDataType] | null>
  readonly deserializer: (value: any) => TCastedType | null | Promise<TCastedType | null>
  readonly sanitizers: Sanitizer<TCastedType, any>[]
  readonly validators: BaseValidator[]
  readonly subfields: TSubfields
  readonly structure: TStructure
  readonly inputFilters: Required<
    FieldModelDefinition<TOptions, TDataType, TCastedType, TPopulatedType, TInputType, TSubfields, TStructure>
  >['inputFilters']
  readonly populator: Populator<TCastedType, TPopulatedType> | null

  /**
   * Type of the field value after serializing it for the database.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  readonly TSerializedType!: SerializedType[TDataType]

  /**
   * Type of the field value after casting it from the database value.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  readonly TCastedType!: TCastedType

  /**
   * Type of the field value after populating it.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  readonly TPopulatedType!: TPopulatedType

  /**
   * Acceptable input types for this field that can be sanitized to the `TCastedType`.
   * For subfields, this is the type of the `InsertInput` object.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  readonly TInputType!: TInputType

  /**
   * Type representing the available field options.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  readonly TOptions!: TOptions

  constructor(
    definition: FieldModelDefinition<
      TOptions,
      TDataType,
      TCastedType,
      TPopulatedType,
      TInputType,
      TSubfields,
      TStructure
    >,
  ) {
    this.dataType = definition.dataType
    this.defaultValue = definition.defaultValue
    this.defaultOptions = definition.defaultOptions
    this.serializer = definition.serializer ?? ((value) => value)
    this.deserializer = definition.deserializer ?? ((value) => value)
    this.sanitizers = definition.sanitizers ?? []
    this.validators = definition.validators ?? []
    this.subfields = definition.subfields as TSubfields
    this.structure = definition.structure as TStructure
    this.inputFilters = definition.inputFilters ?? {}
    this.populator = definition.populator ?? null
  }
}
