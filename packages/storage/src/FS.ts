import { isInteger, isString, omit, randomString } from '@pruvious/utils'
import { resolve } from 'pathe'
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

export class FS implements Instance {
  constructor(protected basePath: string) {}

  async put(file: StorageFile, path: string): Promise<PutResult> {
    try {
      const { writeFile } = await import('node:fs/promises')
      const parsed = this.parseWithFullPath(path)

      await this.ensureDirectory(parsed.dir)
      await writeFile(parsed.fullPath, file)

      const meta = await this.meta(parsed.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      return { success: true, data: { ...omit(parsed, ['fullPath']), ...meta.data } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async get(path: string): Promise<GetResult> {
    try {
      const { readFile } = await import('node:fs/promises')
      const parsed = this.parseWithFullPath(path)
      const file = await readFile(parsed.fullPath)
      const meta = await this.meta(parsed.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }
      return { success: true, data: { file, ...omit(parsed, ['fullPath']), ...meta.data } }
    } catch (error: any) {
      return {
        success: false,
        error: isString(error.message) && error.message.includes('ENOENT') ? 'File not found' : error.message,
      }
    }
  }

  async stream(path: string, start?: number, end?: number): Promise<StreamResult> {
    try {
      const { createReadStream, existsSync } = await import('node:fs')
      const parsed = this.parseWithFullPath(path)
      const options: { start?: number; end?: number } = {}

      if (!existsSync(parsed.fullPath)) {
        return { success: false, error: 'File not found' }
      }

      const meta = await this.meta(path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      if (isInteger(start) && start >= 0) {
        options.start = start
        options.end = isInteger(end) && end > start ? end : meta.data.size - 1
      }

      return {
        success: true,
        data: {
          stream: createReadStream(parsed.fullPath, options),
          ...omit(parsed, ['fullPath']),
          ...meta.data,
          ...options,
        },
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async move(from: string, to: string): Promise<MoveResult> {
    try {
      const { rename } = await import('node:fs/promises')
      const parsedFrom = this.parseWithFullPath(from)
      const parsedTo = this.parseWithFullPath(to)

      await this.ensureDirectory(parsedTo.dir)
      await rename(parsedFrom.fullPath, parsedTo.fullPath)

      const meta = await this.meta(parsedTo.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      return { success: true, data: { ...omit(parsedTo, ['fullPath']), ...meta.data } }
    } catch (error: any) {
      return {
        success: false,
        error: isString(error.message) && error.message.includes('ENOENT') ? 'File not found' : error.message,
      }
    }
  }

  async delete(path: string): Promise<DeleteResult> {
    try {
      const { existsSync } = await import('node:fs')
      const { rm } = await import('node:fs/promises')
      const { fullPath } = this.parseWithFullPath(path)

      if (existsSync(fullPath)) {
        await rm(fullPath)
      }

      return { success: true, data: undefined }
    } catch (error: any) {
      return {
        success: false,
        error: isString(error.message) && error.message.includes('ENOENT') ? 'File not found' : error.message,
      }
    }
  }

  async meta(path: string): Promise<MetaResult> {
    try {
      const { stat } = await import('node:fs/promises')
      const { fullPath } = this.parseWithFullPath(path)
      const { size, ino, mtimeMs } = await stat(fullPath)
      const etag = `W/"${ino}-${size}-${mtimeMs}"`
      return { success: true, data: { size, etag } }
    } catch (error: any) {
      return {
        success: false,
        error: isString(error.message) && error.message.includes('ENOENT') ? 'File not found' : error.message,
      }
    }
  }

  async createMultipartUpload(path: string): Promise<CreateMultipartUploadResult> {
    try {
      const { writeFile } = await import('node:fs/promises')
      const parsed = this.parseWithFullPath(path)
      const key = randomString()
      const mpuPath = resolve(`${this.basePath}.multipart/${key}`)

      await this.ensureDirectory('/.multipart')
      await writeFile(mpuPath, JSON.stringify({ path: parsed.path, key, createdAt: Date.now() }, null, 2))

      return { success: true, data: { key } }
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
      const { writeFile } = await import('node:fs/promises')
      const data = await this.getMultipartUpload(path, key)
      const partPath = resolve(`${this.basePath}.multipart/${key}-parts/${partNumber}`)

      if (!data) {
        throw new Error('Multipart upload not found')
      }

      await this.ensureDirectory(`/.multipart/${key}-parts`)
      await writeFile(partPath, file)

      return { success: true, data: { partNumber, etag: `${key}-${partNumber}` } }
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
      const { createReadStream, createWriteStream } = await import('node:fs')
      const { pipeline } = await import('stream/promises')
      const { rm } = await import('node:fs/promises')
      const data = await this.getMultipartUpload(path, key)

      if (!data) {
        throw new Error('Multipart upload not found')
      }

      const parsed = this.parseWithFullPath(path)
      const mpuPath = resolve(`${this.basePath}.multipart/${key}`)
      const partsDir = `${mpuPath}-parts`
      const output = createWriteStream(parsed.fullPath, { flags: 'a' })

      for (const part of parts.sort((a, b) => a.partNumber - b.partNumber)) {
        const partPath = resolve(`${partsDir}/${part.partNumber}`)
        const input = createReadStream(partPath)
        await pipeline(input, output, { end: false })
      }

      output.end()
      const meta = await this.meta(parsed.path)

      if (!meta.success) {
        throw new Error(meta.error)
      }

      await rm(partsDir, { recursive: true }).catch(() => null)
      await rm(mpuPath).catch(() => null)

      return { success: true, data: { ...omit(parsed, ['fullPath']), ...meta.data } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async abortMultipartUpload(path: string, key: string): Promise<AbortMultipartUploadResult> {
    try {
      const { rm } = await import('node:fs/promises')
      const data = await this.getMultipartUpload(path, key)

      if (!data) {
        throw new Error('Multipart upload not found')
      }

      const parsed = this.parseWithFullPath(path)
      const mpuPath = resolve(`${this.basePath}.multipart/${key}`)
      const partsDir = `${mpuPath}-parts`

      await rm(partsDir, { recursive: true }).catch(() => null)
      await rm(mpuPath).catch(() => null)
      await rm(parsed.fullPath).catch(() => null)

      return { success: true, data: undefined }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  protected async ensureDirectory(parsedDir: string) {
    const { existsSync } = await import('node:fs')
    const { mkdir } = await import('node:fs/promises')
    const dir = resolve(this.basePath + parsedDir.slice(1))

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  protected parseWithFullPath(path: string) {
    const parsed = parsePath(path)
    return { ...parsed, fullPath: resolve(this.basePath + parsed.path.slice(1)) }
  }

  protected async getMultipartUpload(
    path: string,
    key: string,
  ): Promise<{ path: string; key: string; createdAt: number } | null> {
    try {
      const { readFile } = await import('node:fs/promises')
      const mpuPath = resolve(`${this.basePath}.multipart/${key}`)
      const data = JSON.parse(await readFile(mpuPath, 'utf-8'))
      return data.path === path && data.key === key ? data : null
    } catch {
      return null
    }
  }
}
