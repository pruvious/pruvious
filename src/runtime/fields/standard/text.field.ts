import type { FieldOptions } from '#pruvious'
import type { PropType } from 'vue'
import { defaultSanitizer } from '../../sanitizers/default'
import { stringSanitizer } from '../../sanitizers/string'
import { isString, titleCase } from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { stringValidator } from '../../validators/string'
import { defineField, type FieldAdditional } from '../field.definition'

export default defineField({
  name: 'text',
  type: { js: 'string', ts: ({ options }) => options.overrideType ?? 'string' },
  default: ({ options }) => options.default ?? '',
  vueComponent: undefined as any,
  options: {
    required: {
      type: 'boolean',
      description: [
        'Specifies that the input field is mandatory during creation and cannot have an empty string value.',
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
        "Example: 'firstName' => 'First name'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'string',
      description: ['The default field value.', '', "@default ''"],
      default: () => '',
    },
    trim: {
      type: 'boolean',
      description: ['Specifies whether to remove whitespace from both ends of the input string.', '', '@default true'],
      default: () => true,
    },
    name: {
      type: 'string',
      description: [
        'A string that specifies the `name` for the input control, influencing autocomplete behavior in some browsers.',
        '',
        'If not specified, the `name` attribute will be automatically generated.',
      ],
    },
    type: {
      type: 'string',
      description: ['Input `type` of the control.', '', "@default 'text'"],
      default: () => 'text',
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
      description: ['Text that appears in the input element when it has no value set.'],
    },
    autocomplete: {
      type: 'string',
      description: [
        'A string specifying autocomplete behavior for the input element.',
        '',
        "@default 'off'",
        '',
        '@see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete',
      ],
      default: () => 'off',
    },
    spellcheck: {
      type: "boolean | 'true' | 'false'",
      description: [
        'A booleanish value indicating whether spellchecking is enabled for the input element.',
        '',
        "@default 'false'",
      ],
      default: () => 'false',
    },
    prefix: {
      type: 'string',
      description: ['A short text to be prepended before the input element.'],
    },
    suffix: {
      type: 'string',
      description: ['A short text to be appended after the input element.'],
    },
    clearable: {
      type: 'boolean',
      description: [
        'A boolean indicating whether to display a clear button that removes the current input text.',
        '',
        '@default false',
      ],
      default: () => false,
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
    ({ value, options }) => (options.trim && isString(value) ? value.trim() : value),
    stringSanitizer,
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    stringValidator,
  ],
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})

/**
 * Create a new `text` field in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueField(options?: Omit<FieldOptions['text'], 'overrideType'>, additional?: FieldAdditional) {
  return String as unknown as PropType<string>
}

/**
 * Create a new `text` subfield in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueSubfield(options?: Omit<FieldOptions['text'], 'overrideType'>, additional?: FieldAdditional) {
  return String as unknown as string
}
