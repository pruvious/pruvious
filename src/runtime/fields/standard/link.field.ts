import type { CollectionName, PublicPagesOptions } from '#pruvious'
import { prefixPrimaryLanguage, primaryLanguage } from '#pruvious/preflight'
import { defaultSanitizer } from '../../sanitizers/default'
import { stringSanitizer } from '../../sanitizers/string'
import {
  capitalize,
  isString,
  isUrl,
  isUrlPath,
  joinRouteParts,
  resolveCollectionPathPrefix,
  titleCase,
} from '../../utils/string'
import { requiredValidator } from '../../validators/required'
import { stringValidator } from '../../validators/string'
import { defineField } from '../field.definition'

export default defineField({
  name: 'link',
  type: 'string',
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
        "Example: 'landingPage' => 'Landing page'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'string',
      description: ['The default field value.', '', "@default ''"],
    },
    name: {
      type: 'string',
      description: [
        'A string that specifies the `name` for the input control, influencing autocomplete behavior in some browsers.',
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
    visibleChoices: {
      type: 'number',
      description: ['The number of visible link choices in the dropdown list (must be less than 30).'],
      default: () => 6,
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    ({ value }) => (isString(value) ? value.trim() : value),
    stringSanitizer,
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    stringValidator,
    {
      onCreate: true,
      onUpdate: true,
      validator: ({ __, language, value }) => {
        const path = value.split('#')[0].split('?')[0]

        if (!isUrl(path) && !isUrlPath(path, true) && !path.startsWith('#')) {
          throw new Error(
            path.startsWith('http')
              ? __(language, 'pruvious-server', 'Invalid URL')
              : __(language, 'pruvious-server', 'Invalid URL path'),
          )
        }
      },
    },
    {
      onCreate: true,
      onUpdate: true,
      validator: async ({ __, collections, language, query, value }) => {
        const match = value.match(/^([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?$/)

        if (match) {
          const c = collections[match[1] as CollectionName]

          if (c?.publicPages) {
            const record = await (query as any)(c.name).where('id', match[2]).exists()

            if (!record) {
              throw new Error(
                __(language, 'pruvious-server', '$item #$id does not exist and cannot be linked', {
                  item: capitalize(c.label.record.singular),
                  id: +match[2],
                }),
              )
            }
          }
        }
      },
    },
  ],
  population: {
    type: 'string',
    populator: async ({ query, value }) => {
      const { collections } = await import('#pruvious/collections')
      const match = value.match(/^([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?$/)

      if (match) {
        const c = collections[match[1] as CollectionName]

        if (c?.publicPages) {
          const pathField = (c.publicPages as PublicPagesOptions).pathField ?? 'path'
          const record = await (query as any)(c.name)
            .select({ [pathField]: true, language: true })
            .where('id', match[2])
            .first()

          if (record) {
            return (
              joinRouteParts(
                record.language === primaryLanguage && !prefixPrimaryLanguage ? '' : record.language,
                resolveCollectionPathPrefix(c, record.language, primaryLanguage),
                record[pathField],
              ) + (match[3] ?? '')
            )
          }
        }
      }

      return value
    },
  },
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
