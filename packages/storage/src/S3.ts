import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type CompleteMultipartUploadCommandOutput,
  type GetObjectCommandOutput,
  type UploadPartCommandOutput,
} from '@aws-sdk/client-s3'
import { castToBoolean, isInteger, randomString } from '@pruvious/utils'
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

export class S3 implements Instance {
  protected client: S3Client
  protected bucket: string

  constructor(protected connectionString: string) {
    const url = new URL(connectionString)

    this.client = new S3Client({
      credentials: {
        accessKeyId: url.username,
        secretAccessKey: url.password,
      },
      endpoint: castToBoolean(url.searchParams.get('ssl')) ? `https://${url.host}` : `http://${url.host}`,
      ...Array.from(url.searchParams).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {}),
    })
    this.bucket = url.pathname.slice(1)
  }

  async put(file: StorageFile, path: string): Promise<PutResult> {
    try {
      const parsed = parsePath(path)
      const output = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: parsed.path.slice(1),
          Body: file,
          ACL: 'public-read',
        }),
      )

      if (!output?.ETag) {
        return { success: false, error: 'Failed to upload file' }
      }

      const meta = await this.meta(parsed.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      return { success: true, data: { ...parsed, ...meta.data } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async get(path: string): Promise<GetResult> {
    try {
      const parsed = parsePath(path)
      let output: GetObjectCommandOutput

      try {
        output = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      if (!output.Body) {
        return { success: false, error: 'File not found' }
      }

      return {
        success: true,
        data: {
          ...parsed,
          file: await output.Body.transformToByteArray(),
          size: output.ContentLength!,
          etag: output.ETag!,
        },
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async stream(path: string, start?: number, end?: number): Promise<StreamResult> {
    try {
      const parsed = parsePath(path)

      let output: GetObjectCommandOutput

      try {
        output = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
            Range: isInteger(start) && start >= 0 ? `bytes=${start}-${end ?? ''}` : undefined,
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      if (!output.Body) {
        return { success: false, error: 'File not found' }
      }

      const data: (StreamResult & { success: true })['data'] = {
        stream: output.Body.transformToWebStream(),
        ...parsed,
        size: output.ContentLength!,
        etag: output.ETag!,
      }

      if (output.ContentRange) {
        const [, start, end, size] = output.ContentRange.match(/(\d+)-(\d+)\/(\d+)/) ?? []
        data.start = parseInt(start)
        data.end = parseInt(end)
        data.size = parseInt(size)
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async move(from: string, to: string): Promise<MoveResult> {
    try {
      const parsedFrom = parsePath(from)
      const parsedTo = parsePath(to)

      try {
        await this.client.send(
          new CopyObjectCommand({
            Bucket: this.bucket,
            Key: parsedTo.path.slice(1),
            CopySource: `${this.bucket}/${parsedFrom.path.slice(1)}`,
            ACL: 'public-read',
          }),
        )
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: parsedFrom.path.slice(1),
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      const meta = await this.meta(parsedTo.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      return { success: true, data: { ...parsedTo, ...meta.data } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async delete(path: string): Promise<DeleteResult> {
    try {
      const parsed = parsePath(path)

      try {
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      return { success: true, data: undefined }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async meta(path: string): Promise<MetaResult> {
    try {
      const parsed = parsePath(path)
      let output: GetObjectCommandOutput

      try {
        output = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      return { success: true, data: { size: output.ContentLength ?? 0, etag: output.ETag ?? `"${randomString()}"` } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async createMultipartUpload(path: string): Promise<CreateMultipartUploadResult> {
    try {
      const parsed = parsePath(path)
      const output = await this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key: parsed.path.slice(1),
          ACL: 'public-read',
        }),
      )

      if (!output.UploadId) {
        return { success: false, error: 'Failed to create multipart upload' }
      }

      return { success: true, data: { key: output.UploadId } }
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
      let output: UploadPartCommandOutput

      try {
        output = await this.client.send(
          new UploadPartCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
            UploadId: key,
            PartNumber: partNumber,
            Body: file,
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      if (!output?.ETag) {
        return { success: false, error: 'Failed to upload part' }
      }

      return { success: true, data: { partNumber, etag: output.ETag } }
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
      let output: CompleteMultipartUploadCommandOutput

      try {
        output = await this.client.send(
          new CompleteMultipartUploadCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
            UploadId: key,
            MultipartUpload: {
              Parts: parts.map(({ partNumber, etag }) => ({ PartNumber: partNumber, ETag: etag })),
            },
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      if (!output?.ETag) {
        return { success: false, error: 'Failed to complete multipart upload' }
      }

      const meta = await this.meta(parsed.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      return { success: true, data: { ...parsed, ...meta.data } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async abortMultipartUpload(path: string, key: string): Promise<AbortMultipartUploadResult> {
    try {
      const parsed = parsePath(path)

      try {
        await this.client.send(
          new AbortMultipartUploadCommand({
            Bucket: this.bucket,
            Key: parsed.path.slice(1),
            UploadId: key,
          }),
        )
      } catch (error: any) {
        return this.handleS3Error(error)
      }

      return { success: true, data: undefined }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  protected handleS3Error(error: any): { success: false; error: string } {
    if (error.name === 'NoSuchKey') {
      return { success: false, error: 'File not found' }
    }

    throw error
  }
}
