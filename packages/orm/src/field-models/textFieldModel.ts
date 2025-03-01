import { castToString, isNull, isString, isUndefined } from '@pruvious/utils'
import { FieldModel, type Populator } from '../core'

export interface TextFieldModelOptions<TCastedType, TPopulatedType> {
  /**
   * Indicates whether an empty string is considered a valid value when the field is required.
   *
   * @default false
   */
  allowEmptyString?: boolean

  /**
   * The maximum length of the string.
   * Set to `false` to disable this validation.
   *
   * @default false
   */
  maxLength?: number | false

  /**
   * The minimum length of the string.
   * Set to `false` to disable this validation.
   *
   * @default false
   */
  minLength?: number | false

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
   *   return value === 'Voldemort' ? context._('You know who') : value
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null

  /**
   * Whether to trim the value before saving it to the database.
   *
   * @default true
   */
  trim?: boolean
}

/**
 * Generates a new `FieldModel` instance for text values.
 * The data is stored as `text` in the database and represented as `string` in JavaScript.
 *
 * The default value is an empty string (`''`).
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. `castToString`
 * 2. `trim` (if `trim` is `true`)
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is required and `allowEmptyString` is `false`, This field cannot be left empty.
 * 3. If the field is not nullable, the value cannot be `null`.
 * 4. The value must be a `string` or `null`.
 * 5. Verifies that the value falls within the specified `minLength` and `maxLength` range.
 */
export function textFieldModel<
  TCastedType extends string = string,
  TPopulatedType = TCastedType,
  TInputType = string | number,
>(): FieldModel<
  TextFieldModelOptions<TCastedType, TPopulatedType>,
  'text',
  TCastedType,
  TPopulatedType,
  TInputType,
  undefined
> {
  return new FieldModel({
    dataType: 'text',
    defaultValue: '',
    defaultOptions: {
      allowEmptyString: false,
      maxLength: false,
      minLength: false,
      populator: null,
      trim: true,
    },
    sanitizers: [
      (value) => castToString(value),
      (value, { definition }) => (definition.options.trim && isString(value) ? value.trim() : value),
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
          !definition.options.allowEmptyString &&
          value === ''
        ) {
          throw new Error(context.__('pruvious-orm', 'This field cannot be left empty'))
        }
      },
      (value, { definition, context }) => {
        if (!definition.nullable && isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is not nullable'))
        }
      },
      (value, { definition, context }) => {
        if (!isString(value) && !isNull(value)) {
          if (definition.nullable) {
            throw new Error(context.__('pruvious-orm', 'The value must be a string or `null`'))
          } else {
            throw new Error(context.__('pruvious-orm', 'The value must be a string'))
          }
        }
      },
      (value, { definition, context }) => {
        if (isString(value)) {
          const minLength = definition.options.minLength
          const maxLength = definition.options.maxLength

          if (minLength !== false && minLength === maxLength) {
            if (value.length !== minLength) {
              throw new Error(
                context.__('pruvious-orm', 'The value must be exactly `$length` characters long', {
                  length: minLength,
                }),
              )
            }
          } else {
            if (minLength !== false && value.length < minLength) {
              throw new Error(
                context.__('pruvious-orm', 'The value must be at least `$min` characters long', { min: minLength }),
              )
            }

            if (maxLength !== false && value.length > maxLength) {
              throw new Error(
                context.__('pruvious-orm', 'The value must be at most `$max` characters long', { max: maxLength }),
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
