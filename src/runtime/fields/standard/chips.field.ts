import type { FieldOptions } from '#pruvious'
import type { PropType } from 'vue'
import { defaultSanitizer } from '../../sanitizers/default'
import { uniqueArraySanitizer } from '../../sanitizers/unique-array'
import { isArray } from '../../utils/array'
import { isNumber } from '../../utils/number'
import { isKeyOf } from '../../utils/object'
import { isString, titleCase } from '../../utils/string'
import { unifyLiteralStrings } from '../../utils/typescript'
import { arrayValidator } from '../../validators/array'
import { requiredValidator } from '../../validators/required'
import { defineField, type FieldAdditional } from '../field.definition'

export default defineField({
  name: 'chips',
  type: {
    js: 'object',
    ts: ({ options }) => {
      if (options.overrideType) {
        return options.overrideType
      } else if (options.allowCustomValues) {
        return 'string[]'
      }

      const choiceValues = options.choices ? Object.keys(options.choices) : []
      return choiceValues.length ? '(' + unifyLiteralStrings(...choiceValues) + ')[]' : 'never'
    },
  },
  default: ({ options }) => options.default ?? [],
  vueComponent: undefined as any,
  options: {
    choices: {
      type: 'Record<string, string>',
      description:
        'A key-value object containing permissible choices, where the key represents the choice value, and the value represents the corresponding chip label.',
      required: true,
    },
    required: {
      type: 'boolean',
      description: [
        'Indicates whether the field input is mandatory, meaning it must be present during creation, and at least one value must be selected.',
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
        "Example: 'postTags' => 'Post tags'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'string[]',
      description: ['The default field value.', '', '@default []'],
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
      description: ['Indicates whether the chips are sortable.', '', '@default false'],
      default: () => false,
    },
    tooltips: {
      type: 'boolean',
      description: ['Indicates whether to show chip values as tooltips.', '', '@default false'],
      default: () => false,
    },
    allowCustomValues: {
      type: 'boolean',
      description: [
        'Indicates whether to allow adding custom values dynamically.',
        '',
        'This will also set the field type to `string[]`.',
        '',
        '@default false',
      ],
      default: () => false,
    },
    clearInputOnPick: {
      type: 'boolean',
      description: ['Indicates whether to clear the search input after selecting a value.', '', '@default false'],
      default: () => false,
    },
    visibleSuggestions: {
      type: 'number',
      description: ['The number of visible suggestion choices in the dropdown list (must be less than 30).'],
      default: () => 6,
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
    uniqueArraySanitizer,
    ({ value }) => value.map((v: any) => (isNumber(v) ? v.toString() : v)),
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    arrayValidator,
    ({ __, language, options, value }) => {
      for (const v of value) {
        if (!isString(v)) {
          throw new Error(__(language, 'pruvious-server', 'Selected values must be strings'))
        } else if (!options.allowCustomValues && !isKeyOf(options.choices, v)) {
          throw new Error(__(language, 'pruvious-server', "Invalid value: '$value'", { value: v }))
        }
      }
    },
  ],
  extractKeywords: ({ options, value }) =>
    isArray(value)
      ? value
          .map((v) => {
            const l = options.choices[v]?.trim()
            return l === v ? l : l ? `${l} ${v}` : v
          })
          .filter(Boolean)
          .sort()
          .join(' ')
      : '',
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})

/**
 * Create a new `chips` field in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueField<T, S extends T>(
  // @ts-ignore
  options: Omit<FieldOptions['chips'], 'overrideType'> & { choices: Record<T, string>; default?: (S & string)[] },
  additional?: FieldAdditional,
) {
  return Array as unknown as PropType<(T & string)[]>
}

/**
 * Create a new `chips` subfield in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueSubfield<T, S extends T>(
  // @ts-ignore
  options: Omit<FieldOptions['chips'], 'overrideType'> & { choices: Record<T, string>; default?: (S & string)[] },
  additional?: FieldAdditional,
) {
  return Array as unknown as (T & string)[]
}
