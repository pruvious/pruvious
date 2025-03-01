import {
  deepClone,
  deepCompare,
  isArray,
  isDefined,
  isNull,
  isObject,
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

export interface RepeaterFieldModelOptions<TCastedType, TPopulatedType> {
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
   *   return isNull(value) ? null : value.map(item => ({ ...item, foo: context._('bar') }))
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null
}

/**
 * Generates a new `FieldModel` instance for an array of objects (subfields).
 * The data is stored as `text` in the database and represented as `Array` in JavaScript.
 *
 * The default value is `[]`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. If the input value is a `string`, it is parsed as JSON.
 * 2. Applies the sanitizers of all subfields (array items).
 * 3. If the option `deduplicateItems` is `true`, duplicate items are removed from the array.
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is required and `allowEmptyArray` is `false`, This field must contain at least one item.
 * 3. If the field is not nullable, the value cannot be `null`.
 * 4. The value must be an `array` or `null`.
 * 5. All items in the array must be of type `object`.
 * 6. All subfields (array items) must be valid (their own validators are applied).
 * 7. If the option `enforceUniqueItems` is `true`, all items in the array must be unique.
 * 8. If the option `minItems` or `maxItems` are set, the number of items in the array must be within the specified range.
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
 * const repeater = repeaterFieldModel({
 *   label: new Field({ model: textFieldModel(), options: {} }),
 *   link: new Field({ model: textFieldModel(), nullable: false, options: {} }),
 * })
 *
 * typeof repeater.TCastedType // { label: string | null, link: string }[]
 * ```
 */
export function repeaterFieldModel<
  TSubfields extends Record<string, GenericField>,
  TCastedType = ExtractCastedTypes<TSubfields>[],
  TPopulatedType = ExtractPopulatedTypes<TSubfields>[],
  TInputType = SubfieldsInput<TSubfields>[],
>(
  /**
   * A key-value object of `Field` instances describing each property of the repeater array items.
   *
   * - Object keys represent the subfield names.
   * - Object values are instances of the `Field` class.
   *
   * @example
   * ```ts
   * {
   *   label: new Field({ model: textFieldModel(), options: {} }),
   *   link: new Field({ model: textFieldModel(), nullable: false, options: {} }),
   * }
   *
   * // Example value:
   * [
   *   { label: 'Home', link: '/' },
   *   { label: 'About', link: '/about' },
   *   // ...
   * ]
   * ```
   */
  subfields: TSubfields,
): FieldModel<
  RepeaterFieldModelOptions<TCastedType, TPopulatedType>,
  'text',
  TCastedType,
  TPopulatedType,
  TInputType,
  TSubfields
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
        if (isArray(value) && value.every(isObject)) {
          const sanitizedArray: Record<string, any>[] = []

          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const sanitizedItem: Record<string, any> = {}

            for (const [subfieldName, subfield] of Object.entries(definition.model.subfields!)) {
              if (isDefined(item[subfieldName])) {
                sanitizedItem[subfieldName] = item[subfieldName]

                for (const sanitizer of subfield.model.sanitizers) {
                  sanitizedItem[subfieldName] = await sanitizer(
                    sanitizedItem[subfieldName],
                    subfield.withContext(context, { path: `${path}.${i}.${subfieldName}` }),
                  )
                }
              } else if (!subfield.required) {
                sanitizedItem[subfieldName] = deepClone(subfield.default)
              }
            }

            sanitizedArray.push(sanitizedItem)
          }

          return sanitizedArray
        }

        return value
      },
      (value, { definition }) => {
        if (definition.options.deduplicateItems && isArray(value)) {
          const toRemove: number[] = []

          for (const [i, item] of value.entries()) {
            for (let j = i + 1; j < value.length; j++) {
              if (deepCompare(item, value[j])) {
                toRemove.unshift(j)
              }
            }
          }

          for (const i of toRemove) {
            value.splice(i, 1)
          }
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
      (value, { context }) => {
        if (!isNull(value)) {
          for (const item of value) {
            if (!isObject(item)) {
              throw new Error(context.__('pruvious-orm', 'All items in the array must be of type `object`'))
            }
          }
        }
      },
      async (value, { definition, context, path, conditionalLogicResolver }, errors) => {
        if (!isNull(value)) {
          let hasErrors = false
          const promises: Promise<void>[] = []

          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            for (const [subfieldName, subfield] of Object.entries(definition.model.subfields!)) {
              promises.push(
                new Promise<void>(async (resolve) => {
                  let subFieldHasErrors = false

                  // Check for missing field references in subfield `dependencies`
                  if (subfield.dependencies.length) {
                    for (const dependency of subfield.dependencies) {
                      const referencedFieldPath = resolveRelativeDotNotation(`${path}.${i}.${subfieldName}`, dependency)
                      if (isUndefined(context.getSanitizedInputValue(referencedFieldPath))) {
                        errors[`${path}.${i}.${subfieldName}`] = context.__(
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
                      `${path}.${i}.${subfieldName}`,
                    )) {
                      if (isUndefined(context.getSanitizedInputValue(referencedFieldPath))) {
                        errors[`${path}.${i}.${subfieldName}`] = context.__(
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
                          item[subfieldName],
                          subfield.withSanitizedContext(context, {
                            path: `${path}.${i}.${subfieldName}`,
                            conditionalLogicResolver,
                          }),
                          errors,
                        )
                      } catch (error: any) {
                        if (error.message !== '__ignore') {
                          errors[`${path}.${i}.${subfieldName}`] =
                            error.message || context.__('pruvious-orm', 'Invalid input')
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
          }

          await Promise.all(promises)

          if (hasErrors) {
            throw new Error('__ignore') // Break the top-level loop
          }
        }
      },
      (value, { definition, context, path }, errors) => {
        if (definition.options.enforceUniqueItems && !isNull(value)) {
          let hasDuplicates = false

          for (const [i, item] of value.entries()) {
            for (let j = i + 1; j < value.length; j++) {
              if (deepCompare(item, value[j])) {
                errors[`${path}.${j}`] = context.__('pruvious-orm', 'The value must be unique')
                hasDuplicates = true
              }
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
    inputFilters: {
      beforeInputSanitization: async (value, { definition, context, path }) => {
        if (!isNull(value) && isArray(value) && value.every(isObject)) {
          // Run the `beforeInputSanitization` filters of all subfields
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const filters = extractInputFilters(definition.model.subfields!, 'beforeInputSanitization')

            for (const { callback, fieldName: subfieldName, field: subfield } of filters) {
              const value = await callback(
                item[subfieldName],
                subfield.withContext(context, { path: `${path}.${i}.${subfieldName}` }),
              )

              if (isDefined(value)) {
                item[subfieldName] = value
              } else if (isDefined(item[subfieldName])) {
                delete item[subfieldName]
              }
            }
          }
        }

        return value
      },
      beforeInputValidation: async (value, { definition, context, path, conditionalLogicResolver }) => {
        if (!isNull(value) && isArray(value) && value.every(isObject)) {
          // Set default values for `required` subfields that are missing from the input data and do not meet their conditional logic
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            for (const [subfieldName, subfield] of Object.entries(definition.model.subfields!)) {
              if (
                isUndefined(item[subfieldName]) &&
                subfield.required &&
                !conditionalLogicResolver.results[`${path}.${i}.${subfieldName}`]
              ) {
                item[subfieldName] = deepClone(subfield.default)
              }
            }
          }

          // Run the `beforeInputValidation` filters of all subfields
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const filters = extractInputFilters(definition.model.subfields!, 'beforeInputValidation')

            for (const { callback, fieldName: subfieldName, field: subfield } of filters) {
              const value = await callback(
                item[subfieldName],
                subfield.withSanitizedContext(context, {
                  path: `${path}.${i}.${subfieldName}`,
                  conditionalLogicResolver,
                }),
              )

              if (isDefined(value)) {
                item[subfieldName] = value
              } else if (isDefined(item[subfieldName])) {
                delete item[subfieldName]
              }
            }
          }
        }

        return value
      },
      beforeQueryExecution: async (value, { definition, context, path, conditionalLogicResolver }) => {
        if (isArray(value) && value.every(isObject)) {
          // Run the `beforeQueryExecution` filters of all subfields
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const filters = extractInputFilters(definition.model.subfields!, 'beforeQueryExecution')

            for (const { callback, fieldName: subfieldName, field: subfield } of filters) {
              const value = await callback(
                item[subfieldName],
                subfield.withSanitizedContext(context, {
                  path: `${path}.${i}.${subfieldName}`,
                  conditionalLogicResolver,
                }),
              )

              if (isDefined(value)) {
                item[subfieldName] = value
              } else if (isDefined(item[subfieldName])) {
                delete item[subfieldName]
              }
            }
          }
        }

        return value
      },
    },
    populator: async (value, contextField) => {
      if (contextField.definition.options.populator) {
        return contextField.definition.options.populator(value, contextField)
      }

      if (!isNull(value)) {
        // Run the `populator` of all subfields
        const promises: Promise<any>[] = []

        for (const [i, item] of value.entries()) {
          for (const [subfieldName, subfield] of Object.entries(contextField.definition.model.subfields!)) {
            const populator: Populator<any, any> | undefined = subfield.model.populator

            if (populator) {
              promises.push(
                new Promise<void>(async (resolve) => {
                  item[subfieldName] = await populator(
                    item[subfieldName],
                    subfield.withContext(contextField.context, { path: `${contextField.path}.${i}.${subfieldName}` }),
                  )
                  resolve()
                }),
              )
            }
          }
        }

        await Promise.all(promises)
      }

      return value
    },
  }) as any
}
