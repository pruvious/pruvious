import type { CastedFieldType, FieldOptions, PopulatedFieldType, SelectableFieldName } from '#pruvious'
import type { PropType } from 'vue'
import { resolveCollectionFieldOptions } from '../../collections/field-options.resolver'
import type { PickFields } from '../../collections/query-builder'
import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { format, parse } from '../../utils/bytes'
import { isDefined, isNull } from '../../utils/common'
import { isNumber, isPositiveInteger } from '../../utils/number'
import { isObject } from '../../utils/object'
import { titleCase } from '../../utils/string'
import { unifyLiteralStrings } from '../../utils/typescript'
import { positiveIntegerOrNullValidator } from '../../validators/number'
import { requiredValidator } from '../../validators/required'
import { defineField, type FieldAdditional } from '../field.definition'

export default defineField({
  name: 'file',
  type: { js: 'number', ts: 'number | null', db: 'BIGINT' },
  default: ({ options }) => options.default ?? null,
  vueComponent: undefined as any,
  options: {
    fields: {
      type: 'Record<string, true> | string[]',
      description: [
        "The fields of the 'uploads' collection to be returned when this field's value is populated.",
        '',
        '@default { directory: true, filename: true }',
      ],
      default: () => ({ directory: true, filename: true }),
    },
    populate: {
      type: 'boolean',
      description: [
        "Specifies whether to populate the fields of the 'uploads' collection.",
        "The 'uploads' collection does not have fields that can be populated by default.",
        '',
        '@default false',
      ],
      default: () => false,
    },
    required: {
      type: 'boolean',
      description: ['Specifies whether the field input is required during creation.', '', '@default false'],
      default: () => false,
    },
    label: {
      type: 'string',
      description: [
        'The field label displayed in the UI.',
        '',
        'By default, it is automatically generated based on the property name assigned to the field.',
        "Example: 'productVideo' => 'Product video'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'number | null',
      description: ['The default field value.', '', '@default null'],
    },
    maxSize: {
      type: 'number | string',
      description: [
        'The maximum allowed file size in bytes.',
        "You can provide this limit as a string (e.g., '32 MB') or as an integer, reflecting byte count.",
        'String sizes are parsed using the `bytes` npm package.',
        '',
        'By default there is no limit.',
      ],
    },
    allowedTypes: {
      type: 'string[]',
      description: [
        'An array of allowed file types or extensions.',
        '',
        'If not specified, all file types are allowed.',
        '',
        '@example',
        '```typescript',
        "['video/quicktime', '.mp4', 'AVI']",
        '```',
      ],
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
  },
  population: {
    type: {
      js: 'object',
      ts: ({ options }) => {
        const fields = options.fields
          ? isObject(options.fields)
            ? Object.keys(options.fields)
            : options.fields
          : ['directory', 'filename']

        return (
          (options.populate
            ? `Pick<PopulatedFieldType['uploads'], ${unifyLiteralStrings(...fields)}>`
            : `Pick<CastedFieldType['uploads'], ${unifyLiteralStrings(...fields)}>`) + ' | null'
        )
      },
    },
    populator: async ({ currentQuery, name, options, query, value }) => {
      const q = query('uploads') as any
      q.maxPopulationDepth = (currentQuery as any).maxPopulationDepth ?? {}
      q.maxPopulationDepth[name] ??= 30
      q.maxPopulationDepth[name]--

      if (options.populate && q.maxPopulationDepth[name] <= 0) {
        return null
      }

      try {
        return isPositiveInteger(value)
          ? await q
              .select(options.fields)
              .where('id', value)
              .setFieldValueType(options.populate ? 'populated' : 'casted')
              .first()
          : null
      } catch {
        return null
      }
    },
  },
  sanitizers: [(context) => (context.options.required ? context.value : defaultSanitizer(context)), numericSanitizer],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    positiveIntegerOrNullValidator,
    async ({ __, language, collections, options, value, query }) => {
      if (value) {
        const upload = await query('uploads').where('id', value).first()

        if (!upload) {
          throw new Error(
            __(language, 'pruvious-server', 'The $item does not exist', {
              item: __(language, 'pruvious-server', collections['uploads'].label.collection.singular as any),
            }),
          )
        }

        if (isDefined(options.maxSize)) {
          const maxSize = isNumber(options.maxSize) ? options.maxSize : parse(options.maxSize as string)!

          if (upload.size > maxSize) {
            throw new Error(
              __(language, 'pruvious-server', 'The maximum allowable file size is $size', {
                size:
                  format(maxSize, {
                    unitSeparator: ' ',
                  }) ?? 'unknown',
              }),
            )
          }
        }

        if (isDefined(options.allowedTypes)) {
          const extension = upload.filename.split('.').pop() ?? ''
          const allowedTypes = (options.allowedTypes as string[]).map((type) => type.toLowerCase())

          if (
            !allowedTypes.some((type) =>
              type.includes('/') ? type === upload.type : type.replace(/^\./, '') === extension,
            )
          ) {
            throw new Error(
              __(language, 'pruvious-server', 'The file type must be one of the following: $types', {
                types: allowedTypes
                  .map((type) => (type.startsWith('.') ? type.slice(1) : type))
                  .sort()
                  .join(', '),
              }),
            )
          }
        }
      }
    },
  ],
  extractKeywords: async ({ collections, fields, fieldValueType, options, record, value }) => {
    if (fieldValueType === 'populated') {
      try {
        const collection = collections.uploads
        const keywords: string[] = []
        const fieldNames = isObject(options.fields) ? Object.keys(options.fields) : options.fields

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
                  `record:${collection.name}.${fieldName}.${JSON.stringify(declaration)}`,
                  declaration.type,
                  fieldName,
                  declaration.options,
                  fields,
                ),
                record,
                value: (value as any)[fieldName],
              })
            ).trim(),
          )
        }

        return keywords.join(' ')
      } catch {}
    }

    return isObject(value) ? JSON.stringify(value) : isNull(value) ? '' : String(value)
  },
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})

/**
 * Create a new `file` field in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueField<
  ReturnableFieldName extends SelectableFieldName['uploads'] = 'directory' | 'filename',
  Populate extends boolean = false,
>(
  options?: FieldOptions['file'] & {
    fields?: PickFields<SelectableFieldName['uploads'], ReturnableFieldName>
    populate?: Populate
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as PropType<
    Populate extends true
      ? Pick<PopulatedFieldType['uploads'], ReturnableFieldName & keyof PopulatedFieldType['uploads']> | null
      : Pick<CastedFieldType['uploads'], ReturnableFieldName & keyof CastedFieldType['uploads']> | null
  >
}

/**
 * Create a new `file` subfield in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueSubfield<
  ReturnableFieldName extends SelectableFieldName['uploads'] = 'directory' | 'filename',
  Populate extends boolean = false,
>(
  options?: FieldOptions['file'] & {
    fields?: PickFields<SelectableFieldName['uploads'], ReturnableFieldName>
    populate?: Populate
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as Populate extends true
    ? Pick<PopulatedFieldType['uploads'], ReturnableFieldName & keyof PopulatedFieldType['uploads']> | null
    : Pick<CastedFieldType['uploads'], ReturnableFieldName & keyof CastedFieldType['uploads']> | null
}
