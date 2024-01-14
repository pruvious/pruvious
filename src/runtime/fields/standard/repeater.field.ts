import type { CollectionField, Field, FieldOptions, ResolvedFieldDefinition } from '#pruvious'
import type { PropType } from 'vue'
import { resolveCollectionFieldOptions } from '../../collections/field-options.resolver'
import { defaultSanitizer } from '../../sanitizers/default'
import { isArray, toArray } from '../../utils/array'
import { isDefined } from '../../utils/common'
import { isFunction } from '../../utils/function'
import { isObject } from '../../utils/object'
import { isString, titleCase } from '../../utils/string'
import { arrayValidator } from '../../validators/array'
import { requiredValidator } from '../../validators/required'
import {
  defineField,
  resolveFieldPopulation,
  type FieldAdditional,
  type ResolvedFieldPopulation,
} from '../field.definition'

export default defineField({
  name: 'repeater',
  type: {
    js: 'object',
    ts: ({ fields, options }) => {
      if (options.overrideType) {
        return options.overrideType
      }

      const result: string[] = ['{']

      for (const [subfieldName, subfieldDeclaration] of Object.entries<Field & { additional?: FieldAdditional }>(
        options.subfields,
      )) {
        const definition = fields[subfieldDeclaration.type]
        const options = resolveCollectionFieldOptions(
          `repeater:${JSON.stringify(subfieldDeclaration.options)}`,
          subfieldDeclaration.type,
          subfieldName,
          subfieldDeclaration.options,
          fields,
        )
        const type = isString(definition.type.ts)
          ? definition.type.ts
          : definition.type.ts({ definition, fields, name: subfieldName, options })
        const codeComment = definition.inputMeta.codeComment({ definition, name: subfieldName, options })

        if (codeComment && toArray(codeComment).length) {
          result.push('/**')
          for (const line of toArray(codeComment)) {
            result.push(` * ${line}`)
          }
          result.push(' */')
        }

        result.push(`${subfieldName}: ${type}`)
      }

      result.push('}[]', '')

      return result.join('\n')
    },
  },
  default: ({ options }) => options.default ?? [],
  vueComponent: undefined as any,
  options: {
    subfields: {
      type: `Record<string, Field & { additional?: FieldAdditional }>`,
      description: [
        'An object of subfields that define the structure of each repeater entry.',
        '',
        '@example',
        '```typescript',
        '{',
        "  name: { type: 'text' },",
        "  age: { type: 'number', required: true },",
        '}',
        '```',
      ],
      required: true,
    },
    required: {
      type: 'boolean',
      description: [
        'Specifies that the field input is mandatory during creation, requiring at least one entry.',
        '',
        '@default false',
      ],
      default: () => false,
    },
    label: {
      type: 'string',
      description: [
        'The field label displayed in the UI.',
        '',
        'By default, it is automatically generated based on the property name assigned to the field.',
        "Example: 'productVariations' => 'Product variations'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'Record<string, any>[]',
      description: ['The default field value.', '', '@default []'],
    },
    fieldLayout: {
      type: 'FieldLayout[] | undefined',
      description: [
        'Defines the field layout in the repeater.',
        '',
        'The layout array accepts the following values:',
        '',
        '- **`string`** - The subfield name.',
        '- **`string[]`** - An array of subfield names that will be displayed in a row.',
        '- **`Record<string, FieldLayout[]>`** - A tabbed layout.',
        "- **`'<./components/CustomComponent.vue>'`**- A Vue component path relative to the project root.",
        '',
        'If not specified, all displayable subfields will be shown vertically one after another.',
        '',
        'Custom components can be used to display additional information about the collection.',
        'They receive the following props:',
        '',
        '- **`record`** - The current record.',
        '- **`errors`** - A key-value object with field names (in dot-notation) as keys and error messages as values.',
        '- **`disabled`** - A boolean indicating whether the user has permission to create or edit the record.',
        '- **`compact`** - A boolean indicating whether the component is displayed in a compact mode.',
        '',
        '@example',
        '```typescript',
        '[',
        "  'name',                   // Single field",
        "  ['email', 'phone | 40%'], // Two fields in a row",
        '  {',
        "    'Tab 1': ['street', 'city', 'zip'],       // Three fields in a row",
        "    'Tab 2': ['<./component/CustomMap.vue>'], // Vue component path relative to the project root",
        '  }',
        ']',
        '```',
      ],
    },
    min: {
      type: 'number',
      description: ['The minimum allowed number of repeater entries.', '', '@default 0'],
      default: () => 0,
    },
    max: {
      type: 'number',
      description: ['The maximum allowed number of repeater entries.', '', '@default Number.MAX_SAFE_INTEGER'],
      default: () => Number.MAX_SAFE_INTEGER,
    },
    description: {
      type: 'string | string[]',
      description: [
        'A brief descriptive text displayed in code comments and in a tooltip at the upper right corner of the field.',
        '',
        'Use an array to handle line breaks.',
      ],
    },
    addLabel: {
      type: 'string',
      description: ['The text label displayed on the button used to add a new repeater item.'],
      default: () => 'Add item',
    },
    overrideType: {
      type: 'string',
      description: [
        'A **stringified** TypeScript type used for overriding the automatically generated field value type.',
        'This is particularly handy when field types are unavailable during the initial field declaration.',
        '',
        'Note: This feature is only applicable when declaring the field in a collection.',
      ],
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    async ({ fields, input, name, operation, options, query, value }) => {
      if (isArray(value)) {
        for (const [i, entry] of value.entries()) {
          if (isObject(entry)) {
            for (const [subfieldName, declaration] of Object.entries<Field & { additional?: FieldAdditional }>(
              options.subfields,
            )) {
              const definition: ResolvedFieldDefinition | undefined = declaration ? fields[declaration.type] : undefined

              if (definition) {
                for (const sanitizer of [...definition.sanitizers, ...(declaration.additional?.sanitizers ?? [])]) {
                  try {
                    if (
                      isFunction(sanitizer) ||
                      (operation === 'create' && sanitizer.onCreate) ||
                      (operation === 'update' && sanitizer.onUpdate)
                    ) {
                      ;(entry as any)[subfieldName] = await (isFunction(sanitizer) ? sanitizer : sanitizer.sanitizer)({
                        name: `${name}.${i}.${subfieldName}`,
                        value: (entry as any)[subfieldName],
                        definition,
                        input,
                        options: resolveCollectionFieldOptions(
                          `repeater:${JSON.stringify(declaration.options)}`,
                          declaration.type,
                          subfieldName,
                          declaration.options,
                          fields,
                        ),
                        fields,
                        operation,
                        query,
                      })
                    }
                  } catch {}
                }
              }
            }
          }
        }
      }

      return value
    },
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    arrayValidator,
    ({ __, language, value, options }) => {
      if (isDefined(options.min) && value.length < options.min) {
        throw new Error(
          __(language, 'pruvious-server', 'The repeater must have at least $count $entries', { count: options.min }),
        )
      }
    },
    ({ __, language, value, options }) => {
      if (isDefined(options.max) && value.length > options.max) {
        throw new Error(
          __(language, 'pruvious-server', 'The repeater must not exceed $count $entries', { count: options.max }),
        )
      }
    },
    async ({
      _,
      __,
      allInputs,
      collection,
      collections,
      currentQuery,
      errors,
      fields,
      input,
      language,
      name,
      operation,
      options,
      query,
      value,
    }) => {
      for (const [i, entry] of value.entries()) {
        if (isObject(entry)) {
          for (const subfieldName of Object.keys(entry)) {
            const declaration: CollectionField | undefined = options.subfields[subfieldName]
            const definition: ResolvedFieldDefinition | undefined = declaration ? fields[declaration.type] : undefined

            if (!declaration) {
              errors[`${name}.${i}.${subfieldName}`] = __(language, 'pruvious-server', 'Unrecognized field name')
              delete (entry as any)[subfieldName]
              continue
            }

            if (!definition) {
              errors[`${name}.${i}.${subfieldName}`] = __(language, 'pruvious-server', 'Invalid input type')
              delete (entry as any)[subfieldName]
              continue
            }
          }

          for (const [subfieldName, declaration] of Object.entries<Field & { additional?: FieldAdditional }>(
            options.subfields,
          )) {
            const definition: ResolvedFieldDefinition | undefined = declaration ? fields[declaration.type] : undefined

            if (definition) {
              for (const validator of [...definition.validators, ...(declaration.additional?.validators ?? [])]) {
                if (declaration.additional?.conditionalLogic) {
                  try {
                    if (
                      !definition.conditionalLogicMatcher({
                        conditionalLogic: declaration.additional.conditionalLogic,
                        definition,
                        errors,
                        input,
                        name: `${name}.${i}.${subfieldName}`,
                        options: resolveCollectionFieldOptions(
                          `repeater:${JSON.stringify(declaration.options)}`,
                          declaration.type,
                          subfieldName,
                          declaration.options,
                          fields,
                        ),
                        value: (entry as any)[subfieldName],
                        fields,
                      })
                    ) {
                      continue
                    }
                  } catch (e: any) {
                    errors[`${name}.${i}.${subfieldName}`] = e.message
                    continue
                  }
                }

                try {
                  if (
                    isFunction(validator) ||
                    (operation === 'create' && validator.onCreate) ||
                    (operation === 'read' && validator.onRead) ||
                    (operation === 'update' && validator.onUpdate)
                  ) {
                    await (isFunction(validator) ? validator : validator.validator)({
                      _,
                      __,
                      allInputs,
                      collection,
                      collections,
                      definition,
                      input,
                      language,
                      name: `${name}.${i}.${subfieldName}`,
                      operation,
                      options: resolveCollectionFieldOptions(
                        `repeater:${JSON.stringify(declaration.options)}`,
                        declaration.type,
                        subfieldName,
                        declaration.options,
                        fields,
                      ),
                      value: (entry as any)[subfieldName],
                      currentQuery,
                      query,
                      errors,
                      fields,
                    })
                  }
                } catch (e: any) {
                  errors[`${name}.${i}.${subfieldName}`] = e.message
                  break
                }
              }
            }
          }
        } else {
          errors[`${name}.${i}`] = __(language, 'pruvious-server', 'Invalid input type')
          value[i] = null
        }
      }
    },
  ],
  population: {
    type: {
      js: 'object',
      ts: ({ fields, options }) => {
        if (options.overrideType) {
          return options.overrideType
        }

        const result: string[] = ['{']

        for (const [subfieldName, subfieldDeclaration] of Object.entries<Field & { additional?: FieldAdditional }>(
          options.subfields,
        )) {
          const definition = fields[subfieldDeclaration.type]
          const options = resolveCollectionFieldOptions(
            `repeater:${JSON.stringify(subfieldDeclaration.options)}`,
            subfieldDeclaration.type,
            subfieldName,
            subfieldDeclaration.options,
            fields,
          )
          const population: ResolvedFieldPopulation | false = subfieldDeclaration.additional?.population
            ? resolveFieldPopulation(subfieldDeclaration.additional.population)
            : definition.population
          const codeComment = definition.inputMeta.codeComment({ definition, name: subfieldName, options })

          if (codeComment && toArray(codeComment).length) {
            result.push('/**')
            for (const line of toArray(codeComment)) {
              result.push(` * ${line}`)
            }
            result.push(' */')
          }

          const type = population
            ? isString(population.type.ts)
              ? population.type.ts
              : population.type.ts({ definition, fields, name: subfieldName, options })
            : isString(definition.type.ts)
            ? definition.type.ts
            : definition.type.ts({ definition, fields, name: subfieldName, options })
          result.push(`${subfieldName}: ${type}`)
        }

        result.push('}[]', '')

        return result.join('\n')
      },
    },
    populator: async ({ currentQuery, fields, name, options, query, value }) => {
      if (isArray(value)) {
        ;(currentQuery as any).maxPopulationDepth ||= {}
        ;(currentQuery as any).maxPopulationDepth[name] ??= 30
        ;(currentQuery as any).maxPopulationDepth[name]--

        if ((currentQuery as any).maxPopulationDepth[name] <= 0) {
          return []
        }

        for (const [i, entry] of value.entries()) {
          if (isObject(entry)) {
            for (const [subfieldName, subfieldDeclaration] of Object.entries<Field & { additional?: FieldAdditional }>(
              options.subfields,
            )) {
              const definition = fields[subfieldDeclaration.type]
              const population = subfieldDeclaration.additional?.population ?? definition?.population

              if (population) {
                ;(entry as any)[subfieldName] = await population.populator({
                  currentQuery,
                  definition,
                  fields,
                  name: `${name}.${i}.${subfieldName}`,
                  options: resolveCollectionFieldOptions(
                    `repeater:${JSON.stringify(subfieldDeclaration.options)}`,
                    subfieldDeclaration.type,
                    subfieldName,
                    subfieldDeclaration.options,
                    fields,
                  ),
                  query,
                  value: (entry as any)[subfieldName],
                })
              }
            }
          }
        }
      }

      return value
    },
  },
  extractKeywords: async ({ collection, collections, fields, fieldValueType, options, record, value }) => {
    if (isArray(value)) {
      const keywords: string[] = []

      for (const entry of value.values()) {
        if (isObject(entry)) {
          for (const [subfieldName, subfieldDeclaration] of Object.entries<Field & { additional?: FieldAdditional }>(
            options.subfields,
          )) {
            const definition = fields[subfieldDeclaration.type]

            keywords.push(
              (
                await definition.extractKeywords({
                  collection,
                  collections,
                  definition,
                  fields,
                  fieldValueType,
                  options: resolveCollectionFieldOptions(
                    `repeater:${JSON.stringify(subfieldDeclaration.options)}`,
                    subfieldDeclaration.type,
                    subfieldName,
                    subfieldDeclaration.options,
                    fields,
                  ),
                  record,
                  value: (entry as any)[subfieldName],
                })
              ).trim(),
            )
          }
        }
      }

      return keywords.filter(Boolean).join(' ')
    }

    return ''
  },
  inputMeta: {
    type({ fields, options }) {
      const result: string[] = ['{']

      for (const [subfieldName, subfieldDeclaration] of Object.entries<Field & { additional?: FieldAdditional }>(
        options.subfields,
      )) {
        const definition = fields[subfieldDeclaration.type]
        const options = resolveCollectionFieldOptions(
          `repeater:${JSON.stringify(subfieldDeclaration.options)}`,
          subfieldDeclaration.type,
          subfieldName,
          subfieldDeclaration.options,
          fields,
        )
        const codeComment = definition.inputMeta.codeComment({ definition, name: subfieldName, options })

        if (codeComment && toArray(codeComment).length) {
          result.push('/**')
          for (const line of toArray(codeComment)) {
            result.push(` * ${line}`)
          }
          result.push(' */')
        }

        if (definition.inputMeta.type) {
          const type = isString(definition.inputMeta.type)
            ? definition.inputMeta.type
            : definition.inputMeta.type({ definition, fields, name: subfieldName, options })
          result.push(`${subfieldName}: ${type}`)
        } else {
          const type = isString(definition.type.ts)
            ? definition.type.ts
            : definition.type.ts({ definition, fields, name: subfieldName, options })
          result.push(`${subfieldName}: ${type}`)
        }
      }

      result.push('}[]', '')

      return result.join('\n')
    },
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})

/**
 * Create a new `repeater` field in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueField<T extends Record<string, Array<any> | Boolean | Number | Object | String | null>>(
  options: Omit<FieldOptions['repeater'], 'subfields' | 'overrideType'> & {
    /**
     * An object of subfields that define the structure of each repeater entry.
     *
     * @example
     * ```typescript
     * {
     *   name: textField(),
     *   age: numberField({ required: true }),
     * }
     * ```
     */
    subfields: T
    default?: Record<keyof T, any>[]
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as PropType<T[]>
}

/**
 * Create a new `repeater` subfield in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueSubfield<T extends Record<string, Array<any> | Boolean | Number | Object | String | null>>(
  options: Omit<FieldOptions['repeater'], 'subfields' | 'overrideType'> & {
    /**
     * An object of subfields that define the structure of each repeater entry.
     *
     * @example
     * ```typescript
     * {
     *   name: textField(),
     *   age: numberField({ required: true }),
     * }
     * ```
     */
    subfields: T
    default?: Record<keyof T, any>[]
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as T[]
}
