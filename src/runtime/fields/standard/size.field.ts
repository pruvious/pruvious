import { type FieldOptions, type SizeInput } from '#pruvious/preflight'
import type { PropType } from 'vue'
import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isArray } from '../../utils/array'
import { isNull } from '../../utils/common'
import { isNumber, isRealNumber } from '../../utils/number'
import { isObject } from '../../utils/object'
import { isString, titleCase } from '../../utils/string'
import { unifyLiteralStrings } from '../../utils/typescript'
import { requiredValidator } from '../../validators/required'
import { defineField, type FieldAdditional } from '../field.definition'

export default defineField({
  name: 'size',
  type: {
    js: 'object',
    ts: ({ options }) => {
      const inputs: Record<string, SizeInput> = options.inputs ?? { width: {}, height: {} }

      return `{ ${Object.entries(inputs)
        .map(
          ([key, input]) =>
            `${key}: { value: number` +
            (isArray(input.units) ? `; unit: ${unifyLiteralStrings(...input.units)}` : '') +
            ` }`,
        )
        .join(', ')} }`
    },
  },
  default: ({ options }) => options.default ?? '',
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
        "Example: 'imageSize' => 'Image size'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    inputs: {
      type: 'Record<string, SizeInput>',
      description: [
        'A record of subfields that make up the field.',
        'The keys of the record are used as the subfield names.',
        '',
        '@default { width: {}, height: {} }',
      ],
      default: () => ({ width: {}, height: {} }),
    },
    default: {
      type: 'Record<string, { value: number; unit?: string }>',
      description: [
        'The default field value.',
        '',
        'By default, all defined size `inputs` are set to their `min` value and first unit in the a `units` array.',
      ],
      default: ({ options }) => {
        const inputs: Record<string, SizeInput> = options.inputs ?? { width: {}, height: {} }

        return Object.keys(inputs).reduce<Record<string, { value: number; unit?: string }>>((acc, key) => {
          acc[key] = inputs[key].default ?? { value: inputs[key].min ?? 0, unit: inputs[key].units?.[0] }
          return acc
        }, {})
      },
    },
    name: {
      type: 'string',
      description: [
        'A string that specifies the base `name` for the input controls.',
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
    syncable: {
      type: 'boolean',
      description: ['Whether the size values can be synchronized in the field UI.', '', '@default false'],
      default: () => false,
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    ({ options, value }) => {
      const inputs: Record<string, SizeInput> = options.inputs ?? { width: {}, height: {} }

      if (isString(value) || isNumber(value)) {
        const numeric = numericSanitizer({ value })

        if (isRealNumber(numeric)) {
          return Object.keys(inputs).reduce<Record<string, { value: number; unit?: string }>>((acc, key) => {
            acc[key] = { value: numeric }
            return acc
          }, {})
        }
      } else if (isObject<Record<string, any>>(value)) {
        return Object.keys(value).reduce<Record<string, { value: number; unit?: string }>>((acc, key) => {
          const numeric = numericSanitizer({ value: value[key] })
          acc[key] = isRealNumber(numeric) ? { value: numeric } : value[key]
          return acc
        }, {})
      }

      return value
    },
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    ({ __, language, options, value }) => {
      const inputs: Record<string, SizeInput> = options.inputs ?? { width: {}, height: {} }

      if (
        !isNull(value) &&
        (!isObject<Record<string, { value: number; unit?: string }>>(value) ||
          JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(Object.keys(inputs).sort()) ||
          Object.values(value).some(
            (input) => !isObject(input) || Object.keys(input).some((key) => key !== 'value' && key !== 'unit'),
          ))
      ) {
        throw new Error(__(language, 'pruvious-server', 'Invalid input type'))
      }
    },
    ({ __, language, options, value }) => {
      const inputs: Record<string, SizeInput> = options.inputs ?? { width: {}, height: {} }

      for (const [key, input] of Object.entries<{ value: number; unit?: string }>(value)) {
        const def = inputs[key]

        if (!isRealNumber(input.value)) {
          throw new Error(
            __(language, 'pruvious-server', "The '$name' value must be numeric", {
              name: __(language, 'pruvious-dashboard', (inputs[key].label ?? titleCase(key)) as any),
            }),
          )
        } else if (input.value < (def.min ?? 0)) {
          throw new Error(
            __(language, 'pruvious-server', "The '$name' value must be greater than or equal to $min", {
              name: __(language, 'pruvious-dashboard', (inputs[key].label ?? titleCase(key)) as any),
              min: def.min ?? 0,
            }),
          )
        } else if (input.value > (def.max ?? Number.MAX_SAFE_INTEGER)) {
          throw new Error(
            __(language, 'pruvious-server', "The '$name' value must be less than or equal to $max", {
              name: __(language, 'pruvious-dashboard', (inputs[key].label ?? titleCase(key)) as any),
              max: def.max ?? Number.MAX_SAFE_INTEGER,
            }),
          )
        } else if (def.units?.length && (!input.unit || !def.units.includes(input.unit))) {
          throw new Error(
            __(language, 'pruvious-server', "Invalid '$name' unit", {
              name: __(language, 'pruvious-dashboard', (inputs[key].label ?? titleCase(key)) as any),
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

/**
 * Create a new `size` field in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueField<T extends string = 'width' | 'height'>(
  options?: FieldOptions['size'] & {
    inputs: Record<T, SizeInput>
    default?: Record<T, { value: number; unit?: string }>
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as PropType<Record<T, { value: number; unit?: string }>>
}

/**
 * Create a new `size` subfield in a Vue block component.
 *
 * @param options - The field options.
 * @param additional - Additional field configurations.
 *
 * @returns The **populated** field type used to annotate a Vue `prop`.
 *
 * @see https://pruvious.com/docs/creating-blocks
 */
export function vueSubfield<T extends string = 'width' | 'height'>(
  options?: FieldOptions['size'] & {
    inputs: Record<T, SizeInput>
    default?: Record<T, { value: number; unit?: string }>
  },
  additional?: FieldAdditional,
) {
  return Object as unknown as Record<T, { value: number; unit?: string }>
}
