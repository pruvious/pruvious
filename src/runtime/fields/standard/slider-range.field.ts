import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isArray } from '../../utils/array'
import { isDefined } from '../../utils/common'
import { isRealNumber } from '../../utils/number'
import { titleCase } from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { defineField } from '../field.definition'

export default defineField({
  name: 'slider-range',
  type: { js: 'object', ts: '[number, number]' },
  default: ({ options }) => options.default ?? [options.min ?? 0, options.max ?? 100],
  vueComponent: undefined as any,
  options: {
    required: {
      type: 'boolean',
      description: [
        'Specifies whether the field input is mandatory. The requirement check allows the value `[0, 0]` to be considered as valid.',
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
        "Example: 'temperatureRange' => 'Temperature range'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: '[number, number]',
      description: ['The default field value.', '', 'By default, this is set to the minimum and maximum values.'],
    },
    min: {
      type: 'number',
      description: ['The minimum allowed number.', '', '@default 0'],
      default: () => 0,
    },
    max: {
      type: 'number',
      description: ['The maximum allowed number.', '', '@default 100'],
      default: () => 100,
    },
    step: {
      type: 'number',
      description: ['Specifies the number intervals in the slider.', '', '@default 1'],
      default: () => 1,
    },
    minRange: {
      type: 'number',
      description: ['The minimum range between the two inputs.', '', '@default 0'],
      default: () => 0,
    },
    maxRange: {
      type: 'number',
      description: [
        'Specifies the maximum range between the two inputs.',
        '',
        'By default, this is set to `max - min`.',
      ],
      default: ({ options }) => options.max - options.min,
    },
    marks: {
      type: 'boolean | number[]',
      description: [
        'Specifies whether to display the number intervals (steps) in the slider.',
        'Marks can be customized by passing an array of numbers.',
        '',
        '@default false',
      ],
      default: () => false,
    },
    inputs: {
      type: 'boolean',
      description: ['Specifies whether to display the input fields next to the slider.', '', '@default true'],
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
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    ({ value }) =>
      isArray(value) && value.length === 2
        ? [numericSanitizer({ value: value[0] }), numericSanitizer({ value: value[1] })]
        : value,
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    ({ __, language, value }) => {
      if (!isArray(value) || value.length !== 2 || !value.every(isRealNumber)) {
        throw new Error(__(language, 'pruvious-server', 'Invalid input type'))
      }
    },
    ({ __, language, options, value }) => {
      if ((isDefined(options.min) && value[0] < options.min) || (isDefined(options.min) && value[1] < options.min)) {
        throw new Error(
          __(language, 'pruvious-server', 'The inputs must be greater than or equal to $min', { min: options.min }),
        )
      }
    },
    ({ __, language, options, value }) => {
      if ((isDefined(options.max) && value[0] > options.max) || (isDefined(options.max) && value[1] > options.max)) {
        throw new Error(
          __(language, 'pruvious-server', 'The inputs must be less than or equal to $max', { max: options.max }),
        )
      }
    },
    ({ __, language, options, value }) => {
      if (options.step !== 0) {
        const remainder0 = (value[0] - options.min) % options.step
        const remainder1 = (value[1] - options.min) % options.step

        if (remainder0 !== 0 || remainder1 !== 0) {
          throw new Error(
            __(language, 'pruvious-server', 'The inputs must be a multiple of $interval between $min and $max', {
              interval: options.step,
              min: options.min,
              max: options.max,
            }),
          )
        }
      }
    },
    ({ __, language, options, value }) => {
      if (value[1] - value[0] < options.minRange) {
        throw new Error(
          __(language, 'pruvious-server', 'The minimum range between the inputs is $minRange', {
            minRange: options.minRange,
          }),
        )
      }
    },
    ({ __, language, options, value }) => {
      if (value[1] - value[0] > options.maxRange) {
        throw new Error(
          __(language, 'pruvious-server', 'The maximum range between the inputs is $maxRange', {
            maxRange: options.maxRange,
          }),
        )
      }
    },
  ],
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
