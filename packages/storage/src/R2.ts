import type { R2Bucket, R2GetOptions } from '@cloudflare/workers-types'
import { isDefined, isInteger, isString, pick } from '@pruvious/utils'
import type {
  AbortMultipartUploadResult,
  CompleteMultipartUploadResult,
  CreateMultipartUploadResult,
  DeleteResult,
  GetResult,
  Instance,
  MetaResult,
  MoveResult,
  PutResult,
  ResumeMultipartUploadResult,
  StorageFile,
  StreamResult,
  UploadedPart,
} from './types'
import { parsePath } from './utils'

export class R2 implements Instance {
  protected bucket: R2Bucket

  constructor(binding: string | R2Bucket) {
    this.bucket = isString(binding)
      ? process.env[binding] || (globalThis as any).__env__?.[binding] || (globalThis as any)[binding]
      : binding
  }

  async put(file: StorageFile, path: string): Promise<PutResult> {
    try {
      const parsed = parsePath(path)
      const object = await this.bucket.put(parsed.path.slice(1), file)

      if (!object) {
        return { success: false, error: 'Failed to upload file' }
      }

      return { success: true, data: { ...parsed, size: object.size, etag: object.httpEtag } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async get(path: string): Promise<GetResult> {
    try {
      const parsed = parsePath(path)
      const object = await this.bucket.get(parsed.path.slice(1))
      const chunks = []

      if (!object) {
        return { success: false, error: 'File not found' }
      }

      for await (const chunk of object.body) {
        chunks.push(chunk)
      }

      return {
        success: true,
        data: { ...parsed, file: Buffer.concat(chunks), size: object.size, etag: object.httpEtag },
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async stream(path: string, start?: number, end?: number): Promise<StreamResult> {
    try {
      const parsed = parsePath(path)
      const meta = await this.meta(path)
      const options: R2GetOptions = {}
      const range: { start?: number; end?: number } = {}

      if (!meta.success) {
        return { success: false, error: 'File not found' }
      }

      if (isDefined(start) || isDefined(end)) {
        const length = isDefined(end) ? Math.min(end, meta.data.size - 1) : meta.data.size - 1
        options.range = { offset: start, length }
      }

      if (isInteger(start) && start >= 0) {
        range.start = start
        range.end = isInteger(end) && end > start ? end : meta.data.size - 1
        options.range = { offset: start, length: range.end - range.start + 1 }
      }

      const object = await this.bucket.get(parsed.path.slice(1), options)

      if (!object) {
        return { success: false, error: 'File not found' }
      }

      return {
        success: true,
        data: { stream: object.body as any, ...parsed, ...meta.data, ...range },
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async move(from: string, to: string): Promise<MoveResult> {
    try {
      const parsedFrom = parsePath(from)
      const parsedTo = parsePath(to)
      const partSize = 16 * 1024 * 1024
      const parts = []
      const head = await this.bucket.head(parsedFrom.path.slice(1))

      if (!head) {
        return { success: false, error: 'File not found' }
      }

      const upload = await this.bucket.createMultipartUpload(
        parsedTo.path.slice(1),
        pick(head, ['customMetadata', 'httpMetadata']),
      )

      if (!upload) {
        return { success: false, error: 'Failed to move file' }
      }

      for (let i = 0; i < head.size; i += partSize) {
        const chunk = await this.bucket.get(parsedFrom.path.slice(1), {
          range: { offset: i, length: Math.min(partSize, head.size - i) },
        })
        const part = await upload.uploadPart(i / partSize + 1, await chunk!.arrayBuffer())
        parts.push(part)
      }

      const newObject = await upload.complete(parts)

      if (!newObject) {
        return { success: false, error: 'Failed to move file' }
      }

      await this.bucket.delete(parsedFrom.path.slice(1))
      return { success: true, data: { ...parsedTo, size: newObject.size, etag: newObject.httpEtag } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async delete(path: string): Promise<DeleteResult> {
    try {
      const parsed = parsePath(path)
      await this.bucket.delete(parsed.path.slice(1))
      return { success: true, data: undefined }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async meta(path: string): Promise<MetaResult> {
    try {
      const parsed = parsePath(path)
      const object = await this.bucket.head(parsed.path.slice(1))

      if (!object) {
        return { success: false, error: 'File not found' }
      }

      return { success: true, data: { size: object.size, etag: object.httpEtag } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async createMultipartUpload(path: string): Promise<CreateMultipartUploadResult> {
    try {
      const parsed = parsePath(path)
      const mpu = await this.bucket.createMultipartUpload(parsed.path.slice(1))
      return { success: true, data: { key: mpu.uploadId } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async resumeMultipartUpload(
    file: StorageFile,
    path: string,
    key: string,
    partNumber: number,
  ): Promise<ResumeMultipartUploadResult> {
    try {
      const parsed = parsePath(path)
      const mpu = this.bucket.resumeMultipartUpload(parsed.path.slice(1), key)
      const uploadedPart = await mpu.uploadPart(partNumber, file)
      return { success: true, data: uploadedPart }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async completeMultipartUpload(
    path: string,
    key: string,
    parts: UploadedPart[],
  ): Promise<CompleteMultipartUploadResult> {
    try {
      const parsed = parsePath(path)
      const mpu = this.bucket.resumeMultipartUpload(parsed.path.slice(1), key)
      const object = await mpu.complete(parts)

      if (!object) {
        return { success: false, error: 'Failed to complete multipart upload' }
      }

      return { success: true, data: { ...parsed, size: object.size, etag: object.httpEtag } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async abortMultipartUpload(path: string, key: string): Promise<AbortMultipartUploadResult> {
    try {
      const parsed = parsePath(path)
      const mpu = this.bucket.resumeMultipartUpload(parsed.path.slice(1), key)
      await mpu.abort()
      return { success: true, data: undefined }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}
