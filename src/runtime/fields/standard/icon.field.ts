import { defaultSanitizer } from '../../sanitizers/default'
import { stringSanitizer } from '../../sanitizers/string'
import { isArray } from '../../utils/array'
import { titleCase } from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { stringOrNullValidator } from '../../validators/string'
import { defineField } from '../field.definition'

export default defineField({
  name: 'icon',
  type: { js: 'string', ts: 'Icon | null' },
  default: ({ options }) => options.default ?? null,
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
        "Example: 'categoryIcon' => 'Category icon'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'Icon | null',
      description: ['The default field value.', '', '@default null'],
    },
    description: {
      type: 'string | string[]',
      description: [
        'A brief descriptive text displayed in code comments and in a tooltip at the upper right corner of the field.',
        '',
        'Use an array to handle line breaks.',
      ],
    },
    allow: {
      type: "Icon[] | '*'",
      description: [
        'An array of icon filenames (without the extension) from the `icons` folder in the Pruvious project.',
        'If specified, only these icons can be selected.',
        'By default, all icons can be selected.',
        '',
        "@default '*'",
      ],
      default: () => '*',
    },
    exclude: {
      type: 'Icon[]',
      description: [
        'An array of icon filenames (without the extension) from the `icons` folder in the Pruvious project.',
        'If specified, these icons cannot be selected.',
        'By default, no icons are excluded.',
        '',
        '@default []',
      ],
      default: () => [],
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
    {
      onCreate: true,
      onUpdate: true,
      validator: async ({ __, language, value }) => {
        if (value) {
          const { icons } = await import('#pruvious')

          if (!icons.includes(value)) {
            throw new Error(__(language, 'pruvious-server', 'The icon does not exist'))
          }
        }
      },
    },
    {
      onCreate: true,
      onUpdate: true,
      validator: ({ __, language, options, value }) => {
        if (value) {
          if (isArray(options.allow) && !options.allow.includes(value)) {
            throw new Error(__(language, 'pruvious-server', 'The icon is not allowed for this field'))
          } else if (isArray(options.exclude) && options.exclude.includes(value)) {
            throw new Error(__(language, 'pruvious-server', 'The icon is not allowed for this field'))
          }
        }
      },
    },
  ],
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
