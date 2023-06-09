import {
  afterFetch,
  afterFind,
  BaseModel,
  beforeDelete,
  belongsTo,
  BelongsTo,
  column,
  ExtractModelRelations,
  HasMany,
  hasMany,
} from '@ioc:Adonis/Lucid/Orm'
import Upload from 'App/Models/Upload'
import { addInternalJob } from 'App/worker'
import { DateTime } from 'luxon'

export default class Directory extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public path: string | null

  @column({ meta: { type: 'string' } })
  public name: string

  @column({ serializeAs: null })
  public directoryId: number | null

  @belongsTo(() => Directory)
  public directory: BelongsTo<typeof Directory>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @hasMany(() => Upload)
  public uploads: HasMany<typeof Upload>

  @hasMany(() => Directory)
  public directories: HasMany<typeof Directory>

  @afterFind()
  public static async afterFind(directory: Directory) {
    if (!directory.path) {
      await directory.resolvePath()
    }
  }

  @afterFetch()
  public static async afterFetch(directories: Directory[]) {
    for (const directory of directories) {
      await Directory.afterFind(directory)
    }
  }

  @beforeDelete()
  public static async beforeDelete(directory: Directory) {
    if (!directory.$preloaded.directories) {
      await directory.load('directories')
    }

    for (const nestedDirectory of directory.directories) {
      await nestedDirectory.delete()
    }

    if (!directory.$preloaded.uploads) {
      await directory.load('uploads')
    }

    for (const upload of directory.uploads) {
      await upload.delete()
    }
  }

  async $relation(relation: ExtractModelRelations<Directory>) {
    if (!this.$preloaded[relation!]) {
      await (this as Directory).load(relation)
    }

    return this[relation!]
  }

  public async resolvePath() {
    let directory: Directory | null = this
    let path: string = this.name

    do {
      if (!directory.$preloaded.directory) {
        await directory.load('directory')
      }

      directory = directory.directory

      if (directory) {
        path = `${directory.name}/${path}`
      }
    } while (directory)

    this.path = path

    if (this.$dirty.path) {
      await this.save()
    }
  }

  public async resolvePathCascade() {
    await this.resolvePath()
    await this.$relation('directories')
    await this.$relation('uploads')

    for (const nestedDirectory of this.directories) {
      await nestedDirectory.resolvePathCascade()
    }

    for (const upload of this.uploads) {
      await upload.resolvePathCascade()
      await addInternalJob('flush', 'Upload', upload.id)
    }
  }
}
