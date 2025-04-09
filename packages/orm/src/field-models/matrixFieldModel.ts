import {
  castToNumber,
  castToString,
  isArray,
  isNull,
  isRealNumber,
  isString,
  isUndefined,
  toArray,
  uniqueArray,
  type OptionToPrimitive,
  type Primitive,
} from '@pruvious/utils'
import { FieldModel, type Populator } from '../core'

export interface MatrixFieldModelOptions<TCastedType, TPopulatedType> {
  /**
   * Indicates whether an empty array is considered a valid value when the field is required.
   *
   * @default false
   */
  allowEmptyArray?: boolean

  /**
   * Determines if duplicate items in the array should be removed.
   *
   * @default false
   */
  deduplicateItems?: boolean

  /**
   * Ensures all items in the array are unique.
   *
   * @default false
   */
  enforceUniqueItems?: boolean

  /**
   * The maximum number of items allowed in the array.
   * Set to `false` to disable this limit.
   *
   * @default false
   */
  maxItems?: number | false

  /**
   * The minimum number of items allowed in the array.
   * Set to `false` to disable this limit.
   *
   * @default false
   */
  minItems?: number | false

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
   *   return isArray(value) ? value.filter((id) => id > 1) : value
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null
}

/**
 * Generates a new `FieldModel` instance for a matrix of primitives.
 * The data is stored as `text` in the database and represented as `Array` in JavaScript.
 *
 * The default value is `[]`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. If the input value is a `string`, it is parsed as JSON.
 * 2. If there is a single type specified in the `type` argument, all items in the array are cast to that type.
 * 3. If the option `deduplicateItems` is `true`, duplicate items are removed from the array.
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is required and `allowEmptyArray` is `false`, this field must contain at least one item.
 * 3. If the field is not nullable, the value cannot be `null`.
 * 4. The value must be an `array` or `null`.
 * 5. All items in the array must be of the type specified in the `type` argument.
 * 6. If the option `enforceUniqueItems` is `true`, all items in the array must be unique.
 * 7. If the options `minItems` or `maxItems` are set, the number of items in the array must be within the specified range.
 *
 * @example
 * ```ts
 * matrixFieldModel('number')             // Matrix of numbers (default)
 * matrixFieldModel('string')             // Matrix of strings
 * matrixFieldModel(['string', 'number']) // Matrix of strings and numbers
 * ```
 */
export function matrixFieldModel<
  TType extends 'number' | 'string' = 'number',
  TPrimitive extends Primitive = OptionToPrimitive<TType>,
  TCastedType = TPrimitive[],
  TPopulatedType = TPrimitive[],
  TInputType = (([TPrimitive] extends [number | string] ? number | string : never) | TPrimitive)[],
>(
  /**
   * Specifies the casted type for the array items.
   * Use a single type or an array to allow multiple types.
   *
   * @default 'string'
   */
  type: TType | TType[] = 'number' as TType,
): FieldModel<
  MatrixFieldModelOptions<TCastedType, TPopulatedType>,
  'text',
  TCastedType,
  TPopulatedType,
  TInputType,
  undefined
> {
  return new FieldModel({
    dataType: 'text',
    defaultValue: [],
    defaultOptions: {
      allowEmptyArray: false,
      deduplicateItems: false,
      enforceUniqueItems: false,
      maxItems: false,
      minItems: false,
      populator: null,
    },
    serializer: (value) => (isNull(value) ? null : JSON.stringify(value.map((item: any) => [item]))),
    deserializer: (value) => (isNull(value) ? null : JSON.parse(value).flat()),
    sanitizers: [
      (value) => {
        if (isString(value)) {
          try {
            return JSON.parse(value)
          } catch {}
        }

        return value
      },
      (value) => {
        if (isArray(value) && isString(type)) {
          if (type === 'number') {
            return value.map(castToNumber)
          } else if (type === 'string') {
            return value.map(castToString)
          }
        }

        return value
      },
      (value, { definition }) => {
        if (definition.options.deduplicateItems && isArray(value)) {
          return uniqueArray(value)
        }

        return value
      },
    ],
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
          !definition.options.allowEmptyArray &&
          isArray(value) &&
          value.length === 0
        ) {
          throw new Error(context.__('pruvious-orm', 'This field must contain at least one item'))
        }
      },
      (value, { definition, context }) => {
        if (!definition.nullable && isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is not nullable'))
        }
      },
      (value, { definition, context }) => {
        if (!isArray(value) && !isNull(value)) {
          if (definition.nullable) {
            throw new Error(context.__('pruvious-orm', 'The value must be an array or `null`'))
          } else {
            throw new Error(context.__('pruvious-orm', 'The value must be an array'))
          }
        }
      },
      (value, { context, path }, errors) => {
        if (!isNull(value)) {
          const allowedTypes = toArray(type)
          let hasErrors = false

          for (const [i, item] of value.entries()) {
            let isValid = false

            for (const allowedType of allowedTypes) {
              if ((allowedType === 'number' && isRealNumber(item)) || (allowedType === 'string' && isString(item))) {
                isValid = true
                break
              }
            }

            if (!isValid) {
              if (allowedTypes.length === 1) {
                if (allowedTypes[0] === 'number') {
                  errors[`${path}.${i}`] = context.__('pruvious-orm', 'The value must be a number')
                } else if (allowedTypes[0] === 'string') {
                  errors[`${path}.${i}`] = context.__('pruvious-orm', 'The value must be a string')
                }
              } else {
                errors[`${path}.${i}`] = context.__(
                  'pruvious-orm',
                  'The value must be one of the specified types: $types',
                  { types: allowedTypes.join(', ') },
                )
              }

              hasErrors = true
            }
          }

          if (hasErrors) {
            throw new Error(context.__('pruvious-orm', 'This field contains items of the wrong type'))
          }
        }
      },
      (value, { definition, context, path }, errors) => {
        if (definition.options.enforceUniqueItems && !isNull(value)) {
          let hasDuplicates = false

          for (const [i, item] of value.entries()) {
            if (value.indexOf(item) !== i) {
              errors[`${path}.${i}`] = context.__('pruvious-orm', 'The value must be unique')
              hasDuplicates = true
            }
          }

          if (hasDuplicates) {
            throw new Error(context.__('pruvious-orm', 'Each item in this field must be unique'))
          }
        }
      },
      (value, { definition, context }) => {
        if (!isNull(value)) {
          const minItems = definition.options.minItems
          const maxItems = definition.options.maxItems

          if (minItems !== false && minItems === maxItems) {
            if (value.length !== minItems) {
              throw new Error(
                context.__('pruvious-orm', 'This field must contain exactly $exact items', { exact: minItems }),
              )
            }
          } else {
            if (minItems !== false && value.length < minItems) {
              throw new Error(
                context.__('pruvious-orm', 'This field must contain at least $min items', { min: minItems }),
              )
            }

            if (maxItems !== false && value.length > maxItems) {
              throw new Error(
                context.__('pruvious-orm', 'This field must contain at most $max items', { max: maxItems }),
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
