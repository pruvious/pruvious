import { blocksField, defineTemplate, textAreaField, textField } from '#pruvious/server'
import { isArray, isObject } from '@pruvious/utils'

export default defineTemplate(() => ({
  fields: {
    title: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Title'),
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Used to identify this pattern in the dashboard and the Pattern block picker.'),
      },
    }),
    description: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Description'),
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Optional notes that help editors understand when to use this pattern.'),
      },
    }),
    blocks: blocksField({
      denyRootBlocks: ['Pattern', 'ProseNode'],
      denyNestedBlocks: ['Pattern'],
    }),
  },
  routing: {
    referenceable: false,
    publicFields: ['title', 'description', 'blocks'],
    subpath: { allowEmptyString: true },
    isPublic: {
      ui: { hidden: true },
    },
    layout: 'pattern',
  },
  hooks: {
    beforeQueryPreparation: [
      (context) => {
        if (context.operation !== 'insert' && context.operation !== 'update') {
          return
        }
        const input = context.sanitizedInput
        if (isArray(input)) {
          for (const item of input) {
            if (isObject(item)) {
              ;(item as Record<string, any>).isPublic = false
            }
          }
        } else if (isObject(input)) {
          ;(input as Record<string, any>).isPublic = false
        }
      },
    ],
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Patterns'),
    icon: 'puzzle',
    menu: { group: 'general', order: 100 },
    indexPage: {
      dataTable: {
        columns: ['title | 20rem', 'description', 'updatedAt | 150px'],
        orderBy: 'updatedAt:desc',
      },
    },
    createPage: {
      fieldsLayout: ['title', 'description'],
    },
    updatePage: { fieldsLayout: 'mirror' },
  },
}))
