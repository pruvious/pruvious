import {
  deepClone,
  isDefined,
  isNotNull,
  isNull,
  isObject,
  isSerializable,
  isString,
  isUndefined,
  resolveRelativeDotNotation,
} from '@pruvious/utils'
import {
  extractInputFilters,
  FieldModel,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type GenericField,
  type Populator,
} from '../core'
import type { SubfieldsInput } from '../query-builder'

export interface StructuredObjectFieldModelOptions<TCastedType, TPopulatedType> {
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
 * Generates a new `FieldModel` instance for a serializable object with structured subfields.
 * The data is stored as `text` in the database and represented as `Record<string, any>` in JavaScript.
 *
 * The default value is an object containing the default values of the `subfields`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. If the input value is a `string`, it is parsed as JSON.
 * 2. Applies the sanitizers of all subfields (object properties).
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is not nullable, the value cannot be `null`.
 * 3. The value must be a normal `object` or `null`.
 * 4. The value must be serializable.
 * 5. All subfields (object properties) must be valid (their own validators are applied).
 *
 * ---
 *
 * The following input filters are applied in order:
 *
 * 1. Assigns default values to `required` subfields that are:
 *    - Absent from the input data.
 *    - Do not satisfy their conditional logic requirements.
 *
 * ---
 *
 * @example
 * ```ts
 * structuredObjectFieldModel({
 *   subfields: {
 *     width: numberField({}),
 *     unit: textField({}),
 *   },
 * })
 *
 * typeof structure.TCastedType
 * // { width: number, unit: string }
 * ```
 */
export function structuredObjectFieldModel<
  TSubfields extends Record<string, GenericField>,
  TCastedType = ExtractCastedTypes<TSubfields>,
  TPopulatedType = ExtractPopulatedTypes<TSubfields>,
  TInputType = SubfieldsInput<TSubfields>,
>(
  /**
   * A key-value object of `Field` instances describing each property of this field.
   *
   * - Object keys represent the subfield names.
   * - Object values are instances of the `Field` class.
   *
   * @example
   * ```ts
   * {
   *   width: numberField({}),
   *   unit: textField({}),
   * }
   *
   * // Example value:
   * {
   *   width: 100,
   *   unit: 'px',
   * }
   * ```
   */
  subfields: TSubfields,
): FieldModel<
  StructuredObjectFieldModelOptions<TCastedType, TPopulatedType>,
  'text',
  TCastedType,
  TPopulatedType,
  TInputType,
  TSubfields,
  undefined
> {
  return new FieldModel({
    dataType: 'text',
    defaultValue: Object.entries(subfields).reduce<Record<string, any>>((acc, [key, subfield]) => {
      acc[key] = subfield.default
      return acc
    }, {}),
    defaultOptions: {
      populator: null,
    },
    subfields,
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
      async (value, { definition, context, path }) => {
        // Run all subfield sanitizers
        if (isObject(value)) {
          const sanitized: Record<string, any> = {}

          for (const [subfieldName, subfield] of Object.entries(definition.model.subfields!!)) {
            if (isDefined(value[subfieldName])) {
              sanitized[subfieldName] = value[subfieldName]

              for (const sanitizer of subfield.model.sanitizers) {
                sanitized[subfieldName] = await sanitizer(
                  sanitized[subfieldName],
                  subfield.withContext(context, { path: `${path}.${subfieldName}` }),
                )
              }
            } else if (!subfield.required) {
              sanitized[subfieldName] = deepClone(subfield.default)
            }
          }

          return sanitized
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
      async (value, { definition, context, path, conditionalLogicResolver }, errors) => {
        if (isNotNull(value)) {
          let hasErrors = false
          const promises: Promise<void>[] = []

          for (const [subfieldName, subfield] of Object.entries(definition.model.subfields!!)) {
            promises.push(
              new Promise<void>(async (resolve) => {
                let subFieldHasErrors = false

                // Check for missing field references in subfield `dependencies`
                if (subfield.dependencies.length) {
                  for (const dependency of subfield.dependencies) {
                    const referencedFieldPath = resolveRelativeDotNotation(`${path}.${subfieldName}`, dependency)
                    if (isUndefined(context.getSanitizedInputValue(referencedFieldPath))) {
                      errors[`${path}.${subfieldName}`] = context.__(
                        'pruvious-orm',
                        'This field requires `$field` to be present in the input data',
                        { field: referencedFieldPath },
                      )
                      subFieldHasErrors = true
                      break
                    }
                  }
                }

                // Check for missing field references in subfield `conditionalLogic`
                if (!subFieldHasErrors) {
                  for (const referencedFieldPath of conditionalLogicResolver.getReferencedFieldPaths(
                    `${path}.${subfieldName}`,
                  )) {
                    if (isUndefined(context.getSanitizedInputValue(referencedFieldPath))) {
                      errors[`${path}.${subfieldName}`] = context.__(
                        'pruvious-orm',
                        'This field requires `$field` to be present in the input data',
                        { field: referencedFieldPath },
                      )
                      subFieldHasErrors = true
                      break
                    }
                  }
                }

                // Run all subfield validators
                if (!subFieldHasErrors) {
                  for (const validator of [...subfield.model.validators, ...subfield.validators]) {
                    try {
                      await validator(
                        value[subfieldName],
                        subfield.withSanitizedContext(context, {
                          path: `${path}.${subfieldName}`,
                          conditionalLogicResolver,
                        }),
                        errors,
                      )
                    } catch (error: any) {
                      if (error.message !== '_ignore') {
                        errors[`${path}.${subfieldName}`] = error.message || context.__('pruvious-orm', 'Invalid input')
                      }
                      subFieldHasErrors = true
                      break
                    }
                  }
                }

                if (subFieldHasErrors) {
                  hasErrors = true
                }

                resolve()
              }),
            )
          }

          await Promise.all(promises)

          if (hasErrors) {
            throw new Error('_ignore') // Break the top-level loop
          }
        }
      },
    ],
    inputFilters: {
      beforeInputSanitization: async (value, { definition, context, path }) => {
        if (isObject(value)) {
          // Run the `beforeInputSanitization` filters of all subfields
          const filters = extractInputFilters(definition.model.subfields!, 'beforeInputSanitization')

          for (const { callback, fieldName: subfieldName, field: subfield } of filters) {
            const _value = await callback(
              value[subfieldName],
              subfield.withContext(context, { path: `${path}.${subfieldName}` }),
            )

            if (isDefined(_value)) {
              value[subfieldName] = _value
            } else if (isDefined(value[subfieldName])) {
              delete value[subfieldName]
            }
          }
        }

        return value
      },
      beforeInputValidation: async (value, { definition, context, path, conditionalLogicResolver }) => {
        if (isObject(value)) {
          // Set default values for `required` subfields that are missing from the input data and do not meet their conditional logic
          for (const [subfieldName, subfield] of Object.entries(definition.model.subfields!)) {
            if (
              isUndefined(value[subfieldName]) &&
              subfield.required &&
              !conditionalLogicResolver.results[`${path}.${subfieldName}`]
            ) {
              value[subfieldName] = deepClone(subfield.default)
            }
          }

          // Run the `beforeInputValidation` filters of all subfields
          const filters = extractInputFilters(definition.model.subfields!, 'beforeInputValidation')

          for (const { callback, fieldName: subfieldName, field: subfield } of filters) {
            const _value = await callback(
              value[subfieldName],
              subfield.withSanitizedContext(context, {
                path: `${path}.${subfieldName}`,
                conditionalLogicResolver,
              }),
            )

            if (isDefined(_value)) {
              value[subfieldName] = _value
            } else if (isDefined(value[subfieldName])) {
              delete value[subfieldName]
            }
          }
        }

        return value
      },
      beforeQueryExecution: async (value, { definition, context, path, conditionalLogicResolver }) => {
        if (isObject(value)) {
          // Run the `beforeQueryExecution` filters of all subfields
          const filters = extractInputFilters(definition.model.subfields!, 'beforeQueryExecution')

          for (const { callback, fieldName: subfieldName, field: subfield } of filters) {
            const _value = await callback(
              value[subfieldName],
              subfield.withSanitizedContext(context, {
                path: `${path}.${subfieldName}`,
                conditionalLogicResolver,
              }),
            )

            if (isDefined(_value)) {
              value[subfieldName] = _value
            } else if (isDefined(value[subfieldName])) {
              delete value[subfieldName]
            }
          }
        }

        return value
      },
    },
    populator: async (value, contextField) => {
      if (contextField.definition.options.populator) {
        return contextField.definition.options.populator(value, contextField as any)
      }

      if (isNotNull(value)) {
        // Run the `populator` of all subfields
        const promises: Promise<any>[] = []

        for (const [subfieldName, subfield] of Object.entries(contextField.definition.model.subfields!)) {
          const populator: Populator<any, any> | undefined = subfield.model.populator

          if (populator) {
            promises.push(
              new Promise<void>(async (resolve) => {
                value[subfieldName] = await populator(
                  value[subfieldName],
                  subfield.withContext(contextField.context, { path: `${contextField.path}.${subfieldName}` }),
                )
                resolve()
              }),
            )
          }
        }

        await Promise.all(promises)
      }

      return value
    },
  }) as any
}
