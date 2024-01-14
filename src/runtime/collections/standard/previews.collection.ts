import type { CollectionName } from '#pruvious'
import { nanoid } from 'nanoid'
import { uniqueValidator } from '../../validators/unique'
import { defineCollection } from '../collection.definition'

export default defineCollection({
  name: 'previews',
  mode: 'multi',
  dashboard: { visible: false },
  clearCacheRules: false,
  fields: {
    token: {
      type: 'text',
      options: {
        label: 'Preview token',
        required: true,
      },
      additional: {
        unique: 'allLanguages',
        immutable: true,
        sanitizers: [{ onCreate: true, sanitizer: () => nanoid() }],
        validators: [
          ({ __, language, value }) => {
            if (!/^[a-z0-9_-]+$/i.test(value)) {
              throw new Error(__(language, 'pruvious-server', 'The preview token must be a URL-safe string'))
            }
          },
          (context) =>
            uniqueValidator(
              context,
              context.__(context.language, 'pruvious-server', 'A preview with this token already exists'),
            ),
        ],
      },
    },
    collection: {
      type: 'text',
      options: {
        label: 'Collection',
        description: 'The name of the previewed collection.',
        required: true,
      },
      additional: {
        validators: [
          ({ __, collections, language, value }) => {
            if (value === 'presets') {
              return
            } else if (!(collections as any)[value]) {
              throw new Error(__(language, 'pruvious-server', 'Invalid collection'))
            } else if (
              collections[value as CollectionName].mode !== 'multi' ||
              !collections[value as CollectionName].publicPages
            ) {
              throw new Error(__(language, 'pruvious-server', 'This collection cannot be previewed'))
            }
          },
        ],
      },
    },
    data: {
      type: 'text',
      options: {
        label: 'Data',
        description: 'The stringified JSON data used to render the page preview.',
        required: true,
      },
      additional: {
        validators: [
          ({ __, language, value }) => {
            try {
              JSON.parse(value)
            } catch {
              throw new Error(__(language, 'pruvious-server', 'Invalid JSON'))
            }
          },
        ],
      },
    },
  },
})
