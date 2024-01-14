import { defaultSanitizer } from '../../sanitizers/default'
import { stringSanitizer } from '../../sanitizers/string'
import { isString, titleCase } from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { stringValidator } from '../../validators/string'
import { defineField } from '../field.definition'

export default defineField({
  name: 'text-area',
  type: 'string',
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
        "Example: 'description' => 'Description'",
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
        'A string that specifies the `name` for the input control.',
        '',
        'If not specified, the `name` attribute will be automatically generated.',
      ],
    },
    wrap: {
      type: 'boolean',
      description: [
        'Specifies whether the text in the field should be automatically wrapped.',
        '',
        'If `false`, the text will only wrap on enter or hard breaks.',
      ],
      default: () => true,
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
    spellcheck: {
      type: "boolean | 'true' | 'false'",
      description: [
        'A booleanish value indicating whether spellchecking is enabled for the input element.',
        '',
        "@default 'false'",
      ],
      default: () => 'false',
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
