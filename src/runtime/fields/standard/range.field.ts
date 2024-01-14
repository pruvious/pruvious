import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isArray } from '../../utils/array'
import { isDefined } from '../../utils/common'
import { countDecimals, isRealNumber } from '../../utils/number'
import { titleCase } from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { defineField } from '../field.definition'

export default defineField({
  name: 'range',
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
    decimals: {
      type: 'number',
      description: [
        'Specifies the maximum number of allowed decimal places for the inputs.',
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
      description: [
        'The `step` attribute specifies the interval between legal numbers in the `<input>` elements.',
        '',
        '@default 1',
      ],
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
    name: {
      type: 'string | [string | null, string | null]',
      description: [
        'A string that specifies the `name` for the input controls.',
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
      type: 'string | [string | null, string | null]',
      description: ['Text that appears in the input elements when they have no value set.'],
    },
    prefix: {
      type: 'string | [string | null, string | null]',
      description: ['A short text to be prepended before the input elements.'],
    },
    suffix: {
      type: 'string | [string | null, string | null]',
      description: ['A short text to be appended after the input elements.'],
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
      if (
        isDefined(options.decimals) &&
        (countDecimals(value[0]) > options.decimals || countDecimals(value[1]) > options.decimals)
      ) {
        if (options.decimals === 0) {
          throw new Error(__(language, 'pruvious-server', 'The inputs must be integers'))
        } else {
          throw new Error(
            __(language, 'pruvious-server', 'The inputs cannot have more than $count $decimals', {
              count: options.decimals,
            }),
          )
        }
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
      if (value[1] - value[0] < options.minRange) {
        throw new Error(
          __(language, 'pruvious-server', 'The minimum range between the inputs is $minRange', {
            minRange: options.minRange,
          }),
        )
      } else if (value[1] < value[0]) {
        throw new Error(__(language, 'pruvious-server', 'The second value cannot be less than the first value'))
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
