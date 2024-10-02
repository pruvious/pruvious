import { type CollectionName, type PublicPagesOptions } from '#pruvious'
import { prefixPrimaryLanguage, primaryLanguage } from '#pruvious/preflight'
import { defaultSanitizer } from '../../sanitizers/default'
import { stringSanitizer } from '../../sanitizers/string'
import { capitalize, isString, joinRouteParts, resolveCollectionPathPrefix, titleCase } from '../../utils/string'
import { stringValidator } from '../../validators/string'
import { defineField } from '../field.definition'

export default defineField({
  name: 'editor',
  type: 'string',
  default: ({ options }) => options.default ?? '',
  vueComponent: undefined as any,
  options: {
    required: {
      type: 'boolean',
      description: [
        'Specifies that the field input is mandatory during creation, and the field value cannot be empty.',
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
        "Example: 'heroContent' => 'Hero content'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: 'string',
      description: ['The default field value.', '', "@default '<p></p>'"],
      default: () => '<p></p>',
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
    toolbar: {
      type: "('blockFormats' | 'blockquote' | 'bold' | 'bulletList' | 'center' | 'clear' | 'code' | 'codeBlock' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6' | 'hardBreak' | 'highlight' | 'horizontalRule' | 'inlineFormats' | 'italic' | 'justify' | 'left' | 'link' | 'normalize' | 'orderedList' | 'paragraph' | 'redo' | 'right' | 'strike' | 'subscript' | 'superscript' | 'underline' | 'undo')[]",
      description: [
        'An array of strings that specifies the toolbar buttons to display.',
        '',
        'The available buttons are as follows:',
        '',
        '- `blockFormats`',
        '- `blockquote`',
        '- `bold`',
        '- `bulletList`',
        '- `center`',
        '- `clear`',
        '- `code`',
        '- `codeBlock`',
        '- `heading1`',
        '- `heading2`',
        '- `heading3`',
        '- `heading4`',
        '- `heading5`',
        '- `heading6`',
        '- `hardBreak`',
        '- `highlight`',
        '- `horizontalRule`',
        '- `inlineFormats`',
        '- `italic`',
        '- `justify`',
        '- `left`',
        '- `link`',
        '- `normalize`',
        '- `orderedList`',
        '- `paragraph`',
        '- `redo`',
        '- `right`',
        '- `strike`',
        '- `subscript`',
        '- `superscript`',
        '- `underline`',
        '- `undo`',
      ],
      default: () => ['bold', 'italic', 'underline'],
    },
    blockFormats: {
      type: '{ className: string; label?: string; tags?: string[] }[]',
      description: [
        'An array of objects that specifies the block formats to display in the toolbar.',
        'Block formats are used to specify CSS classes to be applied to the block element.',
        'They are displayed as a dropdown list in the toolbar.',
        '',
        '@example',
        '```typescript',
        "[{ className: 'p-6 border rounded', label: 'Boxed', tags: ['div'] }]",
        '```',
      ],
      default: () => [],
    },
    inlineFormats: {
      type: '{ className: string; label?: string; }[]',
      description: [
        'An array of objects that specifies the inline formats to display in the toolbar.',
        'Inline formats are used to specify CSS classes to be applied to the inline element.',
        'They are displayed as a dropdown list in the toolbar.',
        '',
        '@example',
        '```typescript',
        "[{ className: 'text-red-500', label: 'Red' }]",
        '```',
      ],
      default: () => [],
    },
    allowFullscreen: {
      type: 'boolean',
      description: ['Specifies whether to allow the editor to enter fullscreen mode.', '', '@default true'],
      default: () => true,
    },
  },
  sanitizers: [(context) => (context.options.required ? context.value : defaultSanitizer(context)), stringSanitizer],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: ({ __, language, options, value }) => {
        if (options.required && (!value || value === '<p></p>')) {
          throw new Error(__(language, 'pruvious-server', 'This field is required'))
        }
      },
    },
    stringValidator,
    {
      onCreate: true,
      onUpdate: true,
      validator: async ({ __, collections, language, query, value }) => {
        const regex = /href="([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?"/g

        let matches: RegExpExecArray | null = null

        while ((matches = regex.exec(value))) {
          const c = collections[matches[1] as CollectionName]

          if (c?.publicPages) {
            const record = await (query as any)(c.name).where('id', matches[2]).exists()

            if (!record) {
              throw new Error(
                __(language, 'pruvious-server', '$item #$id does not exist and cannot be linked', {
                  item: capitalize(c.label.record.singular),
                  id: +matches[2],
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
      if (!isString(value)) {
        return ''
      }

      const { collections } = await import('#pruvious/collections')
      const regex = /href="([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?"/g

      let matches: RegExpExecArray | null = null

      while ((matches = regex.exec(value))) {
        const c = collections[matches[1] as CollectionName]

        if (c?.publicPages) {
          const pathField = (c.publicPages as PublicPagesOptions).pathField ?? 'path'
          const record = await (query as any)(c.name)
            .select({ [pathField]: true, language: true })
            .where('id', matches[2])
            .first()

          if (record) {
            const path = joinRouteParts(
              record.language === primaryLanguage && !prefixPrimaryLanguage ? '' : record.language,
              resolveCollectionPathPrefix(c, record.language, primaryLanguage),
              record[pathField],
            )

            value = value.replaceAll(matches[0], `href="${path + (matches[3] ?? '')}"`)
          }
        }
      }

      return value.replaceAll('_fr--', 'class')
    },
  },
  inputMeta: {
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
