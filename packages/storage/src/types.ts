import type { ReadStream } from 'node:fs'

export type StorageFile = string | Buffer | Uint8Array

interface IStorageFile {
  /**
   * The file data.
   */
  file: StorageFile
}

interface IStorageStream {
  /**
   * The file stream.
   */
  stream: ReadStream | ReadableStream

  /**
   * The byte offset where the stream starts.
   */
  start?: number

  /**
   * The byte offset where the stream ends.
   */
  end?: number
}

export interface StorageFileLocation {
  /**
   * The complete normalized file path, including directory and filename.
   */
  path: string

  /**
   * The directory path where the file is located.
   */
  dir: string

  /**
   * The filename with its extension (e.g. `document.pdf`).
   */
  name: string

  /**
   * The file extension without the leading dot (e.g. `pdf`).
   * Returns an empty string if no extension exists.
   */
  ext: string
}

export interface Metadata {
  /**
   * The size of the file in bytes.
   */
  size: number

  /**
   * The ETag of the file.
   */
  etag: string
}

export type Result<T> =
  | {
      /**
       * Indicates whether the operation was successful.
       */
      success: true

      /**
       * The data returned by the operation.
       */
      data: T
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

export interface MultipartUploadData {
  /**
   * The unique key of the multipart upload.
   * This key is used to identify the upload and its parts.
   */
  key: string
}

export interface UploadedPart {
  /**
   * The part number of the uploaded part.
   */
  partNumber: number

  /**
   * The ETag of the uploaded part.
   */
  etag: string
}

export type PutResult = Result<StorageFileLocation & Metadata>
export type GetResult = Result<StorageFileLocation & IStorageFile & Metadata>
export type StreamResult = Result<StorageFileLocation & IStorageStream & Metadata>
export type MoveResult = Result<StorageFileLocation & Metadata>
export type DeleteResult = Result<undefined>
export type MetaResult = Result<Metadata>
export type CreateMultipartUploadResult = Result<MultipartUploadData>
export type ResumeMultipartUploadResult = Result<UploadedPart>
export type CompleteMultipartUploadResult = Result<StorageFileLocation & Metadata>
export type AbortMultipartUploadResult = Result<undefined>

export interface Instance {
  /**
   * Stores a `file` at a specified `path` in the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the normalized file location and metadata.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * await storage.put(file, '/path/to/MyImage.webp')
   * // {
   * //   success: true,
   * //   data: {
   * //     path: '/path/to/my-image.webp',
   * //     dir: '/path/to',
   * //     name: 'my-image.webp',
   * //     ext: 'webp',
   * //     size: 1024,
   * //     etag: '...',
   * //   },
   * // }
   * ```
   */
  put: (file: StorageFile, path: string) => Promise<PutResult>

  /**
   * Retrieves a file from the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the normalized file buffer, location, and metadata.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * const file = await storage.get('/path/to/MyImage.webp')
   * // {
   * //   success: true,
   * //   data: {
   * //    file: '...', // file data
   * //    path: '/path/to/my-image.webp',
   * //    dir: '/path/to',
   * //    name: 'my-image.webp',
   * //    ext: 'webp',
   * //    size: 1024,
   * //    etag: '...',
   * //   },
   * // }
   * ```
   */
  get: (path: string) => Promise<GetResult>

  /**
   * Streams a file from the storage system.
   * You can specify the `start` and `end` byte offsets (zero-indexed & inclusive) to read a range of bytes.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the `ReadStream` or `ReadableStream`, normalized file location, and metadata.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * const stream = await storage.stream('/path/to/image.webp')
   * // {
   * //   success: true,
   * //   data: {
   * //     stream: '...', // ReadStream or ReadableStream
   * //     path: '/path/to/image.webp',
   * //     dir: '/path/to',
   * //     name: 'image.webp',
   * //     ext: 'webp',
   * //     size: 1024,
   * //     etag: '...',
   * //   },
   * // }
   * ```
   */
  stream: (path: string, start?: number, end?: number) => Promise<StreamResult>

  /**
   * Moves a file `from` one location `to` another in the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the new normalized file location and metadata.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * await storage.move('/path/to/image.webp', '/path/to/images/image.webp')
   * // {
   * //   success: true,
   * //   data: {
   * //     path: '/path/to/images/image.webp',
   * //     dir: '/path/to/images',
   * //     name: 'image.webp',
   * //     ext: 'webp',
   * //     size: 1024,
   * //     etag: '...',
   * //   },
   * // }
   * ```
   */
  move: (from: string, to: string) => Promise<MoveResult>

  /**
   * Deletes a file from the storage system.
   *
   * Returns an object with a `success` property indicating whether the operation was successful.
   *
   * @example
   * ```ts
   * await storage.delete('/path/to/image.webp')
   * // { success: true }
   * ```
   */
  delete: (path: string) => Promise<DeleteResult>

  /**
   * Retrieves metadata about a file from the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the metadata.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * const meta = await storage.meta('/path/to/image.webp')
   * // {
   * //   success: true,
   * //   data: {
   * //     size: 1024,
   * //     etag: '...',
   * //   },
   * // }
   * ```
   */
  meta(path: string): Promise<MetaResult>

  /**
   * Creates a new multipart upload for a file in the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the unique key of the multipart upload.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * const upload = await storage.createMultipartUpload('/path/to/large-file.zip')
   * // {
   * //   success: true,
   * //   data: {
   * //     key: '...',
   * //   },
   * // }
   * ```
   */
  createMultipartUpload(path: string): Promise<CreateMultipartUploadResult>

  /**
   * Uploads a part of a multipart upload to the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the part number and ETag of the uploaded part.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * const part = await storage.resumeMultipartUpload(file, '/path/to/large-file.zip', 'uploadKey', 2)
   * // {
   * //   success: true,
   * //   data: {
   * //     partNumber: 2,
   * //     etag: '...',
   * //   },
   * // }
   * ```
   */
  resumeMultipartUpload(
    file: StorageFile,
    path: string,
    key: string,
    partNumber: number,
  ): Promise<ResumeMultipartUploadResult>

  /**
   * Completes a multipart upload in the storage system.
   *
   * Returns a `Result` object with a `success` property indicating whether the operation was successful.
   *
   * - If successful, the `data` property contains the normalized file location and metadata.
   * - If unsuccessful, the `error` property contains the error message.
   *
   * @example
   * ```ts
   * const file = await storage.completeMultipartUpload('/path/to/large-file.zip', 'uploadKey', [
   *   { partNumber: 1, etag: '...' },
   *   { partNumber: 2, etag: '...' },
   *   // ...
   * ])
   * // {
   * //   success: true,
   * //   data: {
   * //     path: '/path/to/large-file.zip',
   * //     dir: '/path/to',
   * //     name: 'large-file.zip',
   * //     ext: 'zip',
   * //     size: 1024,
   * //     etag: '...',
   * //   },
   * // }
   * ```
   */
  completeMultipartUpload(path: string, key: string, parts: UploadedPart[]): Promise<CompleteMultipartUploadResult>

  /**
   * Aborts a multipart upload in the storage system.
   *
   * Returns an object with a `success` property indicating whether the operation was successful.
   *
   * @example
   * ```ts
   * await storage.abortMultipartUpload('/path/to/large-file.zip', 'uploadKey')
   * // { success: true }
   * ```
   */
  abortMultipartUpload(path: string, key: string): Promise<AbortMultipartUploadResult>
}
