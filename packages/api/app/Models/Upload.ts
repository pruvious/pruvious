import Drive from '@ioc:Adonis/Core/Drive'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  afterFetch,
  afterFind,
  afterSave,
  BaseModel,
  beforeDelete,
  beforeSave,
  BelongsTo,
  belongsTo,
  column,
  ExtractModelRelations,
  HasMany,
  hasMany,
  ManyToMany,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import {
  ConditionalLogic,
  extractSpecialFields,
  OptimizedImage,
  OptimizedWebpImage,
  sanitizeFields,
  standardUploadFields,
} from '@pruvious/shared'
import { getBaseUploadsUrl } from 'App/helpers'
import { uploadConfig } from 'App/imports'
import { filterExistingIds, getMetaFields, initMetaFields, rebuildKeywords } from 'App/model-utils'
import Directory from 'App/Models/Directory'
import Image from 'App/Models/Image'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Setting from 'App/Models/Setting'
import UploadMeta from 'App/Models/UploadMeta'
import User from 'App/Models/User'
import { addInternalJob, worker } from 'App/worker'
import { DateTime } from 'luxon'
import path from 'path'
import sharp from 'sharp'

export default class Upload extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public path: string | null

  @column()
  public mime: string | null

  @column()
  public kind: string

  @column({ meta: { type: 'string' } })
  public name: string

  @column({ serializeAs: null })
  public directoryId: number | null

  @belongsTo(() => Directory, {
    onQuery(subQuery) {
      subQuery.select('id', 'path', 'name', 'directory_id')
    },
  })
  public directory: BelongsTo<typeof Directory>

  @column({ meta: { type: 'string' } })
  public description: string

  @column()
  public info: { format?: string; width?: number; height?: number }

  @column()
  public size: number

  @column({ serializeAs: null })
  public hash: string | null

  @column()
  public thumbnail: string | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public checkedAt: DateTime

  @hasMany(() => UploadMeta)
  public meta: HasMany<typeof UploadMeta>

  @hasMany(() => Image)
  public images: HasMany<typeof Image>

  @manyToMany(() => Page, { pivotTable: 'upload_page', serializeAs: null })
  public pages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'upload_preset', serializeAs: null })
  public presets: ManyToMany<typeof Preset>

  @manyToMany(() => Post, { pivotTable: 'upload_post', serializeAs: null })
  public posts: ManyToMany<typeof Post>

  @manyToMany(() => Upload, {
    pivotTable: 'upload_upload',
    pivotRelatedForeignKey: 'related_upload_id',
    serializeAs: null,
  })
  public uploads: ManyToMany<typeof Upload>

  @manyToMany(() => Role, { pivotTable: 'upload_role', serializeAs: null })
  public roles: ManyToMany<typeof Role>

  @manyToMany(() => User, { pivotTable: 'upload_user', serializeAs: null })
  public users: ManyToMany<typeof User>

  @manyToMany(() => Page, { pivotTable: 'page_upload' })
  public parentPages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'preset_upload' })
  public parentPresets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, {
    pivotTable: 'upload_upload',
    pivotForeignKey: 'related_upload_id',
    serializeAs: null,
  })
  public parentUploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, { pivotTable: 'post_upload' })
  public parentPosts: ManyToMany<typeof Post>

  @manyToMany(() => User, { pivotTable: 'user_upload' })
  public parentUsers: ManyToMany<typeof User>

  @manyToMany(() => Setting, { pivotTable: 'setting_upload' })
  public parentSettings: ManyToMany<typeof Setting>

  @beforeSave()
  public static beforeSave(upload: Upload) {
    if (upload.$dirty.info) {
      upload.info = JSON.stringify(upload.info) as any
    }
  }

  @afterSave()
  public static async afterSave(upload: Upload) {
    await upload.refresh()
  }

  @afterFind()
  public static async afterFind(upload: Upload) {
    if (!upload.path) {
      await upload.resolvePath()
    }

    if (typeof upload.info === 'string') {
      upload.info = JSON.parse(upload.info)
    }
  }

  @afterFetch()
  public static async afterFetch(uploads: Upload[]) {
    for (const upload of uploads) {
      await Upload.afterFind(upload)
    }
  }

  @beforeDelete()
  public static async beforeDelete(upload: Upload) {
    await upload.$relation('images')

    for (const image of upload.images) {
      await image.delete()
    }

    if (upload.path) {
      try {
        await Drive.delete(upload.path)
      } catch (_) {}
    }

    if (upload.thumbnail) {
      try {
        await Drive.delete(upload.thumbnail)
      } catch (_) {}
    }

    await upload.$relation('parentPages')
    await upload.$relation('parentPresets')
    await upload.$relation('parentUploads')
    await upload.$relation('parentPosts')
    await upload.$relation('parentUsers')
    await upload.$relation('parentSettings')

    for (const page of upload.parentPages) {
      await addInternalJob('flush', 'Page', page.id)
    }

    for (const preset of upload.parentPresets) {
      await addInternalJob('flush', 'Preset', preset.id)
    }

    for (const parentUpload of upload.parentUploads) {
      await addInternalJob('flush', 'Upload', parentUpload.id)
    }

    for (const post of upload.parentPosts) {
      await addInternalJob('flush', 'Post', post.id)
    }

    for (const user of upload.parentUsers) {
      await addInternalJob('flush', 'User', user.id)
    }

    for (const setting of upload.parentSettings) {
      await addInternalJob('flush', 'Setting', setting.id)
    }
  }

  async $relation(relation: ExtractModelRelations<Upload> | 'url') {
    if (relation === 'url') {
      return getBaseUploadsUrl() + this.path
    }

    if (!this.$preloaded[relation!]) {
      await (this as Upload).load(relation)
    }

    return this[relation!]
  }

  public async resolvePath() {
    await this.$relation('directory')

    let newPath: string

    if (this.directory) {
      if (!this.directory.path) {
        await this.directory.resolvePath()
      }

      newPath = `${this.directory.path}/${this.name}`
    } else {
      newPath = this.name
    }

    if (this.path !== newPath) {
      if (this.path) {
        try {
          await Drive.move(this.path, newPath, { cacheControl: 'max-age=2592000' })
        } catch (_) {}
      }

      if (this.thumbnail) {
        const newThumbnailPath = await this.generateThumbnailPath()

        try {
          await Drive.move(this.thumbnail, newThumbnailPath, { cacheControl: 'max-age=2592000' })
        } catch (_) {}

        this.thumbnail = newThumbnailPath
      }

      this.path = newPath
      await this.save()
    }
  }

  public async resolvePathCascade() {
    await this.resolvePath()
    await this.$relation('images')

    for (const image of this.images) {
      await image.resolvePath()
    }
  }

  public async generateThumbnail(tmpPath?: string) {
    if (
      this.path &&
      tmpPath &&
      this.kind === 'image' &&
      this.info &&
      this.info['format'] !== 'svg'
    ) {
      try {
        const sharpImage = sharp(tmpPath).resize({
          width: 320,
          height: 320,
          withoutEnlargement: true,
        })
        this.thumbnail = await this.generateThumbnailPath()
        await Drive.put(this.thumbnail, await sharpImage.toBuffer(), {
          cacheControl: 'max-age=2592000',
        })
        await this.save()
      } catch (_) {}
    }
  }

  public async generateThumbnailPath() {
    const baseName = path.basename(this.name)
    const extension = path.extname(this.name)
    await this.$relation('directory')
    return `${this.directory ? this.directory.path + '/' : ''}${baseName}--o--thumbnail${extension}`
  }

  async getMetaFields(): Promise<Record<string, any>> {
    return getMetaFields(this, uploadConfig)
  }

  async check(flush: boolean = true) {
    if (worker() && worker()!.createdAt > this.checkedAt) {
      const serialized = this.serialize()
      const standardFields = standardUploadFields.map((field) => [
        field.name,
        serialized[field.name],
      ])
      const metaFields = await this.getMetaFields()
      const allFields = { ...Object.fromEntries(standardFields), ...metaFields }
      const conditionalLogic = new ConditionalLogic(
        allFields,
        [...standardUploadFields, ...(uploadConfig.fields ?? [])],
        [],
      )
      const { sanitizedFieldRecords } = await sanitizeFields(
        metaFields,
        uploadConfig.fields ?? [],
        conditionalLogic,
      )

      this.checkedAt = DateTime.now().plus({ second: 1 })

      await this.save()
      await this.refresh()
      await initMetaFields(sanitizedFieldRecords, this, uploadConfig)
      await this.safeRebuildRelations(true)

      if (flush) {
        await addInternalJob('flush', 'Upload', this.id)
      }
    }
  }

  async safeRebuildRelations(checkIds: boolean = false) {
    const metaFields = await getMetaFields(this, uploadConfig, false)
    const relations = extractSpecialFields(metaFields, uploadConfig.fields ?? [])
    const pageIds = Object.keys(relations.pageIds).map(Number)
    const presetIds = Object.keys(relations.presetIds).map(Number)
    const uploadIds = Object.keys(relations.uploadIds)
      .map(Number)
      .filter((uploadId) => uploadId !== this.id)
    const postIds = Object.keys(relations.postIds).map(Number)
    const roleIds = Object.keys(relations.roleIds).map(Number)
    const userIds = Object.keys(relations.userIds).map(Number)

    if (checkIds) {
      await filterExistingIds({ pageIds, presetIds, uploadIds, postIds, roleIds, userIds })
    }

    await (this as Upload).related('pages').sync(pageIds)
    await (this as Upload).related('presets').sync(presetIds)
    await (this as Upload).related('uploads').sync(uploadIds)
    await (this as Upload).related('posts').sync(postIds)
    await (this as Upload).related('roles').sync(roleIds)
    await (this as Upload).related('users').sync(userIds)
  }

  public async flush(flushed: {
    pageIds: Set<number>
    pagePaths: Set<string>
    presetIds: Set<number>
    uploadIds: Set<number>
    postIds: Set<number>
    userIds: Set<number>
    settingIds: Set<number>
    settingsGroups: Set<string>
  }) {
    if (flushed.uploadIds.has(this.id)) {
      return
    }

    flushed.uploadIds.add(this.id)

    await this.check(false)
    await this.rebuildKeywords()

    await this.$relation('parentPages')
    await this.$relation('parentPresets')
    await this.$relation('parentPosts')
    await this.$relation('parentUploads')
    await this.$relation('parentUsers')
    await this.$relation('parentSettings')
    await this.$relation('images')

    for (const page of this.parentPages) {
      await page.flush(flushed)
    }

    for (const preset of this.parentPresets) {
      await preset.flush(flushed)
    }

    for (const upload of this.parentUploads) {
      await upload.flush(flushed)
    }

    for (const post of this.parentPosts) {
      await post.flush(flushed)
    }

    for (const user of this.parentUsers) {
      await user.flush(flushed)
    }

    for (const setting of this.parentSettings) {
      await setting.flush(flushed)
    }

    for (const image of this.images) {
      if (
        image.path &&
        ((!(await Drive.exists(image.path)) &&
          image.createdAt.diffNow('seconds').toObject().seconds! < -20) ||
          this.images.some((_image) => image.path === _image.path && image.id < _image.id))
      ) {
        await Database.from('images').where('id', image.id).delete()
      }
    }
  }

  async rebuildKeywords() {
    await rebuildKeywords(
      'uploads',
      this,
      uploadConfig.search!,
      standardUploadFields,
      uploadConfig.fields ?? [],
    )
  }

  public async getImage(optimization: OptimizedImage) {
    await this.$relation('images')

    return this.images.find((image) => {
      const match =
        image.format === (optimization.format ?? null) &&
        image.width === (optimization.width ?? null) &&
        image.height === (optimization.height ?? null) &&
        image.resize === (optimization.resize ?? null) &&
        image.position === (optimization.position ?? null) &&
        image.interpolation === (optimization.interpolation ?? null) &&
        image.quality === (optimization.quality ?? null)

      if (optimization.format === 'webp') {
        return (
          match &&
          image.alphaQuality === (optimization.alphaQuality ?? null) &&
          image.lossless === (optimization.lossless ?? null) &&
          image.nearLossless === (optimization.nearLossless ?? null) &&
          image.smartSubsample === (optimization.smartSubsample ?? null)
        )
      }

      return match
    })
  }

  public async createImage(optimization: OptimizedImage) {
    const image = await (this as Upload).related('images').create({
      format: optimization.format,
      width: optimization.width,
      height: optimization.height,
      resize: optimization.resize,
      position: optimization.position,
      interpolation: optimization.interpolation,
      quality: optimization.quality,
      alphaQuality: (optimization as OptimizedWebpImage).alphaQuality,
      lossless: (optimization as OptimizedWebpImage).lossless,
      nearLossless: (optimization as OptimizedWebpImage).nearLossless,
      smartSubsample: (optimization as OptimizedWebpImage).smartSubsample,
      info: {},
    })

    await addInternalJob('flush', 'Upload', this.id)

    return image
  }
}
