import { clamp } from '@antfu/utils'
import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isDefined } from '../../utils/common'
import { titleCase } from '../../utils/string'
import { numberValidator } from '../../validators/number'
import { requiredValidator } from '../../validators/required'
import { defineField } from '../field.definition'

export default defineField({
  name: 'slider',
  type: 'number',
  default: ({ options }) => options.default ?? clamp(0, options.min, options.max),
  vueComponent: undefined as any,
  options: {
    required: {
      type: 'boolean',
      description: [
        'Specifies whether the field input is mandatory. The requirement check allows the value `0` to be considered as valid.',
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
        "Example: 'maxGuests' => 'Max guests'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'number',
      description: [
        'The default field value.',
        '',
        'By default, this is set to 0 if possible, otherwise it uses the `min` value.',
      ],
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
    input: {
      type: 'boolean',
      description: ['Specifies whether to display an input field next to the slider.', '', '@default true'],
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
  sanitizers: [(context) => (context.options.required ? context.value : defaultSanitizer(context)), numericSanitizer],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    numberValidator,
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
    ({ __, language, options, value }) => {
      if (options.step !== 0) {
        const remainder = (value - options.min) % options.step

        if (remainder !== 0) {
          throw new Error(
            __(language, 'pruvious-server', 'The input must be a multiple of $interval between $min and $max', {
              interval: options.step,
              min: options.min,
              max: options.max,
            }),
          )
        }
      }
    },
  ],
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
