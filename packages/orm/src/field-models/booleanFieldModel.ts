import { castToBoolean, isBigInt, isBoolean, isNull, isUndefined, type Booleanish } from '@pruvious/utils'
import { FieldModel, type Populator } from '../core'

export interface BooleanFieldModelOptions<TCastedType, TPopulatedType> {
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
   *   return value === true ? context._('Yes') : context._('No')
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null

  /**
   * Specifies if only `true` is considered valid when this field is required.
   * When set to `false`, both `true` and `false` are valid values for a required field.
   *
   * @default true
   */
  requireTrue?: boolean
}

/**
 * Generates a new `FieldModel` instance for Boolean values.
 * The data is stored as `boolean` in the database and represented as `boolean` in JavaScript.
 *
 * The default value is `false`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. `castToBoolean`
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is required and `requireTrue` is `true`, the value cannot be `false`.
 * 3. If the field is not nullable, the value cannot be `null`.
 * 4. The value must be a `boolean` or `null`.
 */
export function booleanFieldModel<
  TCastedType extends boolean = boolean,
  TPopulatedType = TCastedType,
  TInputType = Booleanish,
>(): FieldModel<
  BooleanFieldModelOptions<TCastedType, TPopulatedType>,
  'boolean',
  TCastedType,
  TPopulatedType,
  TInputType,
  undefined,
  undefined
> {
  return new FieldModel({
    dataType: 'boolean',
    defaultValue: false,
    defaultOptions: {
      populator: null,
      requireTrue: true,
    },
    serializer: (value) => (isBoolean(value) ? +value : value),
    deserializer: (value) => (isBigInt(value) || value === 1 || value === 0 ? Boolean(value) : value),
    sanitizers: [(value) => castToBoolean(value)],
    validators: [
      (value, { definition, context, path, conditionalLogicResolver, isSubfield }) => {
        if (
          (context.operation === 'insert' || isSubfield) &&
          definition.required &&
          conditionalLogicResolver.results[path] &&
          isUndefined(value)
        ) {
          throw new Error(context.__('pruvious-orm', 'This field is required'))
        }
      },
      (value, { definition, context, path, conditionalLogicResolver }) => {
        if (
          definition.required &&
          conditionalLogicResolver.results[path] &&
          definition.options.requireTrue &&
          value === false
        ) {
          throw new Error(context.__('pruvious-orm', "The value cannot be 'false'"))
        }
      },
      (value, { definition, context }) => {
        if (!definition.nullable && isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is not nullable'))
        }
      },
      (value, { definition, context }) => {
        if (!isBoolean(value) && !isNull(value)) {
          if (definition.nullable) {
            throw new Error(context.__('pruvious-orm', 'The value must be a boolean or `null`'))
          } else {
            throw new Error(context.__('pruvious-orm', 'The value must be a boolean'))
          }
        }
      },
    ],
    populator: (value, contextField) => {
      if (contextField.definition.options.populator) {
        return contextField.definition.options.populator(value, contextField)
      }

      return value
    },
  }) as any
}
