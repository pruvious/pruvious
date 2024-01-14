import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isArray } from '../../utils/array'
import { isDefined, isNull, isUndefined } from '../../utils/common'
import { isInteger } from '../../utils/number'
import { titleCase } from '../../utils/string'
import { defineField } from '../field.definition'

export default defineField({
  name: 'date-range',
  type: { js: 'object', ts: '[number | null, number | null]' },
  default: ({ options }) => (isDefined(options.default) ? options.default : [null, null]),
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
        "Example: 'travelDate' => 'Travel date'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: '[number | null, number | null]',
      description: ['The default field value.', '', '@default [null, null]'],
      default: () => [null, null],
    },
    min: {
      type: 'number',
      description: ['The earliest possible date (as timestamp in milliseconds).', '', '@default -8639999949600000'],
      default: () => -8639999949600000,
    },
    max: {
      type: 'number',
      description: ['The latest possible date (as timestamp in milliseconds).', '', '@default 8639999949600000'],
      default: () => 8639999949600000,
    },
    name: {
      type: 'string | [string, string]',
      description: [
        'A string that specifies the `name` for the input controls.',
        'You can specify the name as a tuple of strings.',
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
      type: 'string | [string, string]',
      description: [
        'Text that appears in the input elements when they have no value set.',
        'You can specify the placeholder as a tuple of strings.',
      ],
    },
    clearable: {
      type: 'boolean | [boolean, boolean]',
      description: [
        'A boolean indicating whether to display a clear button that removes the current value.',
        'You can specify the clearable option as a tuple of booleans.',
        '',
        '@default true',
      ],
      default: () => true,
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    ({ value }) =>
      isArray(value) && value.length === 2
        ? [numericSanitizer({ value: value[0] }), numericSanitizer({ value: value[1] })]
        : value,
    ({ value }) => {
      if (isArray(value) && value.length === 2) {
        return value.map((v) => {
          if (isInteger(v)) {
            try {
              const date = new Date(v)
              date.setUTCHours(0, 0, 0, 0)
              return date.getTime()
            } catch {}
          }

          return v
        })
      }

      return value
    },
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => {
        if (
          context.options.required &&
          (isUndefined(context.value) ||
            isNull(context.value) ||
            (isArray(context.value) &&
              (isNull(context.value[0]) ||
                isUndefined(context.value[0]) ||
                isNull(context.value[1]) ||
                isUndefined(context.value[1]))))
        ) {
          throw new Error(context.__(context.language, 'pruvious-server', 'This field is required'))
        }
      },
    },
    ({ __, language, value }) => {
      if (
        isDefined(value) &&
        (!isArray(value) || value.length !== 2 || !value.every((v) => isInteger(v) || isNull(v)))
      ) {
        throw new Error(__(language, 'pruvious-server', 'Invalid input type'))
      }
    },
    ({ __, language, options, value }) => {
      if (isInteger(options.min)) {
        if ((isInteger(value[0]) && value[0] < options.min) || (isInteger(value[1]) && value[1] < options.min)) {
          throw new Error(
            __(language, 'pruvious-server', 'The inputs must be greater than or equal to $min', { min: options.min }),
          )
        }
      }
    },
    ({ __, language, options, value }) => {
      if (isInteger(options.max)) {
        if ((isInteger(value[0]) && value[0] > options.max) || (isInteger(value[1]) && value[1] > options.max)) {
          throw new Error(
            __(language, 'pruvious-server', 'The inputs must be less than or equal to $max', { max: options.max }),
          )
        }
      }
    },
    ({ __, language, value }) => {
      if (isInteger(value[0]) && isInteger(value[1]) && value[1] < value[0]) {
        throw new Error(__(language, 'pruvious-server', 'The second value cannot be less than the first value'))
      }
    },
  ],
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
