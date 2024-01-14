import type { FieldOptions } from '#pruvious'
import type { PropType } from 'vue'
import { defaultSanitizer } from '../../sanitizers/default'
import { stringSanitizer } from '../../sanitizers/string'
import { isNull } from '../../utils/common'
import { isKeyOf } from '../../utils/object'
import { titleCase } from '../../utils/string'
import { unifyLiteralStrings } from '../../utils/typescript'
import { requiredValidator } from '../../validators/required'
import { stringOrNullValidator } from '../../validators/string'
import { defineField, type FieldAdditional } from '../field.definition'

export default defineField({
  name: 'button-group',
  type: {
    js: 'string',
    ts: ({ options }) => {
      if (options.overrideType) {
        return options.overrideType
      }

      const choiceValues = options.choices ? Object.keys(options.choices) : []
      return unifyLiteralStrings(...choiceValues) + ' | null'
    },
  },
  default: ({ options }) => options.default ?? null,
  vueComponent: undefined as any,
  options: {
    choices: {
      type: 'Record<string, string>',
      description:
        'A key-value object containing permissible choices, where the key represents the choice value, and the value represents the corresponding label.',
      required: true,
    },
    required: {
      type: 'boolean',
      description: ['Specifies that the field input is mandatory during creation.', '', '@default false'],
      default: () => false,
    },
    label: {
      type: 'string',
      description: [
        'The field label displayed in the UI.',
        '',
        'By default, it is automatically generated based on the property name assigned to the field.',
        "Example: 'iconSize' => 'Icon size'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'string | null',
      description: ['The default field value.', '', '@default null'],
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
  sanitizers: [(context) => (context.options.required ? context.value : defaultSanitizer(context)), stringSanitizer],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    stringOrNullValidator,
    ({ __, language, options, value }) => {
      if (!isNull(value) && !isKeyOf(options.choices, value)) {
        throw new Error(__(language, 'pruvious-server', "Invalid value: '$value'", { value: value.toString() }))
      }
    },
  ],
  extractKeywords: ({ options, value }) =>
    value
      ? isKeyOf(options.choices, value)
        ? options.choices[value] === value
          ? value
          : `${options.choices[value]} ${value.toString()}`
        : value
      : '',
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})

/**
 * Create a new `button-group` field in a Vue block component.
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
  options: Omit<FieldOptions['button-group'], 'overrideType'> & { choices: Record<T, string>; default?: S & string },
  additional?: FieldAdditional,
) {
  return String as unknown as PropType<T & string>
}

/**
 * Create a new `button-group` subfield in a Vue block component.
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
  options: Omit<FieldOptions['button-group'], 'overrideType'> & { choices: Record<T, string>; default?: S & string },
  additional?: FieldAdditional,
) {
  return String as unknown as T & string
}
