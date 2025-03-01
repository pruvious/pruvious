import { castToNumber, countDecimals, isBigInt, isNull, isRealNumber, isString, isUndefined } from '@pruvious/utils'
import { FieldModel, type Populator } from '../core'

export interface NumberFieldModelOptions<TCastedType, TPopulatedType> {
  /**
   * The maximum number of decimal places allowed.
   * By default, only integers are permitted.
   *
   * @default 0
   */
  decimalPlaces?: number

  /**
   * The maximum permitted value.
   *
   * @default Number.MAX_SAFE_INTEGER
   */
  max?: number

  /**
   * The minimum permitted value.
   *
   * @default Number.MIN_SAFE_INTEGER
   */
  min?: number

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
   *   return isNull(value) ? null : value > 10 ? context._('Many') : context._('Few')
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null
}

/**
 * Generates a new `FieldModel` instance for numeric values.
 * The data is stored as `numeric` in the database and represented as `number` in JavaScript.
 *
 * The default value is `0`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. `castToNumber`
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is not nullable, the value cannot be `null`.
 * 3. The value must be a numeric value (of type `number`) or `null`.
 * 4. Verifies that the value falls within the specified `min` and `max` range.
 * 5. Ensures the value does not exceed the specified `decimalPlaces` precision.
 */
export function numberFieldModel<
  TCastedType extends number = number,
  TPopulatedType = TCastedType,
  TInputType = number | string,
>(): FieldModel<
  NumberFieldModelOptions<TCastedType, TPopulatedType>,
  'numeric',
  TCastedType,
  TPopulatedType,
  TInputType,
  undefined
> {
  return new FieldModel({
    dataType: 'numeric',
    defaultValue: 0,
    defaultOptions: {
      decimalPlaces: 0,
      max: Number.MAX_SAFE_INTEGER,
      min: Number.MIN_SAFE_INTEGER,
      populator: null,
    },
    deserializer: (value) => (isString(value) || isBigInt(value) ? Number(value) : value),
    sanitizers: [(value) => castToNumber(value)],
    validators: [
      (value, { definition, context, path, conditionalLogicResolver }) => {
        if (
          context.operation === 'insert' &&
          definition.required &&
          conditionalLogicResolver.results[path] &&
          isUndefined(value)
        ) {
          throw new Error(context.__('pruvious-orm', 'This field is required'))
        }
      },
      (value, { definition, context }) => {
        if (!definition.nullable && isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is not nullable'))
        }
      },
      (value, { definition, context }) => {
        if (!isRealNumber(value) && !isNull(value)) {
          if (definition.nullable) {
            throw new Error(context.__('pruvious-orm', 'The value must be a number or `null`'))
          } else {
            throw new Error(context.__('pruvious-orm', 'The value must be a number'))
          }
        }
      },
      (value, { definition, context }) => {
        if (!isNull(value)) {
          if (value < definition.options.min) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be greater than or equal to `$min`', {
                min: definition.options.min,
              }),
            )
          }

          if (value > definition.options.max) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be less than or equal to `$max`', {
                max: definition.options.max,
              }),
            )
          }
        }
      },
      (value, { definition, context }) => {
        if (!isNull(value)) {
          if (countDecimals(value) > definition.options.decimalPlaces) {
            if (definition.options.decimalPlaces === 0) {
              throw new Error(context.__('pruvious-orm', 'The value must be an integer'))
            } else {
              throw new Error(
                context.__('pruvious-orm', 'The value cannot have more than `$count` decimals', {
                  count: definition.options.decimalPlaces,
                }),
              )
            }
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
