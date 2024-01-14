import { clamp } from '@antfu/utils'
import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isDefined } from '../../utils/common'
import { countDecimals } from '../../utils/number'
import { titleCase } from '../../utils/string'
import { numberValidator } from '../../validators/number'
import { requiredValidator } from '../../validators/required'
import { defineField } from '../field.definition'

export default defineField({
  name: 'number',
  type: 'number',
  default: ({ options }) =>
    options.default ?? clamp(0, options.min ?? Number.MIN_SAFE_INTEGER, options.max ?? Number.MAX_SAFE_INTEGER),
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
        "Example: 'numberOfGuests' => 'Number of guests'",
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
    decimals: {
      type: 'number',
      description: [
        'Specifies the maximum number of allowed decimal places for the number.',
        '',
        'Set to 0 to allow integers only.',
        '',
        '**Caution:** Consider JavaScript Number limits (`MIN_SAFE_INTEGER` and `MAX_SAFE_INTEGER`).',
        '',
        '@default 0',
      ],
      default: () => 0,
    },
    min: {
      type: 'number',
      description: ['The minimum allowed number.', '', '@default Number.MIN_SAFE_INTEGER (-9007199254740991)'],
      default: () => Number.MIN_SAFE_INTEGER,
    },
    max: {
      type: 'number',
      description: ['The maximum allowed number.', '', '@default Number.MAX_SAFE_INTEGER (9007199254740991)'],
      default: () => Number.MAX_SAFE_INTEGER,
    },
    step: {
      type: 'number',
      description: [
        'The `step` attribute specifies the interval between legal numbers in an `<input>` element.',
        '',
        '@default 1',
      ],
      default: () => 1,
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
    prefix: {
      type: 'string',
      description: ['A short text to be prepended before the input element.'],
    },
    suffix: {
      type: 'string',
      description: ['A short text to be appended after the input element.'],
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
      if (isDefined(options.decimals) && countDecimals(value) > options.decimals) {
        if (options.decimals === 0) {
          throw new Error(__(language, 'pruvious-server', 'The input must be an integer'))
        } else {
          throw new Error(
            __(language, 'pruvious-server', 'The input cannot have more than $count $decimals', {
              count: options.decimals,
            }),
          )
        }
      }
    },
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
