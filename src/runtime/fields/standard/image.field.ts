import type { OptimizedImageSource } from '../../collections/images'
import { defaultSanitizer } from '../../sanitizers/default'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isDefined, isNull } from '../../utils/common'
import { isPositiveInteger } from '../../utils/number'
import { isObject } from '../../utils/object'
import { isString, joinRouteParts, titleCase } from '../../utils/string'
import { imageTypes } from '../../utils/uploads'
import { requiredValidator } from '../../validators/required'
import { defineField } from '../field.definition'

export default defineField({
  name: 'image',
  type: { js: 'object', ts: '{ uploadId: number, alt: string } | null' },
  default: ({ options }) => options.default ?? null,
  vueComponent: undefined as any,
  options: {
    required: {
      type: 'boolean',
      description: ['Specifies whether the field input is required during creation.', '', '@default false'],
      default: () => false,
    },
    label: {
      type: 'string',
      description: [
        'The field label displayed in the UI.',
        '',
        'By default, it is automatically generated based on the property name assigned to the field.',
        "Example: 'productImage' => 'Product image'",
      ],
      default: ({ name }) => titleCase(name, false),
    },
    default: {
      type: '{ uploadId: number, alt: string } | null',
      description: ['The default field value.', '', '@default null'],
    },
    transformSvgs: {
      type: 'boolean',
      description: [
        'Specifies whether to transform SVG images.',
        'If `false`, the `sources` option is disregarded.',
        '',
        '@default false',
      ],
      default: () => false,
    },
    sources: {
      type: 'ImageSource[]',
      description: [
        'An array of optimized image sources.',
        'When this field is populated, the resulting object will include a `sources` property.',
        'This property is an array of objects, each with the following properties:',
        '',
        '- `srcset` - The URL or absolute path of the image source.',
        '- `width` - The width of the image source in pixels.',
        '- `height` - The height of the image source in pixels.',
        '- `type` - The MIME type of the image source.',
        '- `media` - The media query of the image source or `null` if not specified.',
        '',
        '@default []',
        '',
        '@example',
        '```typescript',
        '[',
        "  { media: '(max-width: 768px)', format: 'webp', width: 1024, height: 1024, resize: 'cover' },",
        "  { media: '(max-width: 768px)', format: 'jpeg', width: 1024, height: 1024, resize: 'cover' },",
        "  { format: 'webp', width: 1600, height: 1600, resize: 'cover' },",
        "  { format: 'jpeg', width: 1600, height: 1600, resize: 'cover' },",
        ']',
        '```',
      ],
      default: () => [],
    },
    allowedTypes: {
      type: 'string[]',
      description: [
        'An array of allowed image types or extensions.',
        '',
        '@default [',
        "  'image/jpeg',",
        "  'image/png',",
        "  'image/svg+xml',",
        "  'image/webp',",
        "  'image/gif',",
        "  'image/apng',",
        "  'image/avif',",
        "  'image/bmp',",
        "  'image/heic',",
        "  'image/tiff',",
        "  'image/x-icon',",
        ']',
        '',
        '@example',
        '```typescript',
        "['image/jpeg', '.png', 'SVG']",
        '```',
      ],
      default: () => imageTypes,
    },
    minWidth: {
      type: 'number',
      description: ['The minimum allowed image width in pixels.', '', '@default 0'],
      default: () => 0,
    },
    minHeight: {
      type: 'number',
      description: ['The minimum allowed image height in pixels.', '', '@default 0'],
      default: () => 0,
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
  },
  population: {
    type: {
      js: 'object',
      ts: 'Image | null',
    },
    populator: async ({ options, query, value }) => {
      if (value) {
        const upload = await query('uploads')
          .where('id', value.uploadId)
          .setFieldValueType(options.populate ? 'populated' : 'casted')
          .first()

        if (upload) {
          const { getModuleOption } = await import('../../instances/state')
          const uploadsOptions = getModuleOption('uploads')
          const sources: OptimizedImageSource[] = []

          if (options.sources.length && (options.transformSvgs || upload.type !== 'image/svg+xml')) {
            for (const source of options.sources) {
              const { getOptimizedImage } = await import('../../collections/images')
              const optimizedImage = await getOptimizedImage(upload, source)

              if (optimizedImage.success) {
                sources.push({
                  srcset: optimizedImage.src,
                  width: optimizedImage.width,
                  height: optimizedImage.height,
                  media: source.media ?? null,
                  type: source.format === 'jpeg' ? 'image/jpeg' : `image/${source.format}`,
                })
              }
            }
          }

          return {
            src:
              uploadsOptions.drive.type === 'local'
                ? joinRouteParts(
                    getModuleOption('baseUrl'),
                    uploadsOptions.drive.urlPrefix ?? 'uploads',
                    upload.directory,
                    upload.filename,
                  )
                : uploadsOptions.drive.baseUrl + upload.directory + upload.filename,
            alt: value.alt || upload.description,
            width: upload.width,
            height: upload.height,
            type: upload.type,
            sources,
          }
        }
      }

      return null
    },
  },
  sanitizers: [
    (context) => (context.options.required ? context.value : defaultSanitizer(context)),
    ({ value }) => {
      const sanitized = numericSanitizer({ value })
      return isPositiveInteger(sanitized) ? { uploadId: sanitized, alt: '' } : value
    },
  ],
  validators: [
    {
      onCreate: true,
      onUpdate: true,
      validator: (context) => context.options.required && requiredValidator(context),
    },
    ({ __, language, value }) => {
      if (
        !isNull(value) &&
        (!isObject<{ uploadId: number; alt: string }>(value) ||
          Object.keys(value).length !== 2 ||
          !isPositiveInteger(value.uploadId) ||
          !isString(value.alt))
      ) {
        throw new Error(__(language, 'pruvious-server', 'Invalid input type'))
      }
    },
    async ({ __, language, collections, options, value, query }) => {
      if (value) {
        const upload = await query('uploads').where('id', value.uploadId).first()

        if (!upload) {
          throw new Error(
            __(language, 'pruvious-server', 'The $item does not exist', {
              item: __(language, 'pruvious-server', collections['uploads'].label.collection.singular as any),
            }),
          )
        }

        if (isDefined(options.allowedTypes)) {
          const extension = upload.filename.split('.').pop() ?? ''
          const allowedTypes = (options.allowedTypes as string[]).map((type) => type.toLowerCase())

          if (
            !allowedTypes.some((type) =>
              type.includes('/') ? type === upload.type : type.replace(/^\./, '') === extension,
            )
          ) {
            throw new Error(
              __(language, 'pruvious-server', 'The image type must be one of the following: $types', {
                types: allowedTypes
                  .map((type) => (type.startsWith('.') ? type.slice(1) : type))
                  .sort()
                  .join(', '),
              }),
            )
          }
        }

        if (upload.type !== 'image/svg+xml' && isDefined(options.minWidth)) {
          if (upload.width < options.minWidth) {
            throw new Error(
              __(language, 'pruvious-server', 'The minimum allowed image width is $min pixels', {
                min: options.minWidth,
              }),
            )
          }
        }

        if (upload.type !== 'image/svg+xml' && isDefined(options.minHeight)) {
          if (upload.height < options.minHeight) {
            throw new Error(
              __(language, 'pruvious-server', 'The minimum allowed image height is $min pixels', {
                min: options.minHeight,
              }),
            )
          }
        }
      }
    },
  ],
  inputMeta: {
    type: '{ uploadId: number, alt: string } | number | null',
    required: ({ options }) => !!options.required,
    codeComment: ({ options }) => options.description || '',
  },
})
