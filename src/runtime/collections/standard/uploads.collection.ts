import type { QueryBuilderInstance } from '../../utility-types'
import { isFile, isUndefined } from '../../utils/common'
import { isNumber } from '../../utils/number'
import { __ } from '../../utils/server/translate-string'
import { slugify } from '../../utils/slugify'
import { isString, isUrlPath, joinRouteParts } from '../../utils/string'
import { imageTypes, parseMediaDirectoryName } from '../../utils/uploads'
import { requiredValidator } from '../../validators/required'
import { lowercaseValidator } from '../../validators/string'
import { defineCollection } from '../collection.definition'

export default defineCollection({
  name: 'uploads',
  mode: 'multi',
  search: {
    default: [
      { field: 'filename', reserve: 64 },
      { field: 'directory', reserve: 256 },
      { field: 'type', reserve: 32 },
      'description',
    ],
  },
  uniqueCompositeIndexes: [['directory', 'filename']],
  dashboard: {
    icon: 'Photo',
    overviewTable: {
      searchLabel: ['filename', 'directory'],
    },
  },
  fields: {
    /*
    |--------------------------------------------------------------------------
    | directory
    |--------------------------------------------------------------------------
    |
    */
    directory: {
      type: 'text',
      options: {
        description: [
          'The directory path.',
          'Use a forward slash (`/`) to separate directory names.',
          "Use an empty string (`''`) to indicate the root directory.",
        ],
      },
      additional: {
        index: true,
        sanitizers: [
          ({ value }) => {
            if (isString(value)) {
              const sanitized = joinRouteParts(value.toLowerCase()).slice(1) + '/'
              return sanitized === '/' ? '' : sanitized
            }

            return value
          },
        ],
        validators: [
          lowercaseValidator,
          ({ __, language, value }) => {
            if (value !== '' && !isUrlPath(value, true)) {
              throw new Error(__(language, 'pruvious-server', 'The directory must be a URL-safe string'))
            }
          },
          {
            onCreate: true,
            onUpdate: true,
            validator: ({ errors, input, language }) => {
              if (isUndefined(input.filename)) {
                errors.filename = __(language, 'pruvious-server', 'This field is required')
              }
            },
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | filename
    |--------------------------------------------------------------------------
    |
    */
    filename: {
      type: 'text',
      options: {
        label: 'Name',
        description: 'The name of the file.',
      },
      additional: {
        index: true,
        sanitizers: [
          {
            onCreate: true,
            sanitizer: async ({ input, name, query, value }) => {
              if (isUndefined(input[name]) && isFile(input.$file)) {
                const filename = slugify(input.$file.name)

                if (
                  filename &&
                  (await query('uploads')
                    .where('directory', isString(input.directory) ? parseMediaDirectoryName(input.directory) : '')
                    .where('filename', filename)
                    .exists())
                ) {
                  const basename = filename.includes('.') ? filename.split('.').slice(0, -1).join('.') : filename
                  const extension = filename.split('.').pop() ?? ''
                  const existing = await query('uploads')
                    .select({ filename: true })
                    .where('directory', isString(input.directory) ? parseMediaDirectoryName(input.directory) : '')
                    .whereLike('filename', `${basename}%`)
                    .all()

                  let i = 1

                  while (
                    existing.some(
                      ({ filename }) => filename === (extension ? `${basename}-${i}.${extension}` : `${basename}-${i}`),
                    )
                  ) {
                    i++
                  }

                  return extension ? `${basename}-${i}.${extension}` : `${basename}-${i}`
                }

                return filename
              }

              return value
            },
          },
          ({ value }) => (isString(value) ? value.toLowerCase() : value),
        ],
        validators: [
          requiredValidator,
          lowercaseValidator,
          ({ __, language, value }) => {
            if (!isUrlPath(value, true)) {
              throw new Error(__(language, 'pruvious-server', 'The filename must be a URL-safe string'))
            } else if (value.endsWith('.')) {
              throw new Error(__(language, 'pruvious-server', 'The filename must not end with a period'))
            }
          },
          {
            onCreate: true,
            onUpdate: true,
            validator: ({ errors, input, language }) => {
              if (isUndefined(input.directory)) {
                errors.directory = __(language, 'pruvious-server', 'This field is required')
              }
            },
          },
          async ({ __, allInputs, currentQuery, input, language, operation, value }) => {
            if (operation === 'read') {
              return
            }

            const query = currentQuery as QueryBuilderInstance<'uploads'>
            const directory = input.directory
            const filename = value
            const uniqueErrorMessage = __(language, 'pruvious-server', 'The file path must be unique')

            if (
              allInputs?.some(
                (_input) => _input !== input && _input.directory === directory && _input.filename === filename,
              )
            ) {
              throw new Error(uniqueErrorMessage)
            }

            if (
              operation === 'create' &&
              (await query.clone().reset().where('directory', directory).where('filename', filename).exists())
            ) {
              throw new Error(uniqueErrorMessage)
            }

            if (operation === 'update') {
              const subjects = await query
                .clone()
                .clearGroup()
                .clearOffset()
                .clearLimit()
                .select({ id: true, filename: true })
                .all()

              if (subjects.length > 1) {
                throw new Error(uniqueErrorMessage)
              } else if (subjects.length === 1) {
                const prevExtension = subjects[0].filename.split('.').pop() ?? ''
                const currentExtension = filename.split('.').pop() ?? ''

                if (prevExtension !== currentExtension) {
                  throw new Error(__(language, 'pruvious-server', 'The file extension cannot be changed'))
                }

                if (
                  await query
                    .clone()
                    .reset()
                    .where('directory', directory)
                    .where('filename', filename)
                    .whereNe('id', subjects[0].id)
                    .exists()
                ) {
                  throw new Error(uniqueErrorMessage)
                }
              }
            }
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | type
    |--------------------------------------------------------------------------
    |
    */
    type: {
      type: 'text',
      options: {
        description: 'The MIME type of the file.',
      },
      additional: {
        index: true,
        immutable: true,
        sanitizers: [
          {
            onCreate: true,
            sanitizer: ({ input }) =>
              isFile(input.$file) && isString(input.$file.type) ? input.$file.type.toLowerCase() : '',
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | size
    |--------------------------------------------------------------------------
    |
    */
    size: {
      type: 'number',
      options: {
        description: 'The file size in bytes.',
      },
      additional: {
        index: true,
        immutable: true,
        sanitizers: [
          {
            onCreate: true,
            sanitizer: ({ input }) => (isFile(input.$file) && isNumber(input.$file.size) ? input.$file.size : 0),
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | width
    |--------------------------------------------------------------------------
    |
    */
    width: {
      type: 'number',
      options: {
        description: 'The image width in pixels. This field is only applicable to images.',
      },
      additional: {
        immutable: true,
        sanitizers: [
          {
            onCreate: true,
            sanitizer: async ({ input }) => {
              if (isFile(input.$file) && imageTypes.includes(input.$file.type.toLowerCase())) {
                try {
                  const sharp = ((await import('sharp')) as any).default
                  const metadata = await sharp(await input.$file.arrayBuffer()).metadata()
                  return metadata.width ?? 0
                } catch {}
              }

              return 0
            },
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | height
    |--------------------------------------------------------------------------
    |
    */
    height: {
      type: 'number',
      options: {
        description: 'The image height in pixels. This field is only applicable to images.',
      },
      additional: {
        immutable: true,
        sanitizers: [
          {
            onCreate: true,
            sanitizer: async ({ input }) => {
              if (isFile(input.$file) && imageTypes.includes(input.$file.type.toLowerCase())) {
                try {
                  const sharp = ((await import('sharp')) as any).default
                  const metadata = await sharp(await input.$file.arrayBuffer()).metadata()
                  return metadata.height ?? 0
                } catch {}
              }

              return 0
            },
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | description
    |--------------------------------------------------------------------------
    |
    */
    description: {
      type: 'text',
      options: {
        description: [
          'A brief description of the file.',
          'The description is used as the default **alt** attribute for images.',
        ],
        spellcheck: true,
      },
    },
  },
})
