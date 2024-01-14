import { type CastedBlockData, type Field } from '#pruvious'
import type { BlockDefinition } from '../../blocks/block.definition'
import { resolveCollectionFieldOptions } from '../../collections/field-options.resolver'
import { defaultSanitizer } from '../../sanitizers/default'
import { isArray } from '../../utils/array'
import { isDefined } from '../../utils/common'
import { isFunction } from '../../utils/function'
import { getProperty, isObject, setProperty } from '../../utils/object'
import { isString, titleCase } from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { defineField, type ResolvedFieldPopulation } from '../field.definition'

export default defineField({
  name: 'block',
  type: { js: 'object', ts: 'CastedBlockData' },
  default: ({ options }) => options.default ?? null,
  vueComponent: undefined as any,
  options: {
    label: {
      type: 'string',
      description: [
        'The field label displayed in the UI.',
        '',
        'By default, it is automatically generated based on the property name assigned to the field.',
        "Example: 'contentBlocks' => 'Content blocks'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'CastedBlockData',
      description: ['The default field value.', '', '@default null'],
    },
    description: {
      type: 'string | string[]',
      description: [
        'A brief descriptive text displayed in code comments and in a tooltip at the upper right corner of the field.',
        '',
        'Use an array to handle line breaks.',
      ],
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    async ({ fields, input, name, operation, query, value }) => {
      if (isObject<CastedBlockData>(value) && isString(value.name) && isObject(value.fields)) {
        const { blocks } = await import('#pruvious/blocks')
        const blockDefinition = (blocks as any)[value.name] as BlockDefinition

        if (blockDefinition) {
          for (const fieldName of Object.keys(blockDefinition.fields)) {
            const declaration = blockDefinition.fields[fieldName]
            const definition = declaration ? fields[declaration.type] : undefined

            if (definition) {
              for (const sanitizer of [...definition.sanitizers, ...(declaration.additional?.sanitizers ?? [])]) {
                try {
                  if (
                    isFunction(sanitizer) ||
                    (operation === 'create' && sanitizer.onCreate) ||
                    (operation === 'update' && sanitizer.onUpdate)
                  ) {
                    ;(value as any).fields[fieldName] = await (isFunction(sanitizer) ? sanitizer : sanitizer.sanitizer)(
                      {
                        name: `${name}.fields.${fieldName}`,
                        value: (value as any).fields[fieldName],
                        definition,
                        input,
                        options: resolveCollectionFieldOptions(
                          `block:${name}.fields.${fieldName}.${JSON.stringify(declaration.options)}`,
                          declaration.type,
                          fieldName,
                          declaration.options,
                          fields,
                        ),
                        fields,
                        operation,
                        query,
                      },
                    )
                  }
                } catch {}
              }
            }
          }

          for (const slotName of Object.keys(isObject(value.slots) ? value.slots : {})) {
            for (const sanitizer of fields.repeater.sanitizers) {
              try {
                if (
                  isFunction(sanitizer) ||
                  (operation === 'create' && sanitizer.onCreate) ||
                  (operation === 'update' && sanitizer.onUpdate)
                ) {
                  ;(value as any).slots[slotName] = await (isFunction(sanitizer) ? sanitizer : sanitizer.sanitizer)({
                    name: `${name}.slots.${slotName}`,
                    value: (value as any).slots[slotName],
                    definition: fields.repeater,
                    input,
                    options: resolveCollectionFieldOptions(
                      `block:${name}.slots.${slotName}`,
                      'repeater',
                      slotName,
                      { subfields: { block: { type: 'block', options: {} } } },
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

      return value
    },
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: requiredValidator,
    },
    ({ __, input, language, name, value }) => {
      if (
        !isObject<CastedBlockData>(value) ||
        Object.keys(value).some((v) => !['name', 'fields', 'slots'].includes(v)) ||
        !isString(value.name) ||
        !isObject(value.fields) ||
        (isDefined(value.slots) && !isObject(value.slots))
      ) {
        setProperty(input, name.split('.').slice(0, -1).join('.'), null)
        throw new Error(__(language, 'pruvious-server', 'Invalid input type'))
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
      query,
      value,
    }) => {
      const { blocks } = await import('#pruvious/blocks')
      const blockDefinition = (blocks as any)[value.name] as BlockDefinition

      if (blockDefinition) {
        for (const fieldName of Object.keys(value.fields)) {
          const declaration = blockDefinition.fields[fieldName]
          const definition = declaration ? fields[declaration.type] : undefined

          if (!declaration) {
            errors[`${name}.fields.${fieldName}`] = __(language, 'pruvious-server', 'Unrecognized field name')
            delete value.fields[fieldName]
            continue
          }

          if (!definition) {
            errors[`${name}.fields.${fieldName}`] = __(language, 'pruvious-server', 'Invalid input type')
            delete value.fields[fieldName]
            continue
          }
        }

        for (const [fieldName, declaration] of Object.entries(blockDefinition.fields)) {
          const definition = fields[declaration.type]

          if (definition) {
            if (declaration.additional?.conditionalLogic) {
              try {
                if (
                  !definition.conditionalLogicMatcher({
                    conditionalLogic: declaration.additional.conditionalLogic,
                    definition,
                    errors,
                    input,
                    name: `${name}.fields.${fieldName}`,
                    options: resolveCollectionFieldOptions(
                      `block:${name}.fields.${fieldName}.${JSON.stringify(declaration.options)}`,
                      declaration.type,
                      fieldName,
                      declaration.options,
                      fields,
                    ),
                    value: value.fields[fieldName],
                    fields,
                  })
                ) {
                  continue
                }
              } catch (e: any) {
                errors[`${name}.fields.${fieldName}`] = e.message
                continue
              }
            }

            for (const validator of [...definition.validators, ...(declaration.additional?.validators ?? [])]) {
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
                    name: `${name}.fields.${fieldName}`,
                    operation,
                    options: resolveCollectionFieldOptions(
                      `block:${name}.fields.${fieldName}.${JSON.stringify(declaration.options)}`,
                      declaration.type,
                      fieldName,
                      declaration.options,
                      fields,
                    ),
                    value: value.fields[fieldName],
                    currentQuery,
                    query,
                    errors,
                    fields,
                  })
                }
              } catch (e: any) {
                errors[`${name}.fields.${fieldName}`] = e.message
                setProperty(
                  input,
                  `${name}.fields.${fieldName}`,
                  definition.default({
                    definition,
                    name: `${name}.fields.${fieldName}`,
                    options: resolveCollectionFieldOptions(
                      `block:${name}.fields.${fieldName}.${JSON.stringify(declaration.options)}`,
                      declaration.type,
                      `${name}.fields.${fieldName}`,
                      declaration.options,
                      fields,
                    ),
                  }),
                )
                break
              }

              if (declaration.type === 'repeater') {
                for (const repeaterSubfieldName of Object.keys(errors).filter(
                  (key) =>
                    key.startsWith(`${name}.fields.${fieldName}.`) &&
                    key
                      .replace(`${name}.fields.${fieldName}.`, '')
                      .split('.')[0]
                      .match(/^[0-9]+$/),
                )) {
                  const repeaterSubfieldDeclarationPath = repeaterSubfieldName
                    .replace(`${name}.fields.${fieldName}`, '')
                    .replace(/\.([0-9]+)\./g, '.options.subfields.')
                    .slice(1)
                  const repeaterSubfieldDeclaration = getProperty<Field>(declaration, repeaterSubfieldDeclarationPath)

                  if (repeaterSubfieldDeclaration) {
                    const repeaterSubfieldDefinition = fields[repeaterSubfieldDeclaration.type]

                    if (repeaterSubfieldDefinition) {
                      setProperty(
                        input,
                        repeaterSubfieldName,
                        repeaterSubfieldDefinition.default({
                          definition: repeaterSubfieldDefinition,
                          name: repeaterSubfieldName,
                          options: resolveCollectionFieldOptions(
                            `block:${repeaterSubfieldName}.${JSON.stringify(repeaterSubfieldDeclaration.options)}`,
                            repeaterSubfieldDeclaration.type,
                            repeaterSubfieldName,
                            repeaterSubfieldDeclaration.options,
                            fields,
                          ),
                        }),
                      )
                    }
                  }
                }
              }
            }
          }
        }

        value.slots ||= {}

        for (const slotName of Object.keys(value.slots)) {
          if (!blockDefinition.slots[slotName]) {
            errors[`${name}.slots.${slotName}`] = __(language, 'pruvious-server', 'Unrecognized slot name')
            delete value.slots[slotName]
            continue
          }
        }

        for (const [slotName, { allowedChildBlocks, label }] of Object.entries(blockDefinition.slots)) {
          if (isDefined(value.slots[slotName])) {
            if (isArray(value.slots[slotName])) {
              const disallowedChildBlocks: number[] = []

              for (const [i, innerBlockValue] of value.slots[slotName].entries()) {
                if (
                  allowedChildBlocks &&
                  allowedChildBlocks !== '*' &&
                  isObject<{ block: CastedBlockData }>(innerBlockValue) &&
                  isObject(innerBlockValue.block) &&
                  isString(innerBlockValue.block.name) &&
                  (blocks as any)[innerBlockValue.block.name] &&
                  !allowedChildBlocks.includes(innerBlockValue.block.name)
                ) {
                  errors[`${name}.slots.${slotName}.${i}`] = __(
                    language,
                    'pruvious-server',
                    "This block is not allowed in the slot '$slot'",
                    { slot: label || titleCase(slotName, false) },
                  )
                  disallowedChildBlocks.push(i)
                }
              }

              for (const validator of fields.repeater.validators) {
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
                      definition: fields.repeater,
                      input,
                      language,
                      name: `${name}.slots.${slotName}`,
                      operation,
                      options: resolveCollectionFieldOptions(
                        `block:${name}.slots.${slotName}`,
                        'repeater',
                        slotName,
                        { subfields: { block: { type: 'block', options: {} } } },
                        fields,
                      ),
                      value: value.slots[slotName],
                      currentQuery,
                      query,
                      errors,
                      fields,
                    })
                  }
                } catch (e: any) {
                  errors[`${name}.slots.${slotName}`] = e.message
                  value.slots[slotName] = []
                  break
                }
              }

              for (const i of disallowedChildBlocks.reverse()) {
                setProperty(input, `${name}.slots.${slotName}.${i}`, null)
              }
            } else {
              errors[`${name}.slots.${slotName}`] = __(language, 'pruvious-server', 'Invalid input type')
              value.slots[slotName] = []
              continue
            }
          } else {
            value.slots[slotName] = []
          }
        }
      } else {
        const parentPath = name.split('.').slice(0, -1).join('.')

        if (getProperty(input, parentPath)) {
          errors[parentPath] = __(language, 'pruvious-server', 'Invalid input type')
          setProperty(input, parentPath, null)
        }

        errors[`${name}.name`] = __(language, 'pruvious-server', 'Unrecognized block name')
      }
    },
  ],
  population: {
    type: { js: 'object', ts: 'PopulatedBlockData' },
    populator: async ({ currentQuery, fields, name, query, value }) => {
      if (isObject<CastedBlockData>(value) && isString(value.name) && isObject(value.fields)) {
        const { blocks } = await import('#pruvious/blocks')
        const blockDefinition = (blocks as any)[value.name] as BlockDefinition

        if (blockDefinition) {
          ;(currentQuery as any).maxPopulationDepth ||= {}
          ;(currentQuery as any).maxPopulationDepth[name] ??= 30
          ;(currentQuery as any).maxPopulationDepth[name]--

          if ((currentQuery as any).maxPopulationDepth[name] <= 0) {
            return null
          }

          for (const [fieldName, fieldValue] of Object.entries(value.fields)) {
            const declaration = blockDefinition.fields[fieldName]
            const definition = declaration ? fields[declaration.type] : undefined

            if (definition) {
              const population = declaration.additional?.population ?? definition?.population

              if (population) {
                ;(value as any).fields[fieldName] = await population.populator({
                  currentQuery,
                  definition,
                  fields,
                  name: `${name}.fields.${fieldName}`,
                  options: resolveCollectionFieldOptions(
                    `block:${name}.fields.${fieldName}.${JSON.stringify(declaration.options)}`,
                    declaration.type,
                    fieldName,
                    declaration.options,
                    fields,
                  ),
                  query,
                  value: fieldValue,
                })
              }
            }
          }

          for (const slotName of Object.keys(value.slots ?? {})) {
            ;(value as any).slots[slotName] = await (fields.repeater.population as ResolvedFieldPopulation).populator({
              currentQuery,
              definition: fields.repeater,
              fields,
              name: `${name}.slots.${slotName}`,
              options: resolveCollectionFieldOptions(
                `block:${name}.slots.${slotName}`,
                'repeater',
                slotName,
                { subfields: { block: { type: 'block', options: {} } } },
                fields,
              ),
              query,
              value: (value as any).slots[slotName],
            })
          }
        }
      }

      return value
    },
  },
  extractKeywords: async ({ collection, collections, fields, fieldValueType, record, value }) => {
    if (isObject<CastedBlockData>(value) && isString(value.name) && isObject(value.fields)) {
      const { blocks } = await import('#pruvious/blocks')
      const blockDefinition = (blocks as any)[value.name] as BlockDefinition
      const keywords: string[] = []

      if (blockDefinition) {
        for (const [fieldName, declaration] of Object.entries(blockDefinition.fields)) {
          const definition = fields[declaration.type]

          keywords.push(
            (
              await definition.extractKeywords({
                collection,
                collections,
                definition,
                fields,
                fieldValueType,
                options: resolveCollectionFieldOptions(
                  `block:${fieldName}.fields.${fieldName}.${JSON.stringify(declaration.options)}`,
                  declaration.type,
                  fieldName,
                  declaration.options,
                  fields,
                ),
                record,
                value: (value as any).fields[fieldName],
              })
            ).trim(),
          )
        }

        for (const slotName of Object.keys(blockDefinition.slots)) {
          keywords.push(
            (
              await fields.repeater.extractKeywords({
                collection,
                collections,
                definition: fields.repeater,
                fields,
                fieldValueType,
                options: resolveCollectionFieldOptions(
                  `block:${slotName}.slots.${slotName}`,
                  'repeater',
                  slotName,
                  { subfields: { block: { type: 'block', options: {} } } },
                  fields,
                ),
                record,
                value: (value as any).slots[slotName],
              })
            ).trim(),
          )
        }

        return keywords.filter(Boolean).join(' ')
      }
    }

    return ''
  },
  inputMeta: {
    type: 'BlockInputData',
    required: () => true,
    codeComment: ({ options }) => options.description || '',
  },
})

export const vueField = false
export const vueSubfield = false
