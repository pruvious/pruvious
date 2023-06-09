import AdmZip from 'adm-zip'
import fs from 'fs-extra'
import path from 'path'

interface Options {
  /**
   * Maximum chunk size in bytes.
   */
  maxSize?: number

  /**
   * Base name of the generated output file.
   *
   * Defaults to the current timestamp.
   */
  baseName?: string
}

type ZipFile =
  | { type: 'path'; path: string; directory: string; size: number }
  | { type: 'buffer'; name: string; buffer: Buffer; size: number }

export class Zip {
  protected maxSize: number

  protected baseName: string

  protected files: ZipFile[] = []

  constructor(options: Options = {}) {
    this.maxSize = options.maxSize ?? 0
    this.baseName = options.baseName ?? Date.now().toString()
  }

  addFile(file: string, directory: string = ''): this {
    const localPath = path.resolve(process.cwd(), file)

    if (fs.lstatSync(localPath).isFile()) {
      this.files.push({
        type: 'path',
        path: localPath,
        directory,
        size: fs.statSync(localPath).size,
      })
    }

    return this
  }

  addFiles(files: string[], directory: string = ''): this {
    for (const file of files) {
      this.addFile(file, directory)
    }

    return this
  }

  createFile(name: string, content: string | Buffer): this {
    this.files.push({
      type: 'buffer',
      name,
      buffer: typeof content === 'string' ? Buffer.from(content, 'utf-8') : content,
      size: new Blob([content]).size,
    })

    return this
  }

  save(to: string): string[] {
    const dest = path.resolve(process.cwd(), to, this.baseName)
    const dist: string[] = []

    let zip = new AdmZip()
    let totalSize = 0
    let counter = 1

    for (const file of this.files) {
      if (this.maxSize && totalSize + file.size > this.maxSize) {
        const chunkPath = `${dest}-${counter}.zip`
        zip.writeZip(chunkPath)
        dist.push(chunkPath)
        totalSize = 0
        counter++
      } else {
        totalSize += file.size
      }

      if (file.type === 'path') {
        zip.addLocalFile(file.path, file.directory)
      } else {
        zip.addFile(file.name, file.buffer)
      }
    }

    const finalPath = counter > 1 ? `${dest}-${counter}.zip` : `${dest}.zip`

    zip.writeZip(finalPath)
    dist.push(finalPath)

    return dist
  }

  static extract(from: string, to: string, overwrite: boolean = true): string[] {
    const zip = new AdmZip(path.resolve(process.cwd(), from))

    zip.extractAllTo(path.resolve(process.cwd(), to), overwrite)

    return zip.getEntries().map((entry) => path.resolve(process.cwd(), to, entry.entryName))
  }
}
