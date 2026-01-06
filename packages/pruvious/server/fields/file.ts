import {
  defineField,
  limitPopulation,
  mediaCategories,
  type CombinedFieldOptions,
  type DynamicCollectionFieldTypes,
  type GenericDatabase,
  type MediaCategory,
  type ResolveFieldUIOptions,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import {
  bigIntFieldModel,
  type BigIntFieldModelOptions,
  type ConditionalLogic,
  type Field,
  type FieldModel,
  type ForeignKey,
  type GenericField,
} from '@pruvious/orm'
import { formatBytes, isNull, parseBytes, toArray, type DefaultFalse, type NonEmptyArray } from '@pruvious/utils'
import type { PropType } from 'vue'

interface CustomOptions<
  TFields extends keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'],
  TPopulate extends boolean | undefined,
> {
  /**
   * Fields to return from the `Uploads` collection when populating this field.
   *
   * @default
   * ['id', 'path', 'mime', 'size', 'description']
   */
  fields?: NonEmptyArray<TFields & string>

  /**
   * Controls whether to populate the selected `fields` from the `Uploads` collection.
   *
   * @default true
   */
  populate?: TPopulate

  /**
   * Specifies which file types are allowed.
   *
   * You can provide:
   *
   * - A single string or an array of strings with:
   *   - Specific MIME types (e.g., `['image/png', 'image/jpeg']`)
   *   - Media category shorthands (e.g., `['image', 'video']`)
   * - The wildcard `'*'` to allow all file types (default)
   *
   * ---
   *
   * List of media categories:
   *
   * ```ts
   * {
   *   'document': [
   *     // PDF
   *     'application/pdf',
   *     'application/x-pdf',
   *     'application/acrobat',
   *
   *     // Microsoft Office - Legacy
   *     'application/msword',
   *     'application/vnd.ms-excel',
   *     'application/vnd.ms-powerpoint',
   *
   *     // Microsoft Office - Modern
   *     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   *     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   *     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
   *     'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
   *     'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
   *     'application/vnd.openxmlformats-officedocument.presentationml.template',
   *
   *     // OpenOffice/LibreOffice
   *     'application/vnd.oasis.opendocument.text',
   *     'application/vnd.oasis.opendocument.spreadsheet',
   *     'application/vnd.oasis.opendocument.presentation',
   *     'application/vnd.oasis.opendocument.graphics',
   *     'application/vnd.oasis.opendocument.chart',
   *
   *     // Rich Text
   *     'application/rtf',
   *     'application/x-rtf',
   *     'text/richtext',
   *   ],
   *
   *   'image': [
   *     // Common web formats
   *     'image/jpeg',
   *     'image/pjpeg',
   *     'image/png',
   *     'image/gif',
   *     'image/webp',
   *     'image/svg+xml',
   *     'image/avif',
   *     'image/heif',
   *     'image/heic',
   *     'image/jxl', // JPEG XL
   *     'image/vnd.mozilla.apng', // Animated PNG
   *
   *     // Icon formats
   *     'image/x-icon',
   *     'image/vnd.microsoft.icon',
   *
   *     // Professional formats
   *     'image/tiff',
   *     'image/x-tiff',
   *     'image/bmp',
   *     'image/x-windows-bmp',
   *     'image/jp2', // JPEG 2000
   *     'image/jpx',
   *     'image/jpm',
   *     'image/jxs', // JPEG XS
   *     'image/x-xcf', // GIMP
   *
   *     // Raw camera formats
   *     'image/x-canon-cr2',
   *     'image/x-canon-cr3',
   *     'image/x-nikon-nef',
   *     'image/x-sony-arw',
   *     'image/x-adobe-dng',
   *     'image/x-olympus-orf',
   *     'image/x-fuji-raf',
   *     'image/x-panasonic-rw2',
   *     'image/x-pentax-pef',
   *     'image/x-samsung-srw',
   *     'image/x-sigma-x3f',
   *     'image/x-hasselblad-3fr',
   *     'image/x-phaseone-iiq',
   *
   *     // HDR formats
   *     'image/vnd.radiance',
   *     'image/x-exr',
   *     'image/x-hdr',
   *
   *     // Design formats
   *     'image/vnd.adobe.photoshop',
   *     'application/x-photoshop',
   *     'image/x-photoshop',
   *     'application/photoshop',
   *     'application/psd',
   *     'image/psd',
   *     'application/illustrator',
   *     'application/postscript',
   *
   *     // Scientific/Medical formats
   *     'image/x-dicom',
   *     'image/fits',
   *
   *     // Texture formats
   *     'image/ktx',
   *     'image/ktx2',
   *     'image/vnd.dds',
   *     'image/x-dds',
   *
   *     // Specialized web formats
   *     'image/jxr', // JPEG XR
   *     'image/x-icns', // Apple Icon format
   *     'image/x-tga',
   *     'image/vnd.dwg',
   *     'image/x-portable-pixmap',
   *     'image/x-portable-graymap',
   *     'image/x-portable-bitmap',
   *     'image/x-portable-anymap',
   *   ],
   *
   *   'audio': [
   *     // Common formats
   *     'audio/mpeg',
   *     'audio/mp3',
   *     'audio/mp4',
   *     'audio/aac',
   *     'audio/aacp',
   *     'audio/ogg',
   *     'audio/wav',
   *     'audio/wave',
   *     'audio/x-wav',
   *     'audio/x-pn-wav',
   *     'audio/webm',
   *     'audio/flac',
   *
   *     // Professional formats
   *     'audio/aiff',
   *     'audio/x-aiff',
   *     'audio/basic',
   *     'audio/midi',
   *     'audio/x-midi',
   *     'audio/mpegurl',
   *     'audio/x-mpegurl',
   *     'audio/x-ms-wma',
   *     'audio/x-ms-wax',
   *
   *     // Streaming formats
   *     'audio/vnd.wav',
   *     'audio/x-m4a',
   *     'audio/mp4a-latm',
   *     'audio/x-matroska',
   *   ],
   *
   *   'video': [
   *     // Common formats
   *     'video/mp4',
   *     'video/mpeg',
   *     'video/ogg',
   *     'video/webm',
   *     'video/3gpp',
   *     'video/3gpp2',
   *     'video/x-msvideo',
   *     'video/x-ms-wmv',
   *     'video/x-flv',
   *
   *     // Professional formats
   *     'video/quicktime',
   *     'video/x-quicktime',
   *     'video/x-m4v',
   *     'video/x-matroska',
   *     'video/x-ms-asf',
   *     'video/x-ms-wmx',
   *     'video/x-ms-wvx',
   *
   *     // Streaming formats
   *     'application/x-mpegURL',
   *     'video/MP2T',
   *     'application/vnd.apple.mpegurl',
   *     'application/vnd.rn-realmedia',
   *     'application/vnd.rn-realmedia-vbr',
   *   ],
   *
   *   'archive': [
   *     // Common formats
   *     'application/zip',
   *     'application/x-zip-compressed',
   *     'application/x-rar-compressed',
   *     'application/x-7z-compressed',
   *     'application/gzip',
   *     'application/x-gzip',
   *     'application/x-tar',
   *     'application/x-bzip',
   *     'application/x-bzip2',
   *
   *     // Disk images
   *     'application/x-iso9660-image',
   *     'application/x-apple-diskimage',
   *
   *     // Other archives
   *     'application/vnd.rar',
   *     'application/x-stuffit',
   *     'application/x-ace-compressed',
   *     'application/x-archive',
   *     'application/x-cpio',
   *     'application/x-shar',
   *     'application/x-lzh-compressed',
   *     'application/x-lzip',
   *     'application/x-lzma',
   *     'application/x-xz',
   *     'application/x-compress',
   *     'application/x-compressed',
   *   ],
   *
   *   'code': [
   *     // Web
   *     'text/html',
   *     'application/xhtml+xml',
   *     'text/css',
   *     'text/javascript',
   *     'application/javascript',
   *     'application/x-javascript',
   *     'application/ecmascript',
   *     'application/x-httpd-php',
   *     'application/x-php',
   *     'application/php',
   *
   *     // Programming languages
   *     'text/x-python',
   *     'text/x-java-source',
   *     'text/x-c',
   *     'text/x-c++',
   *     'text/x-csharp',
   *     'text/x-ruby',
   *     'text/x-perl',
   *     'text/x-go',
   *     'text/x-rust',
   *     'text/x-swift',
   *   ],
   *
   *   'font': [
   *     // Modern web fonts
   *     'font/woff',
   *     'font/woff2',
   *     'font/ttf',
   *     'font/otf',
   *     'font/collection',
   *
   *     // Legacy font types
   *     'application/x-font-ttf',
   *     'application/x-font-otf',
   *     'application/x-font-woff',
   *     'application/font-woff',
   *     'application/font-woff2',
   *     'application/vnd.ms-fontobject',
   *     'application/font-sfnt',
   *     'application/x-font-opentype',
   *     'application/x-font-truetype',
   *   ],
   *
   *   '3d': [
   *     // Common 3D formats
   *     'model/3mf',
   *     'model/stl',
   *     'application/sla',
   *     'model/obj',
   *     'model/gltf-binary',
   *     'model/gltf+json',
   *     'model/vnd.collada+xml',
   *
   *     // CAD formats
   *     'application/x-3ds',
   *     'application/x-blend',
   *     'application/x-sketchup',
   *     'application/acad',
   *     'application/x-dwg',
   *     'application/x-dxf',
   *     'application/vnd.autodesk.inventor.part',
   *   ],
   *
   *   'data': [
   *     // Structured data
   *     'application/json',
   *     'application/ld+json',
   *     'application/xml',
   *     'text/xml',
   *     'text/csv',
   *     'text/tab-separated-values',
   *     'application/x-yaml',
   *     'text/yaml',
   *
   *     // Database files
   *     'application/sql',
   *     'application/x-sql',
   *     'application/vnd.sqlite3',
   *     'application/x-sqlite3',
   *     'application/x-mysql-dump',
   *     'application/x-postgresql-dump',
   *     'application/graphql',
   *     'application/x-mongodb',
   *     'application/vnd.apache.parquet',
   *     'application/x-avro-binary',
   *     'application/vnd.ms-access',
   *     'application/x-msaccess',
   *     'application/vnd.oracle',
   *     'application/x-dbase',
   *   ],
   *
   *   'system': [
   *     // Configuration
   *     'application/x-conf',
   *     'application/x-ini',
   *     'application/toml',
   *
   *     // System files
   *     'application/x-executable',
   *     'application/x-sharedlib',
   *     'application/x-shellscript',
   *     'application/batch-file',
   *     'application/x-ms-dos-executable',
   *     'application/x-msdownload',
   *
   *     // Certificate/Key files
   *     'application/x-x509-ca-cert',
   *     'application/x-pkcs12',
   *     'application/pgp-keys',
   *     'application/x-pem-file',
   *
   *     // Logs
   *     'application/x-log',
   *     'text/x-log',
   *   ],
   *
   *   'text': [
   *     // Plain text formats
   *     'text/plain',
   *     'text/markdown',
   *     'text/calendar',
   *   ],
   * }
   * ```
   *
   * @default '*'
   *
   * @example
   * ```ts
   * // Allow only image types
   * allowedTypes: 'image'
   *
   * // Allow only PNG and JPEG images
   * allowedTypes: ['image/png', 'image/jpeg']
   *
   * // Allow images and PDFs
   * allowedTypes: ['image', 'application/pdf']
   *
   * // Allow all file types
   * allowedTypes: '*'
   * ```
   */
  allowedTypes?:
    | (typeof mediaCategories)[MediaCategory][number]
    | MediaCategory
    | (string & {})
    | ((typeof mediaCategories)[MediaCategory][number] | MediaCategory | (string & {}))[]
    | '*'

  /**
   * Minimum allowed file size.
   * You can provide a number (in bytes) or a human-readable string (e.g. '1 KB', '5 MB', '2 GB').
   * By default, no minimum size is enforced (`0`).
   *
   * @default 0
   *
   * @example
   * ```ts
   * // 1 KB
   * minSize: 1024
   *
   * // 5 MB
   * minSize: '5 MB'
   * ```
   */
  minSize?: number | string

  /**
   * Maximum allowed file size.
   * You can provide a number (in bytes) or a human-readable string (e.g. '1 KB', '5 MB', '2 GB').
   * By default, there is no size limit (`0`).
   *
   * @default 0
   *
   * @example
   * ```ts
   * // 1 MB
   * maxSize: 1048576
   *
   * // 5 MB
   * maxSize: '5 MB'
   *
   * // No limit
   * maxSize: 0
   * ```
   */
  maxSize?: number | string

  ui?: {
    /**
     * Text for the select button that opens the media library.
     *
     * You can either provide a string or a function that returns a string.
     * The function receives an object with `_` and `__` properties to access the translation functions.
     *
     * Important: When using a function, only use simple anonymous functions without context binding,
     * since the option needs to be serialized for client-side use.
     *
     * @example
     * ```ts
     * // String (non-translatable)
     * label: 'Select document'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Select document')
     * ```
     *
     * @default
     * ({ __ }) => __('pruvious-dashboard', 'Select file')
     */
    selectLabel?: string | ((context: TranslatableStringCallbackContext) => string)
  }

  /**
   * Controls whether a foreign key constraint is automatically created when this field is used at the top level of a collection.
   * The constraint references the `id` field in the `Uploads` collection.
   *
   * When set to `false`, you can define foreign key constraints manually using the `foreignKeys` option at the collection level.
   *
   * @default true
   */
  foreignKey?: boolean
}

const customOptions: CustomOptions<keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'], boolean> = {
  fields: ['id', 'path', 'mime', 'size', 'description'],
  populate: true,
  allowedTypes: '*',
  minSize: 0,
  maxSize: 0,
  ui: {
    selectLabel: ({ __ }) => __('pruvious-dashboard', 'Select file'),
  },
  foreignKey: true,
}

export default {
  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for server-side use in collection definitions.
   * For client-side usage, import the equivalent function from `#pruvious/app`.
   */
  serverFn: function <
    const TRequired extends boolean | undefined,
    const TImmutable extends boolean | undefined,
    const TAutoGenerated extends boolean | undefined,
    TConditionalLogic extends ConditionalLogic | undefined,
    TFields extends keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'],
    TPopulate extends boolean | undefined,
    TPopulatedType = Pick<
      DynamicCollectionFieldTypes[DefaultFalse<TPopulate> extends true ? 'Populated' : 'Casted']['Uploads'],
      TFields
    > | null,
  >(
    options: Omit<
      CombinedFieldOptions<
        FieldModel<
          BigIntFieldModelOptions<number, TPopulatedType>,
          'bigint',
          number,
          TPopulatedType,
          number | string,
          undefined,
          undefined
        >,
        BigIntFieldModelOptions<number, TPopulatedType> &
          CustomOptions<TFields, TPopulate> &
          ResolveFieldUIOptions<undefined>,
        true,
        TRequired,
        TImmutable,
        TAutoGenerated,
        TConditionalLogic,
        GenericDatabase
      >,
      'min' | 'max'
    >,
  ): Field<
    FieldModel<
      BigIntFieldModelOptions<number, TPopulatedType>,
      'bigint',
      number,
      TPopulatedType,
      number | string,
      undefined,
      undefined
    >,
    BigIntFieldModelOptions<number, TPopulatedType> &
      CustomOptions<TFields, TPopulate> &
      ResolveFieldUIOptions<undefined>,
    true,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    GenericDatabase
  > {
    const bound = defineField({
      model: bigIntFieldModel<number, TPopulatedType>(),
      nullable: true,
      default: null,
      customOptions: { ...customOptions, min: 1 },
      validators: [
        async (value, { context }) => {
          if (!isNull(value)) {
            const query = await context.database
              .queryBuilder()
              .selectFrom('Uploads')
              .select(['mime', 'size'])
              .where('id', '=', value)
              .useCache(context.cache)
              .first()

            if (!query.success) {
              throw new Error(
                context.__('pruvious-api', `Failed to verify existence of ID \`$id\` in collection \`$collection\``, {
                  id: value,
                  collection: 'Uploads',
                }),
              )
            } else if (!query.data) {
              throw new Error(context.__('pruvious-api', 'Record does not exist'))
            }
          }
        },
        async (value, { definition, context }) => {
          if (!isNull(value)) {
            const allowedMimes = toArray(definition.options.allowedTypes)
              .map((v) =>
                v === '*' || v.includes('/')
                  ? v
                  : mediaCategories[v as MediaCategory]
                    ? mediaCategories[v as MediaCategory]
                    : v,
              )
              .flat()

            if (allowedMimes.includes('*')) {
              return
            }

            const query = await context.database
              .queryBuilder()
              .selectFrom('Uploads')
              .select(['mime', 'size'])
              .where('id', '=', value)
              .useCache(context.cache)
              .first()

            if (query.success && query.data && !allowedMimes.includes(query.data.mime)) {
              throw new Error(context.__('pruvious-api', 'This file type is not allowed'))
            }
          }
        },
        async (value, { definition, context }) => {
          if (!isNull(value)) {
            const minBytes = parseBytes(definition.options.minSize)
            const maxBytes = parseBytes(definition.options.maxSize)

            if (minBytes > 0 || maxBytes > 0) {
              const query = await context.database
                .queryBuilder()
                .selectFrom('Uploads')
                .select(['mime', 'size'])
                .where('id', '=', value)
                .useCache(context.cache)
                .first()

              if (query.success && query.data) {
                if (minBytes > 0 && query.data.size < minBytes) {
                  throw new Error(
                    context.__('pruvious-api', 'The file is smaller than the minimum allowed size of $size', {
                      size: formatBytes(minBytes)!,
                    }),
                  )
                } else if (maxBytes > 0 && query.data.size > maxBytes) {
                  throw new Error(
                    context.__('pruvious-api', 'The file exceeds the maximum allowed size of $size', {
                      size: formatBytes(maxBytes)!,
                    }),
                  )
                }
              }
            }
          }
        },
      ],
      populator: async (value, contextField) => {
        if (isNull(value)) {
          return null
        }

        const { definition, context } = contextField
        const deepPopulate = definition.options.populate

        if (deepPopulate) {
          limitPopulation(value, contextField)
        }

        const queryBuilder = context.database
          .queryBuilder()
          .selectFrom('Uploads')
          .where('id', '=', value)
          .select(definition.options.fields)
          .useCache(context.cache)

        if (deepPopulate) {
          queryBuilder.populate()
        }

        const query = await queryBuilder.first()

        return (query.success ? query.data : null) as any
      },
      omitOptions: ['min', 'max'],
      populatedTypeFn: ({ field }) =>
        `Pick<DynamicCollectionFieldTypes[${field.options.populate ? "'Populated'" : "'Casted'"}]['Uploads'], ${(field.options.fields ?? ['id']).map((fieldName: string) => `'${fieldName}'`).join(' | ')}> | null`,
    }).serverFn.bind(this)
    return bound({
      ...(options as any),
      _foreignKey:
        options.foreignKey !== false
          ? ({
              referencedCollection: 'Uploads',
              referencedField: 'id',
              action: ['ON UPDATE RESTRICT', 'ON DELETE SET NULL'],
            } satisfies Omit<ForeignKey<Record<string, GenericField>>, 'field'>)
          : undefined,
    }) as any
  },

  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for client-side use in Vue components.
   * For server-side usage, import the equivalent function from `#pruvious/server`.
   */
  clientFn: function <
    const TRequired extends boolean | undefined,
    const TImmutable extends boolean | undefined,
    const TAutoGenerated extends boolean | undefined,
    TConditionalLogic extends ConditionalLogic | undefined,
    TFields extends keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'],
    TPopulate extends boolean | undefined,
    TPopulatedType = Pick<
      DynamicCollectionFieldTypes[DefaultFalse<TPopulate> extends true ? 'Populated' : 'Casted']['Uploads'],
      TFields
    > | null,
  >(
    options: Omit<
      CombinedFieldOptions<
        FieldModel<
          BigIntFieldModelOptions<number, TPopulatedType>,
          'bigint',
          number,
          TPopulatedType,
          number | string,
          undefined,
          undefined
        >,
        BigIntFieldModelOptions<number, TPopulatedType> &
          CustomOptions<TFields, TPopulate> &
          ResolveFieldUIOptions<undefined>,
        true,
        TRequired,
        TImmutable,
        TAutoGenerated,
        TConditionalLogic,
        GenericDatabase
      >,
      'min' | 'max'
    >,
  ): { type: PropType<TPopulatedType>; required: true } & {
    field: Field<
      FieldModel<
        BigIntFieldModelOptions<number, TPopulatedType>,
        'bigint',
        number,
        TPopulatedType,
        number | string,
        undefined,
        undefined
      >,
      BigIntFieldModelOptions<number, TPopulatedType> &
        CustomOptions<TFields, TPopulate> &
        ResolveFieldUIOptions<undefined>,
      true,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >
  } {
    return null as any
  },

  /**
   * Represents the type structure for this field's configuration options.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  TOptions: undefined as unknown as Omit<
    CombinedFieldOptions<
      FieldModel<
        BigIntFieldModelOptions<number, Record<string, any>>,
        'bigint',
        number,
        Record<string, any>,
        number | string,
        undefined,
        undefined
      >,
      BigIntFieldModelOptions<number, Record<string, any>> &
        CustomOptions<any, boolean | undefined> &
        ResolveFieldUIOptions<undefined>,
      true,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      GenericDatabase
    >,
    'min' | 'max'
  >,
}
