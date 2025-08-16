import type { Collections, Jobs } from '#pruvious/server'
import type {
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  InsertInput,
  QueryBuilderResult,
  UpdateInput,
} from '@pruvious/orm'
import { tryNormalizePath, type UploadedPart } from '@pruvious/storage'
import {
  isArray,
  isDefined,
  isEmpty,
  isNumber,
  isString,
  isUndefined,
  pick,
  randomString,
  sleep,
  toArray,
  withoutTrailingSlash,
  type NonEmptyArray,
} from '@pruvious/utils'
import { extname } from 'pathe'
import { isWorkerd } from 'std-env'
import { assertUserPermissions, httpStatusCodeMessages } from '../api/utils.server'
import { stringifyImageTransformOptions, type ImageTransformOptions } from './images'

/**
 * Type representing the media categories for the `Uploads` collection.
 */
export type MediaCategory =
  | 'documents'
  | 'images'
  | 'audio'
  | 'video'
  | 'archives'
  | 'code'
  | 'fonts'
  | '3d'
  | 'data'
  | 'system'
  | 'text'
  | 'other'

interface GuardedUploadOptions {
  /**
   * Controls whether user permissions are checked before creating the upload.
   *
   * @default true
   */
  guarded?: boolean
}

interface ReturnableUploadOptions<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> extends GuardedUploadOptions {
  /**
   * An array of fields to return in the result data.
   *
   * @default ['id']
   */
  returning?: NonEmptyArray<TReturningFields> | TReturningFields

  /**
   * Controls whether the result data contains populated field values.
   *
   * @default false
   */
  populate?: TPopulateFields
}

export interface PutUploadOptions<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> extends ReturnableUploadOptions<TReturningFields, TPopulateFields> {}

export interface MoveUploadOptions<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> extends ReturnableUploadOptions<TReturningFields, TPopulateFields> {
  /**
   * Controls whether to overwrite an existing file with the same path.
   *
   * @default false
   */
  overwrite?: boolean
}

export interface UpdateUploadOptions<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> extends ReturnableUploadOptions<TReturningFields, TPopulateFields> {
  /**
   * Controls whether to update all nested files and directories with the same input.
   * This option is only applicable when the upload is a directory.
   *
   * @default false
   */
  recursive?: boolean
}

export interface DeleteUploadOptions<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> extends ReturnableUploadOptions<TReturningFields, TPopulateFields> {
  /**
   * Controls whether to delete all nested files and directories.
   * This option is only applicable when the upload is a directory.
   *
   * @default true
   */
  recursive?: boolean
}

export type CreateMultipartUploadOptions = GuardedUploadOptions

export type GetMultipartUploadOptions = GuardedUploadOptions

export type ResumeMultipartUploadOptions = GuardedUploadOptions

export interface CompleteMultipartUploadOptions<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> extends ReturnableUploadOptions<TReturningFields, TPopulateFields> {}

export type AbortMultipartUploadOptions = GuardedUploadOptions

type UploadResult<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> = QueryBuilderResult<
  TPopulateFields extends true
    ? Pick<ExtractPopulatedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>
    : Pick<ExtractCastedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>,
  Record<string, string>
>

export type PutUploadResult<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> = UploadResult<TReturningFields, TPopulateFields> & {
  /**
   * The details of the upload being created.
   */
  details: {
    /**
     * The ID of the upload being created.
     * It is `undefined` when the upload is not created yet.
     */
    id?: number

    /**
     * The path of the upload being created.
     */
    path: string

    /**
     * The type of the the upload being created.
     */
    type: 'file' | 'directory'
  }
}

export type MoveUploadResult<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> = UploadResult<TReturningFields, TPopulateFields> & {
  /**
   * The details of the upload being moved.
   */
  details: {
    /**
     * The ID of the upload being moved.
     */
    id?: number

    /**
     * The path of the upload being moved.
     */
    path?: string

    /**
     * The new path of the upload being moved.
     */
    newPath: string

    /**
     * The type of the the upload being moved.
     */
    type?: 'file' | 'directory'
  }
}

export type DeleteUploadResult<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> = UploadResult<TReturningFields, TPopulateFields> & {
  /**
   * The details of the upload being deleted.
   */
  details: {
    /**
     * The ID of the upload being deleted.
     */
    id?: number

    /**
     * The path of the upload being deleted.
     */
    path?: string

    /**
     * The type of the the upload being deleted.
     */
    type?: 'file' | 'directory'
  }
}

export type CreateMultipartUploadResult =
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: true

      /**
       * The key for the multipart upload operation.
       * This key must be included in all subsequent requests related to this multipart upload.
       */
      key: string

      /**
       * The resolved path of the multipart upload.
       */
      path: string
    }
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: false

      /**
       * The error message.
       */
      error: string
    }

export type ResumeMultipartUploadResult =
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: true

      /**
       * The uploaded part.
       */
      part: UploadedPart
    }
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: false

      /**
       * The error message.
       */
      error: string
    }

export type GetMultipartUploadResult =
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: true

      /**
       * The key for the multipart upload operation.
       * This key must be included in all subsequent requests related to this multipart upload.
       */
      key: string

      /**
       * The resolved path of the multipart upload.
       */
      path: string

      /**
       * The uploaded parts.
       */
      parts: UploadedPart[]
    }
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: false

      /**
       * The error message.
       */
      error: string
    }

export type CompleteMultipartUploadResult<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id',
  TPopulateFields extends boolean,
> = UploadResult<TReturningFields, TPopulateFields>

export type AbortMultipartUploadResult =
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: true
    }
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: false

      /**
       * The error message.
       */
      error: string
    }

/**
 * Media categories for the `Uploads` collection.
 * The keys are the category names and the values are the MIME types that belong to that category.
 */
export const mediaCategories: Record<MediaCategory, string[]> = {
  'documents': [
    // PDF
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',

    // Microsoft Office - Legacy
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',

    // Microsoft Office - Modern
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    'application/vnd.openxmlformats-officedocument.presentationml.template',

    // OpenOffice/LibreOffice
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.graphics',
    'application/vnd.oasis.opendocument.chart',

    // Rich Text
    'application/rtf',
    'application/x-rtf',
    'text/richtext',
  ],

  'images': [
    // Common web formats
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
    'image/heif',
    'image/heic',
    'image/jxl', // JPEG XL
    'image/vnd.mozilla.apng', // Animated PNG

    // Icon formats
    'image/x-icon',
    'image/vnd.microsoft.icon',

    // Professional formats
    'image/tiff',
    'image/x-tiff',
    'image/bmp',
    'image/x-windows-bmp',
    'image/jp2', // JPEG 2000
    'image/jpx',
    'image/jpm',
    'image/jxs', // JPEG XS
    'image/x-xcf', // GIMP

    // Raw camera formats
    'image/x-canon-cr2',
    'image/x-canon-cr3',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-olympus-orf',
    'image/x-fuji-raf',
    'image/x-panasonic-rw2',
    'image/x-pentax-pef',
    'image/x-samsung-srw',
    'image/x-sigma-x3f',
    'image/x-hasselblad-3fr',
    'image/x-phaseone-iiq',

    // HDR formats
    'image/vnd.radiance',
    'image/x-exr',
    'image/x-hdr',

    // Design formats
    'image/vnd.adobe.photoshop',
    'application/x-photoshop',
    'image/x-photoshop',
    'application/photoshop',
    'application/psd',
    'image/psd',
    'application/illustrator',
    'application/postscript',

    // Scientific/Medical formats
    'image/x-dicom',
    'image/fits',

    // Texture formats
    'image/ktx',
    'image/ktx2',
    'image/vnd.dds',
    'image/x-dds',

    // Specialized web formats
    'image/jxr', // JPEG XR
    'image/x-icns', // Apple Icon format
    'image/x-tga',
    'image/vnd.dwg',
    'image/x-portable-pixmap',
    'image/x-portable-graymap',
    'image/x-portable-bitmap',
    'image/x-portable-anymap',
  ],

  'audio': [
    // Common formats
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/aacp',
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/x-pn-wav',
    'audio/webm',
    'audio/flac',

    // Professional formats
    'audio/aiff',
    'audio/x-aiff',
    'audio/basic',
    'audio/midi',
    'audio/x-midi',
    'audio/mpegurl',
    'audio/x-mpegurl',
    'audio/x-ms-wma',
    'audio/x-ms-wax',

    // Streaming formats
    'audio/vnd.wav',
    'audio/x-m4a',
    'audio/mp4a-latm',
    'audio/x-matroska',
  ],

  'video': [
    // Common formats
    'video/mp4',
    'video/mpeg',
    'video/ogg',
    'video/webm',
    'video/3gpp',
    'video/3gpp2',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-flv',

    // Professional formats
    'video/quicktime',
    'video/x-quicktime',
    'video/x-m4v',
    'video/x-matroska',
    'video/x-ms-asf',
    'video/x-ms-wmx',
    'video/x-ms-wvx',

    // Streaming formats
    'application/x-mpegURL',
    'video/MP2T',
    'application/vnd.apple.mpegurl',
    'application/vnd.rn-realmedia',
    'application/vnd.rn-realmedia-vbr',
  ],

  'archives': [
    // Common formats
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-gzip',
    'application/x-tar',
    'application/x-bzip',
    'application/x-bzip2',

    // Disk images
    'application/x-iso9660-image',
    'application/x-apple-diskimage',

    // Other archives
    'application/vnd.rar',
    'application/x-stuffit',
    'application/x-ace-compressed',
    'application/x-archive',
    'application/x-cpio',
    'application/x-shar',
    'application/x-lzh-compressed',
    'application/x-lzip',
    'application/x-lzma',
    'application/x-xz',
    'application/x-compress',
    'application/x-compressed',
  ],

  'code': [
    // Web
    'text/html',
    'application/xhtml+xml',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/x-javascript',
    'application/ecmascript',
    'application/x-httpd-php',
    'application/x-php',
    'application/php',

    // Programming languages
    'text/x-python',
    'text/x-java-source',
    'text/x-c',
    'text/x-c++',
    'text/x-csharp',
    'text/x-ruby',
    'text/x-perl',
    'text/x-go',
    'text/x-rust',
    'text/x-swift',
  ],

  'fonts': [
    // Modern web fonts
    'font/woff',
    'font/woff2',
    'font/ttf',
    'font/otf',
    'font/collection',

    // Legacy font types
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/x-font-woff',
    'application/font-woff',
    'application/font-woff2',
    'application/vnd.ms-fontobject',
    'application/font-sfnt',
    'application/x-font-opentype',
    'application/x-font-truetype',
  ],

  '3d': [
    // Common 3D formats
    'model/3mf',
    'model/stl',
    'application/sla',
    'model/obj',
    'model/gltf-binary',
    'model/gltf+json',
    'model/vnd.collada+xml',

    // CAD formats
    'application/x-3ds',
    'application/x-blend',
    'application/x-sketchup',
    'application/acad',
    'application/x-dwg',
    'application/x-dxf',
    'application/vnd.autodesk.inventor.part',
  ],

  'data': [
    // Structured data
    'application/json',
    'application/ld+json',
    'application/xml',
    'text/xml',
    'text/csv',
    'text/tab-separated-values',
    'application/x-yaml',
    'text/yaml',

    // Database files
    'application/sql',
    'application/x-sql',
    'application/vnd.sqlite3',
    'application/x-sqlite3',
    'application/x-mysql-dump',
    'application/x-postgresql-dump',
    'application/graphql',
    'application/x-mongodb',
    'application/vnd.apache.parquet',
    'application/x-avro-binary',
    'application/vnd.ms-access',
    'application/x-msaccess',
    'application/vnd.oracle',
    'application/x-dbase',
  ],

  'system': [
    // Configuration
    'application/x-conf',
    'application/x-ini',
    'application/toml',

    // System files
    'application/x-executable',
    'application/x-sharedlib',
    'application/x-shellscript',
    'application/batch-file',
    'application/x-ms-dos-executable',
    'application/x-msdownload',

    // Certificate/Key files
    'application/x-x509-ca-cert',
    'application/x-pkcs12',
    'application/pgp-keys',
    'application/x-pem-file',

    // Logs
    'application/x-log',
    'text/x-log',
  ],

  'text': [
    // Plain text formats
    'text/plain',
    'text/markdown',
    'text/calendar',
  ],

  'other': [],
}

/**
 * Prepare the input for the `Uploads` collection from the request body `input` and `files`.
 *
 * Returns an object with the following properties:
 *
 * - `type` - Either `directories` or `files`.
 *   - If the `files` object is empty, the input is assumed to be for a directory.
 * - `items` - An array of objects representing the input items for the `Uploads` collection.
 *
 * The `items` array contains objects with the following properties:
 *
 * - `file` - The file buffer (only when `type` is `files`).
 * - `path` - The normalized path of the file or directory.
 * - `type` - Either `directory` or `file`.
 * - `author` - The user ID of the author (optional).
 * - `editors` - An array of user IDs with edit permissions (optional).
 *
 * @example
 * ```ts
 * import { prepareUploadsInput } from '#pruvious/server'
 *
 * export defineEventHandler(async (event) => {
 *   const { input, files } = await parseBody(event)
 *   const preparedInput = prepareUploadsInput(input, files)
 *
 *   // ...
 * })
 * ```
 */
export function prepareUploadsInput<TInput extends Record<string, any> | Record<string, any>[]>(
  input: TInput,
  files: Record<string, Buffer>,
):
  | {
      type: 'directories'
      items: { path: string; type: 'directory'; author?: any; editors?: any }[]
    }
  | {
      type: 'files'
      items: { file: Buffer; path: string; type: 'file'; author?: any; editors?: any }[]
    } {
  if (isEmpty(files) && !isEmpty(input)) {
    return {
      type: 'directories',
      items: toArray(input).map((item: Record<string, any>) => ({
        path: tryNormalizePath(item.path),
        type: 'directory',
        author: item.author,
        editors: item.editors,
      })),
    }
  }

  return {
    type: 'files',
    items: Object.entries(files).map(([originalPath, file], i) => {
      const path = tryNormalizePath((isArray<Record<string, any>>(input) ? input[i]?.path : input.path) ?? originalPath)
      const author = isArray<Record<string, any>>(input) ? input[i]?.author : input.author
      const editors = isArray<Record<string, any>>(input) ? input[i]?.editors : input.editors
      return { file, path, type: 'file', author, editors }
    }),
  }
}

/**
 * Resolve the media category for a given MIME type.
 *
 * @example
 * ```ts
 * resolveMediaCategory('image/jpeg')       // 'images'
 * resolveMediaCategory('application/pdf')  // 'documents'
 * resolveMediaCategory('application/json') // 'data'
 * ```
 */
export function resolveMediaCategory(mime: string): MediaCategory {
  for (const [cat, mimes] of Object.entries(mediaCategories)) {
    if (mimes.includes(mime)) {
      return cat as MediaCategory
    }
  }

  return 'other'
}

/**
 * Creates a new upload record and uploads a `file` to the storage.
 *
 * This function performs the following actions in order:
 *
 * - Normalizes the `input.path`.
 * - Inserts a locked record into the `Uploads` collection with the `input` values.
 *   - Locked state prevents concurrent modifications and deletion.
 *   - Sets `input.type` to `file` automatically.
 * - Uploads the `file` to the storage.
 *   - The storage provider is defined in `nuxt.config.ts` via `pruvious.uploads.driver`.
 * - Removes the lock from the `Uploads` record and updates:
 *   - The `size` field with file size.
 *   - The `etag` with the storage provider's checksum.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:create` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * @returns a `PutUploadResult` object with the created `Uploads` record or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * import { parseBody, putUpload } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const { files } = await parseBody(event)
 *   const file = files.cv
 *
 *   if (file) {
 *     return putUpload(file, { path: '/documents/cv.pdf' })
 *   }
 *
 *   // ...
 * })
 * ```
 */
export async function putUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  file: Buffer,
  input: Pick<InsertInput<Collections['Uploads']>, 'author' | 'editors' | 'path'>,
  options?: PutUploadOptions<TReturningFields, TPopulateFields>,
): Promise<PutUploadResult<TReturningFields, TPopulateFields>> {
  const event = useEvent()
  const guarded = options?.guarded !== false

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:create'])
  }

  const { __, collections, deleteFile, deleteFrom, guardedInsertInto, insertInto, putFile, update } = await import(
    '#pruvious/server'
  )
  const normalizedPath = isDefined(input.path) ? tryNormalizePath(input.path.toString()) : undefined
  const returning =
    isUndefined(options?.returning) || toArray(options?.returning).includes('*' as any)
      ? ([...Object.keys(collections.Uploads.fields), 'id'] as any)
      : options.returning
  const insertQueryBuilder = guarded ? guardedInsertInto('Uploads') : insertInto('Uploads')
  const insertQuery = await insertQueryBuilder
    .values({ ...input, path: normalizedPath as any, type: 'file', isLocked: true })
    .returning(['id', 'path'])
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!insertQuery.success) {
    return {
      success: false,
      data: undefined,
      inputErrors: insertQuery.inputErrors?.[0],
      runtimeError: insertQuery.runtimeError,
      details: { path: normalizedPath ?? '', type: 'file' },
    } as PutUploadResult<TReturningFields, TPopulateFields>
  }

  const { id, path } = insertQuery.data[0]!
  const putResult = await putFile(file, path)

  if (!putResult.success) {
    await deleteFrom('Uploads').where('id', '=', id).withCustomContextData({ _allowUploadsQueries: true }).run()

    return {
      success: false,
      data: undefined,
      inputErrors: undefined,
      runtimeError: __('pruvious-api', putResult.error as any),
      details: { id, path, type: 'file' },
    }
  }

  const updateQueryBuilder = update('Uploads')
    .where('id', '=', id)
    .set({ size: putResult.data.size, etag: putResult.data.etag, isLocked: false })
    .returning(returning)

  if (options?.populate) {
    updateQueryBuilder.populate()
  }

  const updateQuery = await updateQueryBuilder.withCustomContextData({ _allowUploadsQueries: true }).run()

  if (!updateQuery.success) {
    await deleteFile(path)
    await deleteFrom('Uploads').where('id', '=', id).withCustomContextData({ _allowUploadsQueries: true }).run()

    return {
      ...updateQuery,
      details: { id, path, type: 'file' },
    }
  }

  return {
    success: true,
    data: updateQuery.data[0] as any,
    inputErrors: undefined,
    runtimeError: undefined,
    details: { id, path, type: 'file' },
  }
}

/**
 * Moves an upload record and its associated file to a new path.
 *
 * This function performs the following actions in order:
 *
 * - Locks the upload record to prevent concurrent modifications and deletion.
 * - Validates the new path and checks if it is different from the current path.
 * - Updates the upload record with the new path.
 *   - If the upload is a file, the new path is normalized and the file extension is preserved.
 *   - If the upload is an image, all optimized image variants are moved as well.
 *   - If the `overwrite` option is enabled, an existing file with the same path is deleted.
 *   - If the upload is a directory, all nested files and directories will be moved recursively.
 * - Moves the file to the new path in the storage.
 *   - The storage provider is defined in `nuxt.config.ts` via `pruvious.uploads.driver`.
 * - Removes the lock from the upload record.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:update` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * @returns an array of `MoveUploadResult` objects with the updated `Uploads` records or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * import { moveUpload } from '#pruvious/server'
 *
 * export default defineEventHandler(() => {
 *   return moveUpload('documents/cv.pdf', '/archive/cv.pdf')
 * })
 * ```
 */
export async function moveUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  path: string,
  newPath: string,
  options?: MoveUploadOptions<TReturningFields, TPopulateFields>,
): Promise<MoveUploadResult<TReturningFields, TPopulateFields>[]>
export async function moveUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  id: number,
  newPath: string,
  options?: MoveUploadOptions<TReturningFields, TPopulateFields>,
): Promise<MoveUploadResult<TReturningFields, TPopulateFields>[]>
export async function moveUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  pathOrId: string | number,
  newPath: string,
  options?: MoveUploadOptions<TReturningFields, TPopulateFields>,
): Promise<MoveUploadResult<TReturningFields, TPopulateFields>[]> {
  const event = useEvent()
  const guarded = options?.guarded !== false
  const user = { canManage: false, id: 0 }

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:update'])
    user.id = event.context.pruvious.auth.user.id
    user.canManage = event.context.pruvious.auth.permissions.includes('collection:uploads:manage')
  }

  const { __, collections, deleteFrom, insertInto, moveFile, selectFrom, update } = await import('#pruvious/server')
  const results: MoveUploadResult<TReturningFields, TPopulateFields>[] = []
  const returning =
    isUndefined(options?.returning) || toArray(options?.returning).includes('*' as any)
      ? ([...Object.keys(collections.Uploads.fields), 'id'] as any)
      : options.returning
  const populate = !!options?.populate
  const overwrite = !!options?.overwrite
  const lockQueryBuilder = update('Uploads').set({ isLocked: true }).where('isLocked', '=', false)

  if (isString(pathOrId)) {
    lockQueryBuilder.where('path', '=', pathOrId)
  } else {
    lockQueryBuilder.where('id', '=', pathOrId)
  }

  if (guarded && !user.canManage) {
    lockQueryBuilder.orGroup([
      (eb) => eb.where('author', '=', user.id),
      (eb) => eb.where('editors', 'includes', user.id),
    ])
  }

  const lockQuery = await lockQueryBuilder
    .returning(['id', 'path', 'type', 'level', 'images'])
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!lockQuery.success) {
    return [
      {
        ...lockQuery,
        details: {
          id: isNumber(pathOrId) ? pathOrId : undefined,
          path: isString(pathOrId) ? pathOrId : undefined,
          newPath,
        },
      },
    ]
  } else if (isEmpty(lockQuery.data)) {
    return []
  }

  const { id, path, type, level, images } = lockQuery.data[0]!
  let etag: string | undefined

  const newPathValidation = await insertInto('Uploads')
    .values({ path: newPath + randomString(27).toLowerCase(), type })
    .validate()

  if (!newPathValidation.success || path === newPath || newPath === '/' || newPath.startsWith(`${path}/`)) {
    await update('Uploads')
      .set({ isLocked: false })
      .where('id', '=', id)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    if (!newPathValidation.success) {
      return [
        {
          success: false,
          data: undefined,
          inputErrors: newPathValidation.inputErrors?.[0],
          runtimeError: newPathValidation.runtimeError,
          details: { id, path, newPath, type },
        } as MoveUploadResult<TReturningFields, TPopulateFields>,
      ]
    }

    return [
      {
        success: false,
        data: undefined,
        inputErrors: {
          path:
            path === newPath
              ? __('pruvious-api', 'The new path must be different from the current path')
              : newPath === '/'
                ? __('pruvious-api', 'The new path cannot be the root directory')
                : __('pruvious-api', 'The new path cannot be a subdirectory of the current path'),
        },
        runtimeError: undefined,
        details: { id, path, newPath, type },
      },
    ]
  }

  if (type === 'file') {
    const ext = extname(path)
    newPath = newPath.endsWith(ext) ? newPath : newPath + ext

    if (overwrite) {
      await deleteUpload(newPath, { returning: ['id'] })
    }

    const updatePathQuery = await update('Uploads')
      .set({ path: newPath })
      .where('id', '=', id)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    if (!updatePathQuery.success) {
      await update('Uploads')
        .set({ isLocked: false })
        .where('id', '=', id)
        .withCustomContextData({ _allowUploadsQueries: true })
        .run()

      return [{ ...updatePathQuery, details: { id, path, newPath, type } }]
    }

    const moveResult = await moveFile(path, newPath)

    if (!moveResult.success) {
      await update('Uploads')
        .set({ path, isLocked: false })
        .where('id', '=', id)
        .withCustomContextData({ _allowUploadsQueries: true })
        .run()

      return [
        {
          success: false,
          data: undefined,
          inputErrors: undefined,
          runtimeError: __('pruvious-api', moveResult.error as any),
          details: { id, path, newPath, type },
        },
      ]
    }

    etag = moveResult.data.etag

    if (!isEmpty(images)) {
      const oldBasePath = ext ? path.slice(0, -ext.length) : path
      const newBasePath = ext ? newPath.slice(0, -ext.length) : newPath

      for (const image of images) {
        await moveFile(oldBasePath + image, newBasePath + image)
      }
    }
  } else if (type === 'directory') {
    const selectQuery = await selectFrom('Uploads')
      .select(['id', 'path'])
      .where('path', 'like', `${path}/%`)
      .where('level', '=', level + 1)
      .withCustomContextData({ _allowUploadsQueries: true })
      .all()

    if (selectQuery.success) {
      for (const { id, path: nestedPath } of selectQuery.data) {
        const newNestedPath = newPath + nestedPath.slice(path.length)
        await moveUpload(id, newNestedPath, { guarded, returning, populate, overwrite }).then((res) =>
          results.push(...(res as any)),
        )
      }
    }
  }

  // @todo test: custom where clause checking if no `${path}/%` uploads exist
  const updateQueryBuilder = update('Uploads')
    .set({ path: newPath, etag, isLocked: false })
    .where('id', '=', id)
    .whereRaw('not exists(select 1 from "Uploads" where "path" like $path)', { path: `${path}/%` })
    .returning(returning)

  if (populate) {
    updateQueryBuilder.populate()
  }

  let updateQuery = await updateQueryBuilder.withCustomContextData({ _allowUploadsQueries: true }).run()

  if (!updateQuery.success && type === 'directory') {
    const deleteQuery = await deleteFrom('Uploads')
      .where('id', '=', id)
      .whereRaw('not exists(select 1 from "Uploads" where "path" like $path)', { path: `${path}/%` })
      .whereRaw('exists(select 1 from "Uploads" where "path" = $newPath)', { newPath })
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    if (deleteQuery.success && !isEmpty(deleteQuery.data)) {
      const updateQueryBuilder = update('Uploads').set({}).where('path', '=', newPath)

      if (populate) {
        updateQueryBuilder.populate()
      }

      updateQuery = await updateQueryBuilder
        .returning(returning)
        .withCustomContextData({ _allowUploadsQueries: true })
        .run()
    }
  }

  if (updateQuery.success && !isEmpty(updateQuery.data)) {
    results.push({
      success: true,
      data: updateQuery.data[0] as any,
      inputErrors: undefined,
      runtimeError: undefined,
      details: { id, path, newPath, type },
    })
  } else {
    await update('Uploads')
      .set({ isLocked: false })
      .where('id', '=', id)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    if (updateQuery.success) {
      results.push({
        success: false,
        data: undefined,
        inputErrors: undefined,
        runtimeError: __('pruvious-api', 'This directory contains nested files or directories that cannot be moved'),
        details: { id, path, newPath, type },
      })
    } else {
      results.push({ ...updateQuery, details: { id, path, newPath, type } })
    }
  }

  return results
}

/**
 * Updates an upload record with the given `input` values.
 * Optionally updates all nested files and directories with the same input.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:update` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * @returns an `UpdateUploadOptions` object with the updated `Uploads` record or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * import { updateUpload } from '#pruvious/server'
 *
 * export default defineEventHandler(() => {
 *   return updateUpload('/documents', { author: 1 }, { recursive: true })
 * })
 * ```
 */
export async function updateUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  path: string,
  input: Pick<UpdateInput<Collections['Uploads']>, 'author' | 'editors' | 'isLocked'>,
  options?: UpdateUploadOptions<TReturningFields, TPopulateFields>,
): Promise<
  QueryBuilderResult<
    TPopulateFields extends true
      ? Pick<ExtractPopulatedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>
      : Pick<ExtractCastedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>,
    Record<string, string>
  >
>
export async function updateUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  id: number,
  input: Pick<UpdateInput<Collections['Uploads']>, 'author' | 'editors' | 'isLocked'>,
  options?: UpdateUploadOptions<TReturningFields, TPopulateFields>,
): Promise<
  QueryBuilderResult<
    TPopulateFields extends true
      ? Pick<ExtractPopulatedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>
      : Pick<ExtractCastedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>,
    Record<string, string>
  >
>
export async function updateUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  pathOrId: string | number,
  input: Pick<UpdateInput<Collections['Uploads']>, 'author' | 'editors' | 'isLocked'>,
  options?: UpdateUploadOptions<TReturningFields, TPopulateFields>,
): Promise<
  QueryBuilderResult<
    TPopulateFields extends true
      ? Pick<ExtractPopulatedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>
      : Pick<ExtractCastedTypes<Collections['Uploads']['fields']> & { id: number }, TReturningFields>,
    Record<string, string>
  >
> {
  const event = useEvent()
  const guarded = options?.guarded !== false
  const user = { canManage: false, id: 0 }

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:update'])
    user.id = event.context.pruvious.auth.user.id
    user.canManage = event.context.pruvious.auth.permissions.includes('collection:uploads:manage')
  }

  const { collections, guardedUpdate, selectFrom, update } = await import('#pruvious/server')
  const returning =
    isUndefined(options?.returning) || toArray(options?.returning).includes('*' as any)
      ? ([...Object.keys(collections.Uploads.fields), 'id'] as any)
      : options.returning
  const populate = !!options?.populate
  const recursive = !!options?.recursive
  const updateQueryBuilder = guarded ? guardedUpdate('Uploads') : update('Uploads')

  updateQueryBuilder.set(pick(input, ['author', 'editors', 'isLocked']))

  if (recursive) {
    let path = pathOrId

    if (isNumber(pathOrId)) {
      const uploadQuery = await selectFrom('Uploads')
        .select('path')
        .where('id', '=', pathOrId)
        .withCustomContextData({ _allowUploadsQueries: true })
        .first()

      if (!uploadQuery.success || isEmpty(uploadQuery.data)) {
        updateQueryBuilder.where('id', '=', pathOrId)
      } else {
        path = uploadQuery.data.path
      }
    }

    if (isString(path)) {
      updateQueryBuilder.orGroup([(eb) => eb.where('path', '=', path), (eb) => eb.where('path', 'like', `${path}/%`)])
    }
  } else {
    if (isString(pathOrId)) {
      updateQueryBuilder.where('path', '=', pathOrId)
    } else {
      updateQueryBuilder.where('id', '=', pathOrId)
    }
  }

  if (guarded && !user.canManage) {
    updateQueryBuilder.orGroup([
      (eb) => eb.where('author', '=', user.id),
      (eb) => eb.where('editors', 'includes', user.id),
    ])
  }

  updateQueryBuilder.returning(returning)

  if (populate) {
    updateQueryBuilder.populate()
  }

  return updateQueryBuilder.withCustomContextData({ _allowUploadsQueries: true }).run() as any
}

/**
 * Deletes an upload record and removes the associated file(s) from the storage.
 *
 * This function performs the following actions in order:
 *
 * - Locks the upload record to prevent concurrent modifications and deletion.
 * - Deletes the associated file from the storage.
 *   - Deletes all optimized images associated with the upload if the upload is an image.
 *   - The storage provider is defined in `nuxt.config.ts` via `pruvious.uploads.driver`.
 * - Deletes all nested files and directories associated with the upload if the `recursive` option is enabled.
 *   - This option takes effect only when the upload is a directory.
 *   - Nested uploads inherit all auth and permission checks from their parent.
 *   - The `recursive` option is enabled by default.
 * - Removes the lock from the upload record.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:delete` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * @returns an array of `DeleteUploadResult` objects containing either a deleted `Uploads` record or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * import { deleteUpload } from '#pruvious/server'
 *
 * export default defineEventHandler(() => {
 *   return deleteUpload('/documents/cv.pdf')
 * })
 * ```
 */
export async function deleteUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  path: string,
  options?: DeleteUploadOptions<TReturningFields, TPopulateFields>,
): Promise<DeleteUploadResult<TReturningFields, TPopulateFields>[]>
export async function deleteUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  id: number,
  options?: DeleteUploadOptions<TReturningFields, TPopulateFields>,
): Promise<DeleteUploadResult<TReturningFields, TPopulateFields>[]>
export async function deleteUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  pathOrId: string | number,
  options?: DeleteUploadOptions<TReturningFields, TPopulateFields>,
): Promise<DeleteUploadResult<TReturningFields, TPopulateFields>[]> {
  const event = useEvent()
  const guarded = options?.guarded !== false
  const user = { canManage: false, id: 0 }

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:delete'])
    user.id = event.context.pruvious.auth.user.id
    user.canManage = event.context.pruvious.auth.permissions.includes('collection:uploads:manage')
  }

  const { __, collections, deleteFile, deleteFrom, selectFrom, update } = await import('#pruvious/server')
  const results: DeleteUploadResult<TReturningFields, TPopulateFields>[] = []
  const returning =
    isUndefined(options?.returning) || toArray(options?.returning).includes('*' as any)
      ? ([...Object.keys(collections.Uploads.fields), 'id'] as any)
      : options.returning
  const populate = !!options?.populate
  const recursive = options?.recursive !== false
  const lockQueryBuilder = update('Uploads').set({ isLocked: true }).where('isLocked', '=', false)

  if (isString(pathOrId)) {
    lockQueryBuilder.where('path', '=', pathOrId)
  } else {
    lockQueryBuilder.where('id', '=', pathOrId)
  }

  if (guarded && !user.canManage) {
    lockQueryBuilder.orGroup([
      (eb) => eb.where('author', '=', user.id),
      (eb) => eb.where('editors', 'includes', user.id),
    ])
  }

  const lockQuery = await lockQueryBuilder
    .returning(['id', 'path', 'type', 'level', 'images'])
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!lockQuery.success) {
    return [
      {
        ...lockQuery,
        details: {
          id: isNumber(pathOrId) ? pathOrId : undefined,
          path: isString(pathOrId) ? pathOrId : undefined,
        },
      },
    ]
  } else if (isEmpty(lockQuery.data)) {
    return []
  }

  const { id, path, type, level, images } = lockQuery.data[0]!

  if (type === 'file') {
    if (!isEmpty(images)) {
      const ext = extname(path)
      const basePath = ext ? path.slice(0, -ext.length) : path

      for (const image of images) {
        await deleteFile(basePath + image)
      }
    }

    const deleteResult = await deleteFile(path)

    if (!deleteResult.success) {
      await update('Uploads')
        .set({ isLocked: false })
        .where('id', '=', id)
        .withCustomContextData({ _allowUploadsQueries: true })
        .run()

      return [
        {
          success: false,
          data: undefined,
          inputErrors: undefined,
          runtimeError: __('pruvious-api', deleteResult.error as any),
          details: { id, path, type },
        },
      ]
    }
  } else if (type === 'directory' && recursive) {
    const selectQuery = await selectFrom('Uploads')
      .select('id')
      .where('path', 'like', `${path}/%`)
      .where('level', '=', level + 1)
      .withCustomContextData({ _allowUploadsQueries: true })
      .all()

    if (selectQuery.success) {
      for (const { id } of selectQuery.data) {
        await deleteUpload(id, { guarded, returning, populate }).then((res) => results.push(...(res as any)))
      }
    }
  }

  // @todo test: custom where clause checking if no `${path}/%` uploads exist
  const deleteQueryBuilder = deleteFrom('Uploads')
    .where('id', '=', id)
    .whereRaw('not exists(select 1 from "Uploads" where "path" like $path)', { path: `${path}/%` })
    .returning(returning)

  if (populate) {
    deleteQueryBuilder.populate()
  }

  const deleteQuery = await deleteQueryBuilder.withCustomContextData({ _allowUploadsQueries: true }).run()

  if (deleteQuery.success && !isEmpty(deleteQuery.data)) {
    results.push({
      success: true,
      data: deleteQuery.data[0] as any,
      inputErrors: undefined,
      runtimeError: undefined,
      details: { id, path, type },
    })
  } else {
    await update('Uploads')
      .set({ isLocked: false })
      .where('id', '=', id)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    if (deleteQuery.success) {
      results.push({
        success: false,
        data: undefined,
        inputErrors: undefined,
        runtimeError: __('pruvious-api', 'This directory contains nested files or directories that cannot be deleted'),
        details: { id, path, type },
      })
    } else {
      results.push({ ...deleteQuery, details: { id, path, type } })
    }
  }

  return results
}

/**
 * Initiates a new multipart upload record.
 * Returns a `key` needed for uploading file parts using `resumeMultipartUpload()`.
 * After uploading all parts, call `completeMultipartUpload()` to finalize, or `abortMultipartUpload()` to cancel the upload.
 *
 * This function performs the following actions in order:
 *
 * - Normalizes the `input.path`.
 * - Inserts a locked record into the `Uploads` collection with the `input` values.
 *   - Locked state prevents concurrent modifications and deletion.
 *   - Sets `input.type` to `file` automatically.
 *   - Sets the `multipart` field with the storage provider's key and an empty parts array.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:create` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * @returns a `CreateMultipartUploadResult` object with the created `Uploads` record or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * const mpu = await createMultipartUpload({ path: '/large-file.zip' })
 * // {
 * //   success: true,
 * //   key: '...',
 * //   path: '/large-file.zip',
 * // }
 *
 * if (mpu.success) {
 *   await getMultipartUpload(mpu.key)
 *   // {
 *   //   success: true,
 *   //   key: '...',
 *   //   path: '/large-file.zip',
 *   //   parts: [],
 *   // }
 *
 *   for (const [i, part] of fileParts.entries()) {
 *     await resumeMultipartUpload(part, i, mpu.key)
 *     // {
 *     //   success: true,
 *     //   part: {
 *     //     partNumber: i,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   }
 *
 *   if (shouldComplete) {
 *     await completeMultipartUpload(mpu.key, { returning: ['id', 'etag'] })
 *     // {
 *     //   success: true,
 *     //   data: {
 *     //     id: 1,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   } else {
 *     await abortMultipartUpload(mpu.key)
 *     // {
 *     //   success: true,
 *     // }
 *   }
 * }
 * ```
 */
export async function createMultipartUpload(
  input: Pick<InsertInput<Collections['Uploads']>, 'author' | 'editors' | 'path'>,
  options?: CreateMultipartUploadOptions,
): Promise<CreateMultipartUploadResult> {
  const event = useEvent()
  const guarded = options?.guarded !== false

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:create'])
  }

  const { __, deleteFrom, guardedInsertInto, insertInto, storage, update } = await import('#pruvious/server')
  const normalizedPath = isDefined(input.path) ? tryNormalizePath(input.path.toString()) : undefined
  const insertQueryBuilder = guarded ? guardedInsertInto('Uploads') : insertInto('Uploads')
  const insertQuery = await insertQueryBuilder
    .values({ path: normalizedPath as any, type: 'file', isLocked: true })
    .returning(['id', 'path'])
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!insertQuery.success) {
    return {
      success: false,
      error: insertQuery.runtimeError ?? __('pruvious-api', 'Failed to create multipart upload'),
    }
  }

  const { id, path } = insertQuery.data[0]!
  const storageResult = await storage().createMultipartUpload(path)

  if (!storageResult.success) {
    await deleteFrom('Uploads').where('id', '=', id).withCustomContextData({ _allowUploadsQueries: true }).run()

    return {
      success: false,
      error: __('pruvious-api', storageResult.error as any),
    }
  }

  const { key } = storageResult.data
  const updateQuery = await update('Uploads')
    .where('id', '=', id)
    .set({ multipart: { key, parts: [] } })
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!updateQuery.success) {
    await storage().abortMultipartUpload(path, key)
    await deleteFrom('Uploads').where('id', '=', id).withCustomContextData({ _allowUploadsQueries: true }).run()

    return {
      success: false,
      error: updateQuery.runtimeError ?? __('pruvious-api', 'Failed to create multipart upload'),
    }
  }

  return {
    success: true,
    key,
    path,
  }
}

/**
 * Retrieves an existing multipart upload record.
 * Returns a `key` needed for uploading file parts using `resumeMultipartUpload()`.
 * After uploading all parts, call `completeMultipartUpload()` to finalize, or `abortMultipartUpload()` to cancel the upload.
 * The `parts` array contains the uploaded parts with their part numbers and ETags.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:create` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * If the upload record is not found, the function automatically sets the response status code to `404`.
 *
 * @returns a `GetMultipartUploadResult` object with the `key`, `path`, and uploaded `parts` array, or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * const mpu = await createMultipartUpload({ path: '/large-file.zip' })
 * // {
 * //   success: true,
 * //   key: '...',
 * //   path: '/large-file.zip',
 * // }
 *
 * if (mpu.success) {
 *   await getMultipartUpload(mpu.key)
 *   // {
 *   //   success: true,
 *   //   key: '...',
 *   //   path: '/large-file.zip',
 *   //   parts: [],
 *   // }
 *
 *   for (const [i, part] of fileParts.entries()) {
 *     await resumeMultipartUpload(part, i, mpu.key)
 *     // {
 *     //   success: true,
 *     //   part: {
 *     //     partNumber: i,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   }
 *
 *   if (shouldComplete) {
 *     await completeMultipartUpload(mpu.key, { returning: ['id', 'etag'] })
 *     // {
 *     //   success: true,
 *     //   data: {
 *     //     id: 1,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   } else {
 *     await abortMultipartUpload(mpu.key)
 *     // {
 *     //   success: true,
 *     // }
 *   }
 * }
 * ```
 */
export async function getMultipartUpload(
  key: string,
  options?: GetMultipartUploadOptions,
): Promise<GetMultipartUploadResult> {
  const event = useEvent()
  const guarded = options?.guarded !== false
  const user = { canManage: false, id: 0 }

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:create'])
    user.id = event.context.pruvious.auth.user.id
    user.canManage = event.context.pruvious.auth.permissions.includes('collection:uploads:manage')
  }

  const { __, selectFrom } = await import('#pruvious/server')
  const selectQueryBuilder = selectFrom('Uploads')
    .select(['path', 'multipart'])
    .where('type', '=', 'file')
    .where('isLocked', '=', true)
    .where('multipart', 'like', `{"key":"${key}",%}`)

  if (guarded && !user.canManage) {
    selectQueryBuilder.orGroup([
      (eb) => eb.where('author', '=', user.id),
      (eb) => eb.where('editors', 'includes', user.id),
    ])
  }

  const selectQuery = await selectQueryBuilder.withCustomContextData({ _allowUploadsQueries: true }).first()

  if (!selectQuery.success || isEmpty(selectQuery.data)) {
    setResponseStatus(event, 404, httpStatusCodeMessages[404])
    return {
      success: false,
      error: __('pruvious-api', 'Resource not found'),
    }
  }

  return {
    success: true,
    key,
    path: selectQuery.data.path,
    parts: selectQuery.data.multipart!.parts,
  }
}

/**
 * Uploads a part of a multipart upload.
 * The file `part` is identified by its `partNumber` and multipart `key`.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:create` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * If the multipart upload is not found, the function automatically sets the response status code to `404`.
 *
 * @returns a `ResumeMultipartUploadResult` object with the uploaded part information or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * const mpu = await createMultipartUpload({ path: '/large-file.zip' })
 * // {
 * //   success: true,
 * //   key: '...',
 * //   path: '/large-file.zip',
 * // }
 *
 * if (mpu.success) {
 *   await getMultipartUpload(mpu.key)
 *   // {
 *   //   success: true,
 *   //   key: '...',
 *   //   path: '/large-file.zip',
 *   //   parts: [],
 *   // }
 *
 *   for (const [i, part] of fileParts.entries()) {
 *     await resumeMultipartUpload(part, i, mpu.key)
 *     // {
 *     //   success: true,
 *     //   part: {
 *     //     partNumber: i,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   }
 *
 *   if (shouldComplete) {
 *     await completeMultipartUpload(mpu.key, { returning: ['id', 'etag'] })
 *     // {
 *     //   success: true,
 *     //   data: {
 *     //     id: 1,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   } else {
 *     await abortMultipartUpload(mpu.key)
 *     // {
 *     //   success: true,
 *     // }
 *   }
 * }
 * ```
 */
export async function resumeMultipartUpload(
  part: Buffer,
  partNumber: number,
  key: string,
  options?: ResumeMultipartUploadOptions,
): Promise<ResumeMultipartUploadResult> {
  const event = useEvent()
  const guarded = options?.guarded !== false

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:create'])
  }

  const { __, storage, update } = await import('#pruvious/server')
  const mpu = await getMultipartUpload(key, { guarded: false })

  if (!mpu.success) {
    return mpu
  }

  if (mpu.parts.some((part) => part.partNumber === partNumber)) {
    return {
      success: false,
      error: __('pruvious-api', 'The file part has already been uploaded'),
    }
  }

  const storageResult = await storage().resumeMultipartUpload(part, mpu.path, key, partNumber)

  if (!storageResult.success) {
    return {
      success: false,
      error: __('pruvious-api', storageResult.error as any),
    }
  }

  const updateQuery = await update('Uploads')
    .where('path', '=', mpu.path)
    .set({ multipart: { key, parts: [...mpu.parts, { partNumber, etag: storageResult.data.etag }] } })
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!updateQuery.success) {
    await abortMultipartUpload(key, { guarded: false })

    return {
      success: false,
      error: updateQuery.runtimeError ?? __('pruvious-api', 'Failed to resume multipart upload'),
    }
  }

  return {
    success: true,
    part: storageResult.data,
  }
}

/**
 * Finalizes a multipart upload.
 * The `key` is the multipart upload identifier returned by `createMultipartUpload()`.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:create` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * If the multipart upload is not found, the function automatically sets the response status code to `404`.
 *
 * @returns a `CompleteMultipartUploadResult` object with the finalized `Uploads` record or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * const mpu = await createMultipartUpload({ path: '/large-file.zip' })
 * // {
 * //   success: true,
 * //   key: '...',
 * //   path: '/large-file.zip',
 * // }
 *
 * if (mpu.success) {
 *   await getMultipartUpload(mpu.key)
 *   // {
 *   //   success: true,
 *   //   key: '...',
 *   //   path: '/large-file.zip',
 *   //   parts: [],
 *   // }
 *
 *   for (const [i, part] of fileParts.entries()) {
 *     await resumeMultipartUpload(part, i, mpu.key)
 *     // {
 *     //   success: true,
 *     //   part: {
 *     //     partNumber: i,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   }
 *
 *   if (shouldComplete) {
 *     await completeMultipartUpload(mpu.key, { returning: ['id', 'etag'] })
 *     // {
 *     //   success: true,
 *     //   data: {
 *     //     id: 1,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   } else {
 *     await abortMultipartUpload(mpu.key)
 *     // {
 *     //   success: true,
 *     // }
 *   }
 * }
 * ```
 */
export async function completeMultipartUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  key: string,
  options?: CompleteMultipartUploadOptions<TReturningFields, TPopulateFields>,
): Promise<CompleteMultipartUploadResult<TReturningFields, TPopulateFields>> {
  const event = useEvent()
  const guarded = options?.guarded !== false

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:create'])
  }

  const { __, collections, storage, update } = await import('#pruvious/server')
  const mpu = await getMultipartUpload(key, { guarded: false })

  if (!mpu.success) {
    return {
      success: false,
      data: undefined,
      inputErrors: undefined,
      runtimeError: mpu.error,
    }
  }

  if (isEmpty(mpu.parts)) {
    return {
      success: false,
      data: undefined,
      inputErrors: undefined,
      runtimeError: __('pruvious-api', 'No file parts have been uploaded'),
    }
  }

  const missingParts = Array.from(
    { length: Math.max(...mpu.parts.map(({ partNumber }) => partNumber)) },
    (_, i) => i + 1,
  ).filter((n) => !mpu.parts.some(({ partNumber }) => partNumber === n))

  if (!isEmpty(missingParts)) {
    return {
      success: false,
      data: undefined,
      inputErrors: undefined,
      runtimeError: __('pruvious-api', 'Missing file parts: $parts', { parts: missingParts.join(', ') }),
    }
  }

  const storageResult = await storage().completeMultipartUpload(mpu.path, key, mpu.parts)

  if (!storageResult.success) {
    return {
      success: false,
      data: undefined,
      inputErrors: undefined,
      runtimeError: __('pruvious-api', storageResult.error as any),
    }
  }

  const returning =
    isUndefined(options?.returning) || toArray(options?.returning).includes('*' as any)
      ? ([...Object.keys(collections.Uploads.fields), 'id'] as any)
      : options.returning
  const updateQueryBuilder = update('Uploads')
    .where('path', '=', mpu.path)
    .set({ size: storageResult.data.size, etag: storageResult.data.etag, multipart: null, isLocked: false })
    .returning(returning)

  if (options?.populate) {
    updateQueryBuilder.populate()
  }

  const updateQuery = await updateQueryBuilder.withCustomContextData({ _allowUploadsQueries: true }).run()

  if (!updateQuery.success) {
    await abortMultipartUpload(key, { guarded: false })
    return updateQuery
  }

  return {
    success: true,
    data: updateQuery.data[0] as any,
    inputErrors: undefined,
    runtimeError: undefined,
  }
}

/**
 * Cancels a multipart upload and removes the associated file parts from the storage.
 *
 * By default, this function checks if the current user is authenticated and has the `collection:uploads:create` permission.
 * Set the `options.guarded` parameter to `false` to skip this check.
 *
 * @returns an `AbortMultipartUploadResult` object with the canceled multipart upload information or error information.
 * @throws an error if guarded mode is enabled and the user does not have the required permissions.
 *
 * @example
 * ```ts
 * const mpu = await createMultipartUpload({ path: '/large-file.zip' })
 * // {
 * //   success: true,
 * //   key: '...',
 * //   path: '/large-file.zip',
 * // }
 *
 * if (mpu.success) {
 *   await getMultipartUpload(mpu.key)
 *   // {
 *   //   success: true,
 *   //   key: '...',
 *   //   path: '/large-file.zip',
 *   //   parts: [],
 *   // }
 *
 *   for (const [i, part] of fileParts.entries()) {
 *     await resumeMultipartUpload(part, i, mpu.key)
 *     // {
 *     //   success: true,
 *     //   part: {
 *     //     partNumber: i,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   }
 *
 *   if (shouldComplete) {
 *     await completeMultipartUpload(mpu.key, { returning: ['id', 'etag'] })
 *     // {
 *     //   success: true,
 *     //   data: {
 *     //     id: 1,
 *     //     etag: '...',
 *     //   },
 *     // }
 *   } else {
 *     await abortMultipartUpload(mpu.key)
 *     // {
 *     //   success: true,
 *     // }
 *   }
 * }
 * ```
 */
export async function abortMultipartUpload(
  key: string,
  options?: AbortMultipartUploadOptions,
): Promise<AbortMultipartUploadResult> {
  const event = useEvent()
  const guarded = options?.guarded !== false

  if (guarded) {
    assertUserPermissions(event, ['collection:uploads:create'])
  }

  const { __, deleteFrom, storage } = await import('#pruvious/server')
  const mpu = await getMultipartUpload(key, { guarded: false })

  if (!mpu.success) {
    return {
      success: false,
      error: mpu.error,
    }
  }

  const storageResult = await storage().abortMultipartUpload(mpu.path, key)
  const deleteQuery = await deleteFrom('Uploads')
    .where('path', '=', mpu.path)
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!storageResult.success) {
    return {
      success: false,
      error: __('pruvious-api', storageResult.error as any),
    }
  }

  if (!deleteQuery.success) {
    return {
      success: false,
      error: deleteQuery.runtimeError ?? __('pruvious-api', 'Failed to abort multipart upload'),
    }
  }

  return {
    success: true,
  }
}

/**
 * Adds a `urlSuffix` to an existing image upload record.
 */
export async function registerOptimizedImage(
  uploadId: number,
  urlSuffix: string,
): Promise<
  { success: true; upload: { id: number } & Collections['Uploads']['TCastedTypes'] } | { success: false; error: string }
> {
  const { __ } = await import('#pruvious/server')

  return _updateUploadImages(uploadId, (images) => {
    if (images.includes(urlSuffix)) {
      return { success: false, error: __('pruvious-api', 'The image has already been registered') }
    }

    return { success: true, images: [...images, urlSuffix] }
  })
}

/**
 * Removes a `urlSuffix` from an existing image upload record.
 */
export async function deregisterOptimizedImage(
  uploadId: number,
  urlSuffix: string,
): Promise<
  { success: true; upload: { id: number } & Collections['Uploads']['TCastedTypes'] } | { success: false; error: string }
> {
  const { __ } = await import('#pruvious/server')

  return _updateUploadImages(uploadId, (images) => {
    if (!images.includes(urlSuffix)) {
      return { success: false, error: __('pruvious-api', 'The image has not been registered') }
    }

    return { success: true, images: images.filter((image) => image !== urlSuffix) }
  })
}

async function _updateUploadImages(
  uploadId: number,
  callback: (images: string[]) => { success: true; images: string[] } | { success: false; error: string },
): Promise<
  { success: true; upload: { id: number } & Collections['Uploads']['TCastedTypes'] } | { success: false; error: string }
> {
  const { __, update } = await import('#pruvious/server')
  const unlock = () =>
    update('Uploads')
      .set({ isLocked: false })
      .where('id', '=', uploadId)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

  let upload: { id: number } & Collections['Uploads']['TCastedTypes']
  let i = 0

  while (true) {
    const query = await update('Uploads')
      .set({ isLocked: true })
      .where('id', '=', uploadId)
      .withCustomContextData({ _allowUploadsQueries: true })
      .returningAll()
      .run()

    if (query.success && !isEmpty(query.data)) {
      upload = query.data[0]!
      break
    } else {
      if (++i >= 5) return { success: false, error: __('pruvious-api', 'Resource not found') }
      await sleep(300)
    }
  }

  if (upload.category !== 'images') {
    await unlock()
    return {
      success: false,
      error: __('pruvious-api', 'The $subject must be an image', { subject: 'upload' }),
    }
  }

  const result = callback(upload.images)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const updateQuery = await update('Uploads')
    .set({ images: result.images, isLocked: false })
    .where('id', '=', uploadId)
    .withCustomContextData({ _allowUploadsQueries: true })
    .run()

  if (!updateQuery.success) {
    await unlock()
    return {
      success: false,
      error:
        updateQuery.runtimeError ?? updateQuery.inputErrors.images ?? __('pruvious-orm', 'An unknown error occurred'),
    }
  }

  return { success: true, upload }
}

/**
 * Creates a unique image optimization job and adds it to the queue.
 *
 * - The `uploadId` parameter is the ID of the image upload record.
 * - The `options` parameter is an object containing the image optimization settings.
 *
 * @returns a `QueryBuilderResult` with the created job record or error information.
 *
 * @example
 * ```ts
 * await queueImageOptimization(1337, { format: 'webp', width: 1920 })
 * // {
 * //   success: true,
 * //   data: {
 * //     name: 'optimize-image',
 * //     payload: {
 * //       uploadId: 1337,
 * //       options: {
 * //         format: 'webp',
 * //         width: 1920,
 * //       },
 * //     },
 * //     priority: 10,
 * //     key: 'optimize-image:1337_w200_h200.webp',
 * //     scheduledAt: null,
 * //     createdAt: 1735419553293,
 * //   },
 * // }
 * ```
 */
export async function queueImageOptimization(uploadId: number, options: ImageTransformOptions) {
  const { queueUniqueJob } = await import('#pruvious/server')
  const payload: Jobs['optimize-image']['TPayload'] = { uploadId, options }
  const urlSuffix = stringifyImageTransformOptions(options)

  if (isWorkerd) {
    const event = useEvent()
    const runtimeConfig = useRuntimeConfig()
    const url = new URL(event.context.cloudflare.request.url)
    payload.baseURL = url.origin + withoutTrailingSlash(runtimeConfig.pruvious.uploads.basePath)
  }

  return queueUniqueJob('optimize-image', `optimize-image:${uploadId}${urlSuffix}`, payload)
}
