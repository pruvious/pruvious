import type {
  CastedFieldType,
  CollectionName,
  FieldOptions,
  MultiCollectionName,
  PopulatedFieldType,
  SelectableFieldName,
} from '#pruvious'
import type { PropType } from 'vue'
import { resolveCollectionFieldOptions } from '../../collections/field-options.resolver'
import type { PickFields } from '../../collections/query-builder'
import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { uniqueArraySanitizer } from '../../sanitizers/unique-array'
import { isArray } from '../../utils/array'
import { isNull } from '../../utils/common'
import { isPositiveInteger } from '../../utils/number'
import { isObject } from '../../utils/object'
import { titleCase } from '../../utils/string'
import { unifyLiteralStrings } from '../../utils/typescript'
import { arrayValidator } from '../../validators/array'
import { requiredValidator } from '../../validators/required'
import { defineField, type FieldAdditional } from '../field.definition'

export default defineField({
  name: 'records',
  type: { js: 'object', ts: 'number[]' },
  default: ({ options }) => options.default ?? [],
  vueComponent: undefined as any,
  options: {
    collection: {
      type: 'MultiCollectionName',
      description: 'The name of the multi-entry collection from which to retrieve the records.',
      required: true,
    },
    fields: {
      type: 'Record<string, true> | string[]',
      description: [
        "The fields of the selected collection to be returned when this field's values are populated.",
        '',
        '@default { id: true }',
      ],
      default: () => ({ id: true }),
    },
    populate: {
      type: 'boolean',
      description: [
        'Specifies whether to populate the fields of the selected collection.',
        'Exercise **caution** when using this option, as it may trigger infinite loops during population if the related collection fields depend on additional population loops.',
        '',
        '@default false',
      ],
      default: () => false,
    },
    required: {
      type: 'boolean',
      description: [
        'Indicates whether the field input is mandatory, meaning it must be present during creation, and at least one record must be selected.',
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
        "Example: 'categories' => 'Categories'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'number[]',
      description: ['The default field value.', '', '@default []'],
      default: () => [],
    },
    name: {
      type: 'string',
      description: [
        'A string that specifies the `name` for the input control.',
        '',
        'If not specified, the `name` attribute will be automatically generated.',
      ],
    },
    description: {
      type: 'string | string[]',
      description: [
        'A brief descriptive text displayed in code comments and in a tooltip at the upper right corner of the field.',
        '',
        'Use an array to handle line breaks.',
      ],
    },
    placeholder: {
      type: 'string',
      description: ['Text that appears in the search input when there is no value.'],
    },
    sortable: {
      type: 'boolean',
      description: ['Indicates whether the records are sortable.', '', '@default false'],
      default: () => false,
    },
    visibleChoices: {
      type: 'number',
      description: ['The number of visible choices in the dropdown list (must be less than 30).'],
      default: () => 6,
    },
    recordLabel: {
      type: 'string | [string, string]',
      description: [
        'The collection field or fields used as the record label.',
        'When using multiple fields, the first field is used as the main label, and the second field is displayed only in search results.',
        '',
        'By default, the fields from the `dashboard.primaryField` and `dashboard.overviewTable.searchLabel` options of the selected collection are used.',
      ],
    },
    details: {
      type: 'string[]',
      description: ['An array of field names from the selected collection to display in tooltips.', '', '@default []'],
      default: () => [],
    },
  },
  population: {
    type: {
      js: 'object',
      ts: ({ options }) => {
        const fields = options.fields
          ? isObject(options.fields)
            ? Object.keys(options.fields)
            : options.fields
          : ['id']

        return (
          (options.populate
            ? `Pick<PopulatedFieldType['${options.collection}'], ${unifyLiteralStrings(...fields)}>`
            : `Pick<CastedFieldType['${options.collection}'], ${unifyLiteralStrings(...fields)}>`) + '[]'
        )
      },
    },
    populator: async ({ currentQuery, name, options, query, value }) => {
      const populated: any[] = []

      for (const v of value) {
        const q = query(options.collection) as any
        q.maxPopulationDepth = (currentQuery as any).maxPopulationDepth ?? {}
        q.maxPopulationDepth[name] ??= 30
        q.maxPopulationDepth[name]--

        if (options.populate && q.maxPopulationDepth[name] <= 0) {
          continue
        }

        try {
          const record = isPositiveInteger(v)
            ? await q
                .select(options.fields)
                .where('id', v)
                .setFieldValueType(options.populate ? 'populated' : 'casted')
                .first()
            : null

          if (record) {
            populated.push(record)
          }
        } catch {}
      }

      return populated
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    ({ value }) => (isArray(value) ? value.map((v) => numericSanitizer({ value: v })) : value),
    uniqueArraySanitizer,
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    arrayValidator,
    ({ __, language, value }) => {
      if (!value.every(isPositiveInteger)) {
        throw new Error(__(language, 'pruvious-server', 'Invalid input type'))
      }
    },
    async ({ __, collections, errors, language, name, value, options, query }) => {
      for (const [i, v] of value.entries()) {
        if (await (query as any)(options.collection).where('id', v).notExists()) {
          errors[`${name}.${i}`] = __(language, 'pruvious-server', 'The $item does not exist', {
            item: __(
              language,
              'pruvious-server',
              collections[options.collection as CollectionName].label.collection.singular as any,
            ),
          })
        }
      }
    },
  ],
  extractKeywords: async ({ collections, fields, fieldValueType, options, record, value }) => {
    if (fieldValueType === 'populated') {
      try {
        const collection = collections[options.collection as CollectionName]
        const keywords: string[] = []
        const fieldNames = isObject(options.fields) ? Object.keys(options.fields) : options.fields

        for (const v of value) {
          for (const fieldName of fieldNames) {
            const declaration = collection.fields[fieldName]
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
                    `records:${collection.name}.${fieldName}.${JSON.stringify(declaration)}`,
                    declaration.type,
                    fieldName,
                    declaration.options,
                    fields,
                  ),
                  record,
                  value: v[fieldName],
                })
              ).trim(),
            )
          }
        }

        return keywords.join(' ')
      } catch {}
    }

    return isObject(value) ? JSON.stringify(value) : isNull(value) ? '' : String(value)
  },
  serialize: (value) => JSON.stringify(isArray(value) ? value.map(String) : []),
  deserialize: (value) => JSON.parse(value).map(Number),
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})

/**
 * Create a new `records` field in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueField<
  CollectionName extends MultiCollectionName,
  ReturnableFieldName extends SelectableFieldName[CollectionName] = 'id',
  Populate extends boolean = false,
>(
  options: FieldOptions['records'] & {
    collection: CollectionName
    fields?: PickFields<SelectableFieldName[CollectionName], ReturnableFieldName>
    populate?: Populate
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as PropType<
    Populate extends true
      ? Pick<PopulatedFieldType[CollectionName], ReturnableFieldName & keyof PopulatedFieldType[CollectionName]>[]
      : Pick<CastedFieldType[CollectionName], ReturnableFieldName & keyof CastedFieldType[CollectionName]>[]
  >
}

/**
 * Create a new `records` subfield in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueSubfield<
  CollectionName extends MultiCollectionName,
  ReturnableFieldName extends SelectableFieldName[CollectionName] = 'id',
  Populate extends boolean = false,
>(
  options: FieldOptions['records'] & {
    collection: CollectionName
    fields?: PickFields<SelectableFieldName[CollectionName], ReturnableFieldName>
    populate?: Populate
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as Populate extends true
    ? Pick<PopulatedFieldType[CollectionName], ReturnableFieldName & keyof PopulatedFieldType[CollectionName]>[]
    : Pick<CastedFieldType[CollectionName], ReturnableFieldName & keyof CastedFieldType[CollectionName]>[]
}
