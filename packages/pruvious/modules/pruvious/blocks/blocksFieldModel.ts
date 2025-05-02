import type { __, BlockGroupName, BlockName, BlockTagName, DynamicBlockFieldTypes } from '#pruvious/server'
import { extractInputFilters, FieldModel, type GenericField, type Populator } from '@pruvious/orm'
import {
  deepClone,
  deepCompare,
  isArray,
  isDefined,
  isNull,
  isObject,
  isString,
  isUndefined,
  remap,
  resolveRelativeDotNotation,
  uniqueArray,
} from '@pruvious/utils'

export interface BlockFieldModelOptions {
  /**
   * An array of block names, groups, or tags that are allowed as root (first level) blocks in this field.
   * This setting is not propagated to nested `blocksField({})` instances, but will take into account the `allowNestedBlocks` setting of its parents.
   *
   * By default, all blocks are allowed.
   *
   * @default '*'
   */
  allowRootBlocks?: (BlockName | `group:${BlockGroupName}` | `tag:${BlockTagName}`)[] | '*' | undefined

  /**
   * An array of block names, groups, or tags that are not allowed as root (first level) blocks in this field.
   * This setting is not propagated to nested `blocksField({})` instances, but will take into account the `denyNestedBlocks` setting of its parents.
   * The deny list is processed after the `allowRootBlocks` evaluation is complete.
   *
   * By default, no blocks are denied.
   *
   * @default []
   */
  denyRootBlocks?: (BlockName | `group:${BlockGroupName}` | `tag:${BlockTagName}`)[] | undefined

  /**
   * An array of block names, groups, or tags that are allowed in deeply nested `blocksField({})` instances of this field.
   * The allowed blocks will be limited to those that are also allowed by all parents.
   *
   * By default, all blocks are allowed.
   *
   * @default '*'
   */
  allowNestedBlocks?: (BlockName | `group:${BlockGroupName}` | `tag:${BlockTagName}`)[] | '*' | undefined

  /**
   * An array of block names, groups, or tags that are not allowed in deeply nested `blocksField({})` instances of this field.
   * The denied blocks will be extended to those that are also denied by all parents.
   * The deny list is processed after the `allowNestedBlocks` evaluation is complete.
   *
   * By default, no blocks are denied.
   *
   * @default []
   */
  denyNestedBlocks?: (BlockName | `group:${BlockGroupName}` | `tag:${BlockTagName}`)[] | undefined

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
  populator?: Populator<
    DynamicBlockFieldTypes['Casted'][BlockName][],
    DynamicBlockFieldTypes['Populated'][BlockName][]
  > | null
}

/**
 * Generates a new `FieldModel` instance for an array of blocks.
 * The data is stored as `text` in the database and represented as `Array` in JavaScript.
 *
 * The default value is `[]`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. If the input value is a `string`, it is parsed as JSON.
 * 2. Applies the sanitizers of all fields.
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
 * 5. All items in the array must be of type `object`.
 * 6. All items in the array must have a valid `$key` property.
 * 7. Only allowed blocks are valid.
 * 8. All fields must be valid (their own validators are applied).
 * 9. If the option `enforceUniqueItems` is `true`, all items in the array must be unique.
 * 10. If the option `minItems` or `maxItems` are set, the number of items in the array must be within the specified range.
 *
 * ---
 *
 * The following input filters are applied in order:
 *
 * 1. Assigns default values to `required` fields that are:
 *    - Absent from the input data.
 *    - Do not satisfy their conditional logic requirements.
 */
export function blockFieldModel(): FieldModel<
  BlockFieldModelOptions,
  'text',
  DynamicBlockFieldTypes['Casted'][BlockName][],
  DynamicBlockFieldTypes['Populated'][BlockName][],
  DynamicBlockFieldTypes['Input'][BlockName][],
  undefined,
  undefined
> {
  return new FieldModel({
    dataType: 'text',
    defaultValue: [],
    defaultOptions: {
      allowRootBlocks: '*',
      denyRootBlocks: [],
      allowNestedBlocks: '*',
      denyNestedBlocks: [],
      allowEmptyArray: false,
      deduplicateItems: false,
      enforceUniqueItems: false,
      maxItems: false,
      minItems: false,
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
      async (value, { context, path }) => {
        const { blocks } = await import('#pruvious/server/blocks')
        const structure: { [blockName: string]: Record<string, GenericField> } = remap(blocks, (blockName, block) => [
          blockName as string,
          block.fields,
        ])

        // Run all field sanitizers
        if (isArray(value) && value.every(isObject)) {
          const sanitizedArray: Record<string, any>[] = []

          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const fields = isString(item.$key) ? structure[item.$key] : undefined
            const sanitizedItem: Record<string, any> = {}

            if (isDefined(item.$key)) {
              sanitizedItem.$key = item.$key
            }

            if (fields) {
              for (const [fieldName, field] of Object.entries(fields)) {
                if (isDefined(item[fieldName])) {
                  sanitizedItem[fieldName] = item[fieldName]

                  for (const sanitizer of field.model.sanitizers) {
                    sanitizedItem[fieldName] = await sanitizer(
                      sanitizedItem[fieldName],
                      field.withContext(context, { path: `${path}.${i}.${fieldName}` }),
                    )
                  }
                } else if (!field.required) {
                  sanitizedItem[fieldName] = deepClone(field.default)
                }
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
          throw new Error(context.__('pruvious-dashboard' as any, 'This field must contain at least one block' as any))
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
      async (value, { context, path }, errors) => {
        if (!isNull(value)) {
          const { blocks } = await import('#pruvious/server/blocks')

          for (const [i, item] of value.entries()) {
            if (isUndefined(item.$key)) {
              errors[`${path}.${i}`] = context.__('pruvious-orm', 'Missing `$key` property')
            } else if (!isString(item.$key)) {
              errors[`${path}.${i}`] = context.__('pruvious-orm', 'The `$key` must be a string')
            } else if (!blocks[item.$key as BlockName]) {
              errors[`${path}.${i}`] = context.__('pruvious-orm', 'Invalid `$key`')
            }
          }
        }
      },
      async (value, { context, definition, path, isSubfield }, errors) => {
        if (!isNull(value)) {
          const { blocks } = await import('#pruvious/server/blocks')
          const blockNames = Object.keys(blocks) as BlockName[]

          let _allowNestedBlocks = blockNames
          let _denyNestedBlocks = []

          if (!isObject(context.cache['_tmp'])) {
            context.cache['_tmp'] = {}
            context.cache['_tmp']._allowNestedBlocks = {}
            context.cache['_tmp']._denyNestedBlocks = {}
          }

          if (isSubfield) {
            const parts = path.split('.')
            while (parts.length) {
              parts.pop()
              const parentPath = parts.join('.')
              if (context.cache['_tmp']._allowNestedBlocks[parentPath]) {
                _allowNestedBlocks = context.cache['_tmp']._allowNestedBlocks[parentPath]
                _denyNestedBlocks = context.cache['_tmp']._denyNestedBlocks[parentPath]
                break
              }
            }
          }

          const resolveList = (item: any) => {
            if (item.startsWith('group:')) {
              const groupName = item.slice(6) as BlockGroupName
              return blockNames.filter((blockName) => blocks[blockName].group === groupName)
            } else if (item.startsWith('tag:')) {
              const tagName = item.slice(4) as BlockTagName
              return blockNames.filter((blockName) => blocks[blockName].tags.includes(tagName))
            }
            return [item as BlockName]
          }
          const allowRootBlocks = (
            isArray(definition.options.allowRootBlocks)
              ? definition.options.allowRootBlocks.flatMap(resolveList)
              : blockNames
          ).filter((item) => _allowNestedBlocks.includes(item))
          const denyRootBlocks = [
            ..._denyNestedBlocks,
            ...(isArray(definition.options.denyRootBlocks)
              ? definition.options.denyRootBlocks.flatMap(resolveList)
              : []),
          ]

          context.cache['_tmp']._allowNestedBlocks[path] = (
            isArray(definition.options.allowNestedBlocks)
              ? definition.options.allowNestedBlocks.flatMap(resolveList)
              : blockNames
          ).filter((item) => _allowNestedBlocks.includes(item))
          context.cache['_tmp']._denyNestedBlocks[path] = uniqueArray([
            ..._denyNestedBlocks,
            ...(isArray(definition.options.denyNestedBlocks)
              ? definition.options.denyNestedBlocks.flatMap(resolveList)
              : blockNames),
          ])

          for (const [i, item] of value.entries()) {
            if (!allowRootBlocks.includes(item.$key)) {
              errors[`${path}.${i}`] = (context.__ as typeof __)('pruvious-dashboard', 'This block is not allowed here')
              continue
            }

            if (denyRootBlocks.includes(item.$key)) {
              errors[`${path}.${i}`] = (context.__ as typeof __)('pruvious-dashboard', 'This block is not allowed here')
            }
          }
        }
      },
      async (value, { context, path, conditionalLogicResolver }, errors) => {
        if (!isNull(value)) {
          let hasErrors = false
          const { blocks } = await import('#pruvious/server/blocks')
          const structure: { [blockName: string]: Record<string, GenericField> } = remap(blocks, (blockName, block) => [
            blockName as string,
            block.fields,
          ])
          const promises: Promise<void>[] = []

          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const fields = isString(item.$key) ? structure[item.$key] : undefined

            if (fields) {
              for (const [fieldName, field] of Object.entries(fields)) {
                promises.push(
                  new Promise<void>(async (resolve) => {
                    let fieldHasErrors = false

                    // Check for missing field references in field `dependencies`
                    if (field.dependencies.length) {
                      for (const dependency of field.dependencies) {
                        const referencedFieldPath = resolveRelativeDotNotation(`${path}.${i}.${fieldName}`, dependency)
                        if (isUndefined(context.getSanitizedInputValue(referencedFieldPath))) {
                          errors[`${path}.${i}.${fieldName}`] = context.__(
                            'pruvious-orm',
                            'This field requires `$field` to be present in the input data',
                            { field: referencedFieldPath },
                          )
                          fieldHasErrors = true
                          break
                        }
                      }
                    }

                    // Check for missing field references in field `conditionalLogic`
                    if (!fieldHasErrors) {
                      for (const referencedFieldPath of conditionalLogicResolver.getReferencedFieldPaths(
                        `${path}.${i}.${fieldName}`,
                      )) {
                        if (isUndefined(context.getSanitizedInputValue(referencedFieldPath))) {
                          errors[`${path}.${i}.${fieldName}`] = context.__(
                            'pruvious-orm',
                            'This field requires `$field` to be present in the input data',
                            { field: referencedFieldPath },
                          )
                          fieldHasErrors = true
                          break
                        }
                      }
                    }

                    // Run all field validators
                    if (!fieldHasErrors) {
                      for (const validator of [...field.model.validators, ...field.validators]) {
                        try {
                          await validator(
                            item[fieldName],
                            field.withSanitizedContext(context, {
                              path: `${path}.${i}.${fieldName}`,
                              conditionalLogicResolver,
                            }),
                            errors,
                          )
                        } catch (error: any) {
                          if (error.message !== '_ignore') {
                            errors[`${path}.${i}.${fieldName}`] =
                              error.message || context.__('pruvious-orm', 'Invalid input')
                          }
                          fieldHasErrors = true
                          break
                        }
                      }
                    }

                    if (fieldHasErrors) {
                      hasErrors = true
                    }

                    resolve()
                  }),
                )
              }
            }
          }

          await Promise.all(promises)

          if (hasErrors) {
            throw new Error('_ignore') // Break the top-level loop
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
            throw new Error(context.__('pruvious-dashboard' as any, 'Each block in this field must be unique' as any))
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
                context.__(
                  'pruvious-dashboard' as any,
                  'This field must contain exactly $exact blocks' as any,
                  { exact: minItems } as any,
                ),
              )
            }
          } else {
            if (minItems !== false && value.length < minItems) {
              throw new Error(
                context.__(
                  'pruvious-dashboard' as any,
                  'This field must contain at least $min blocks' as any,
                  { min: minItems } as any,
                ),
              )
            }

            if (maxItems !== false && value.length > maxItems) {
              throw new Error(
                context.__(
                  'pruvious-dashboard' as any,
                  'This field must contain at most $max blocks' as any,
                  { max: maxItems } as any,
                ),
              )
            }
          }
        }
      },
    ],
    inputFilters: {
      beforeInputSanitization: async (value, { context, path }) => {
        if (!isNull(value) && isArray(value) && value.every(isObject)) {
          const { blocks } = await import('#pruvious/server/blocks')
          const structure: { [blockName: string]: Record<string, GenericField> } = remap(blocks, (blockName, block) => [
            blockName as string,
            block.fields,
          ])

          // Run the `beforeInputSanitization` filters of all fields
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const fields = isString(item.$key) ? structure[item.$key] : undefined

            if (fields) {
              const filters = extractInputFilters(fields, 'beforeInputSanitization')

              for (const { callback, fieldName: fieldName, field: field } of filters) {
                const value = await callback(
                  item[fieldName],
                  field.withContext(context, { path: `${path}.${i}.${fieldName}` }),
                )

                if (isDefined(value)) {
                  item[fieldName] = value
                } else if (isDefined(item[fieldName])) {
                  delete item[fieldName]
                }
              }
            }
          }
        }

        return value
      },
      beforeInputValidation: async (value, { context, path, conditionalLogicResolver }) => {
        if (!isNull(value) && isArray(value) && value.every(isObject)) {
          const { blocks } = await import('#pruvious/server/blocks')
          const structure: { [blockName: string]: Record<string, GenericField> } = remap(blocks, (blockName, block) => [
            blockName as string,
            block.fields,
          ])

          // Set default values for `required` fields that are missing from the input data and do not meet their conditional logic
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const fields = isString(item.$key) ? structure[item.$key] : undefined

            if (fields) {
              for (const [fieldName, field] of Object.entries(fields)) {
                if (
                  isUndefined(item[fieldName]) &&
                  field.required &&
                  !conditionalLogicResolver.results[`${path}.${i}.${fieldName}`]
                ) {
                  item[fieldName] = deepClone(field.default)
                }
              }
            }
          }

          // Run the `beforeInputValidation` filters of all fields
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const fields = isString(item.$key) ? structure[item.$key] : undefined

            if (fields) {
              const filters = extractInputFilters(fields, 'beforeInputValidation')

              for (const { callback, fieldName: fieldName, field: field } of filters) {
                const value = await callback(
                  item[fieldName],
                  field.withSanitizedContext(context, {
                    path: `${path}.${i}.${fieldName}`,
                    conditionalLogicResolver,
                  }),
                )

                if (isDefined(value)) {
                  item[fieldName] = value
                } else if (isDefined(item[fieldName])) {
                  delete item[fieldName]
                }
              }
            }
          }
        }

        return value
      },
      beforeQueryExecution: async (value, { context, path, conditionalLogicResolver }) => {
        if (isArray(value) && value.every(isObject)) {
          const { blocks } = await import('#pruvious/server/blocks')
          const structure: { [blockName: string]: Record<string, GenericField> } = remap(blocks, (blockName, block) => [
            blockName as string,
            block.fields,
          ])

          // Run the `beforeQueryExecution` filters of all fields
          for (const [i, item] of (value as Record<string, any>[]).entries()) {
            const fields = isString(item.$key) ? structure[item.$key] : undefined

            if (fields) {
              const filters = extractInputFilters(fields, 'beforeQueryExecution')

              for (const { callback, fieldName: fieldName, field: field } of filters) {
                const value = await callback(
                  item[fieldName],
                  field.withSanitizedContext(context, {
                    path: `${path}.${i}.${fieldName}`,
                    conditionalLogicResolver,
                  }),
                )

                if (isDefined(value)) {
                  item[fieldName] = value
                } else if (isDefined(item[fieldName])) {
                  delete item[fieldName]
                }
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
        // Run the `populator` of all fields
        const { blocks } = await import('#pruvious/server/blocks')
        const structure: { [blockName: string]: Record<string, GenericField> } = remap(blocks, (blockName, block) => [
          blockName as string,
          block.fields,
        ])
        const promises: Promise<any>[] = []

        for (const [i, item] of value.entries()) {
          const fields = isString(item.$key) ? structure[item.$key] : undefined

          if (fields) {
            for (const [fieldName, field] of Object.entries(fields)) {
              const populator: Populator<any, any> | undefined = field.model.populator

              if (populator) {
                promises.push(
                  new Promise<void>(async (resolve) => {
                    item[fieldName] = await populator(
                      item[fieldName],
                      field.withContext(contextField.context, { path: `${contextField.path}.${i}.${fieldName}` }),
                    )
                    resolve()
                  }),
                )
              }
            }
          }
        }

        await Promise.all(promises)
      }

      return value
    },
  }) as any
}
