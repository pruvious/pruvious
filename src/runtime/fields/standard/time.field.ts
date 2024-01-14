import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isDefined } from '../../utils/common'
import { titleCase } from '../../utils/string'
import { integerOrNullValidator } from '../../validators/number'
import { requiredValidator } from '../../validators/required'
import { defineField } from '../field.definition'

export default defineField({
  name: 'time',
  type: { js: 'number', ts: 'number | null', db: 'INTEGER' },
  default: ({ options }) => (isDefined(options.default) ? options.default : null),
  vueComponent: undefined as any,
  options: {
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
        "Example: 'eventTime' => 'Event time'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'number | null',
      description: ['The default field value.', '', '@default null'],
    },
    min: {
      type: 'number',
      description: ['The earliest possible time (as timestamp in milliseconds).', '', '@default 0'],
      default: () => 0,
    },
    max: {
      type: 'number',
      description: ['The latest possible time (as timestamp in milliseconds).', '', '@default 86399999'],
      default: () => 86399999,
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
      description: ['Text that appears in the input element when it has no value set.'],
    },
    clearable: {
      type: 'boolean',
      description: [
        'A boolean indicating whether to display a clear button that removes the current value.',
        '',
        '@default true',
      ],
      default: () => true,
    },
  },
  sanitizers: [(context) => (context.options.required ? context.value : defaultSanitizer(context)), numericSanitizer],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    integerOrNullValidator,
    ({ __, language, options, value }) => {
      if (isDefined(options.min) && value < options.min) {
        throw new Error(
          __(language, 'pruvious-server', 'The input must be greater than or equal to $min', { min: options.min }),
        )
      }
    },
    ({ __, language, options, value }) => {
      if (isDefined(options.max) && value > options.max) {
        throw new Error(
          __(language, 'pruvious-server', 'The input must be less than or equal to $max', { max: options.max }),
        )
      }
    },
  ],
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
