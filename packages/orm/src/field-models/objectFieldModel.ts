import { isNull, isObject, isSerializable, isString, isUndefined } from '@pruvious/utils'
import { FieldModel, type Populator } from '../core'

export interface ObjectFieldModelOptions<TCastedType, TPopulatedType> {
  // @todo allowEmptyObject: boolean (default true)

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
   *   return isNull(value) ? null : { ...value, foo: context._('bar') }
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null
}

/**
 * Generates a new `FieldModel` instance for a serializable object.
 * The data is stored as `text` in the database and represented as `Record<string, any>` in JavaScript.
 *
 * The default value is `{}`.
 *
 * Note: This model is a foundation for other object-based models.
 * It doesn't enforce specific object structure constraints.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. If the input value is a `string`, it is parsed as JSON.
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is not nullable, the value cannot be `null`.
 * 3. The value must be a normal `object` or `null`.
 * 4. The value must be serializable.
 *
 * @example
 * ```ts
 * objectFieldModel<{ name: string, age: number }>()
 * ```
 */
export function objectFieldModel<
  TCastedType extends Record<string, any> = Record<string, any>,
  TPopulatedType = TCastedType,
  TInputType = TCastedType,
>(): FieldModel<
  ObjectFieldModelOptions<TCastedType, TPopulatedType>,
  'text',
  TCastedType,
  TPopulatedType,
  TInputType,
  undefined,
  undefined
> {
  return new FieldModel({
    dataType: 'text',
    defaultValue: {},
    defaultOptions: {
      populator: null,
    },
    serializer: (value) => (isNull(value) ? null : JSON.stringify(value)),
    deserializer: (value) => (isNull(value) ? null : JSON.parse(value)),
    sanitizers: [
      (value) => {
        if (isString(value)) {
          try {
            return JSON.parse(value)
          } catch {}
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
      (value, { definition, context }) => {
        if (!definition.nullable && isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is not nullable'))
        }
      },
      (value, { definition, context }) => {
        if (!isObject(value) && !isNull(value)) {
          if (definition.nullable) {
            throw new Error(context.__('pruvious-orm', 'The value must be an object or `null`'))
          } else {
            throw new Error(context.__('pruvious-orm', 'The value must be an object'))
          }
        }
      },
      (value, { context }) => {
        if (isObject(value) && !isSerializable(value)) {
          throw new Error(context.__('pruvious-orm', 'The value must be serializable'))
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
