import type { R2Bucket } from '@cloudflare/workers-types'
import { defu, isObject, withoutTrailingSlash, withTrailingSlash } from '@pruvious/utils'
import { FS } from './FS'
import { R2 } from './R2'
import { S3 } from './S3'
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

export interface StorageOptions {
  /**
   * The storage driver to use.
   *
   * Available driver options:
   *
   * - **Local filesystem** - `fs://path/to/uploads`
   *   - The path is relative to the current working directory.
   * - **Cloudflare R2** - `r2://UPLOADS`
   *   - `UPLOADS` is the binding name of the R2 bucket.
   *   - You can also provide the `R2Bucket` instance directly instead of the connection string.
   * - **S3 compatible storage**
   *   - AWS: `s3://AKIAXXXXXXXX:SECRET_KEY@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true`
   *   - DigitalOcean: `s3://ACCESS_KEY:SECRET_KEY@nyc3.digitaloceanspaces.com/my-bucket?region=nyc3&ssl=true`
   *   - MinIO: `s3://ACCESS_KEY:SECRET_KEY@play.min.io/my-bucket?region=us-east-1`
   *
   * @default 'fs://.uploads'
   */
  driver?: StorageDriver
}

export type StorageDriver = `fs://${string}` | `r2://${string}` | R2Bucket | `s3://${string}`

/**
 * Storage manager for uploads.
 */
export class Storage implements Instance {
  /**
   * The storage driver type.
   */
  readonly type: 'fs' | 'r2' | 's3'

  protected options: Required<StorageOptions>
  protected instance: FS | R2 | S3

  constructor(options: StorageOptions) {
    this.options = defu(options, {
      driver: 'fs://.uploads' as const,
    })

    if (isObject(this.options.driver)) {
      this.instance = new R2(this.options.driver)
      this.type = 'r2'
    } else if (this.options.driver.startsWith('fs://')) {
      this.type = 'fs'
      this.instance = new FS(withTrailingSlash(this.options.driver.slice(5)))
    } else if (this.options.driver.startsWith('r2://')) {
      this.instance = new R2(withoutTrailingSlash(this.options.driver.slice(5)))
      this.type = 'r2'
    } else if (this.options.driver.startsWith('s3://')) {
      this.type = 's3'
      this.instance = new S3(this.options.driver)
    } else {
      throw new Error(`Invalid storage driver: ${this.options.driver}`)
    }
  }

  put(file: StorageFile, path: string): Promise<PutResult> {
    return this.instance.put(file, path)
  }

  get(path: string): Promise<GetResult> {
    return this.instance.get(path)
  }

  stream(path: string, start?: number, end?: number): Promise<StreamResult> {
    return this.instance.stream(path, start, end)
  }

  move(from: string, to: string): Promise<MoveResult> {
    return this.instance.move(from, to)
  }

  delete(path: string): Promise<DeleteResult> {
    return this.instance.delete(path)
  }

  meta(path: string): Promise<MetaResult> {
    return this.instance.meta(path)
  }

  createMultipartUpload(path: string): Promise<CreateMultipartUploadResult> {
    return this.instance.createMultipartUpload(path)
  }

  resumeMultipartUpload(
    file: StorageFile,
    path: string,
    key: string,
    partNumber: number,
  ): Promise<ResumeMultipartUploadResult> {
    return this.instance.resumeMultipartUpload(file, path, key, partNumber)
  }

  completeMultipartUpload(path: string, key: string, parts: UploadedPart[]): Promise<CompleteMultipartUploadResult> {
    return this.instance.completeMultipartUpload(path, key, parts)
  }

  abortMultipartUpload(path: string, key: string): Promise<AbortMultipartUploadResult> {
    return this.instance.abortMultipartUpload(path, key)
  }
}
