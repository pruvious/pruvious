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
  BlockRecord,
  ConditionalLogic,
  extractSpecialBlocks,
  extractSpecialFields,
  MetaTag,
  sanitizeBlocks,
  sanitizeFields,
  standardPageFields,
} from '@pruvious/shared'
import { uniqueArray } from '@pruvious/utils'
import { getSiteBaseUrl } from 'App/helpers'
import { blocks, pageConfig } from 'App/imports'
import { filterExistingIds, getMetaFields, initMetaFields, rebuildKeywords } from 'App/model-utils'
import PageMeta from 'App/Models/PageMeta'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Setting from 'App/Models/Setting'
import Translation from 'App/Models/Translation'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { getPage, sanitizeAllowedPageBlocks } from 'App/PageQuery'
import { getTranslations } from 'App/translations'
import { addInternalJob, worker } from 'App/worker'
import { DateTime } from 'luxon'

export default class Page extends BaseModel {
  translations: Record<string, { id: number; path: string; url: string } | null> = {}

  @column({ isPrimary: true })
  public id: number

  @column()
  public public: boolean

  @column({ meta: { type: 'string' } })
  public path: string

  @column({ meta: { type: 'string' } })
  public language: string

  @column()
  public translationId: number

  @belongsTo(() => Translation, { serializeAs: null })
  public translation: BelongsTo<typeof Translation>

  @column({ meta: { type: 'string' } })
  public title: string

  @column()
  public baseTitle: boolean

  @column({ meta: { type: 'string' } })
  public description: string

  @column()
  public visible: boolean

  @column()
  public sharingImage: number

  @column()
  public metaTags: MetaTag[]

  @column({ meta: { type: 'string' } })
  public type: string

  @column({ meta: { type: 'string' } })
  public layout: string

  @column()
  public blocks: BlockRecord[]

  @column()
  public blocksBackup: BlockRecord[] | null

  @column({ serializeAs: null })
  public cache: string | null

  @column()
  public draftToken: string

  @column.dateTime()
  public publishDate: DateTime | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public checkedAt: DateTime

  @hasMany(() => PageMeta)
  public meta: HasMany<typeof PageMeta>

  @manyToMany(() => Page, {
    pivotTable: 'page_page',
    pivotRelatedForeignKey: 'related_page_id',
    serializeAs: null,
  })
  public pages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'page_preset', serializeAs: null })
  public presets: ManyToMany<typeof Preset>

  @manyToMany(() => Post, { pivotTable: 'page_post', serializeAs: null })
  public posts: ManyToMany<typeof Post>

  @manyToMany(() => Upload, { pivotTable: 'page_upload', serializeAs: null })
  public uploads: ManyToMany<typeof Upload>

  @manyToMany(() => Role, { pivotTable: 'page_role', serializeAs: null })
  public roles: ManyToMany<typeof Role>

  @manyToMany(() => User, { pivotTable: 'page_user', serializeAs: null })
  public users: ManyToMany<typeof User>

  @manyToMany(() => Page, {
    pivotTable: 'page_page',
    pivotForeignKey: 'related_page_id',
    serializeAs: null,
  })
  public parentPages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'preset_page', serializeAs: null })
  public parentPresets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, { pivotTable: 'upload_page', serializeAs: null })
  public parentUploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, { pivotTable: 'post_page', serializeAs: null })
  public parentPosts: ManyToMany<typeof Post>

  @manyToMany(() => User, { pivotTable: 'user_page', serializeAs: null })
  public parentUsers: ManyToMany<typeof User>

  @manyToMany(() => Setting, { pivotTable: 'setting_page', serializeAs: null })
  public parentSettings: ManyToMany<typeof Setting>

  @beforeSave()
  public static async beforeSave(page: Page) {
    if (page.$isDirty) {
      page.cache = null
    }

    if (page.$dirty.public || page.$dirty.path || page.$dirty.visible) {
      await addInternalJob('rebuildSitemap')
    }

    if (page.$dirty.metaTags) {
      page.metaTags = JSON.stringify(page.metaTags) as any
    }

    if (page.$dirty.blocks) {
      page.blocks = JSON.stringify(page.blocks) as any
    }

    if (page.$dirty.blocksBackup) {
      page.blocksBackup = JSON.stringify(page.blocksBackup) as any
    }

    if (page.$dirty.publishDate) {
      try {
        page.publishDate = page.publishDate ? DateTime.fromISO(page.publishDate.toString()) : null
      } catch (_) {
        page.publishDate = null
      }
    }
  }

  @afterSave()
  public static async afterSave(page: Page) {
    await page.refresh()
  }

  @afterFind()
  public static afterFind(page: Page) {
    if (typeof page.public === 'number') {
      page.public = !!page.public
    }

    if (typeof page.baseTitle === 'number') {
      page.baseTitle = !!page.baseTitle
    }

    if (typeof page.visible === 'number') {
      page.visible = !!page.visible
    }

    if (typeof page.metaTags === 'string') {
      page.metaTags = JSON.parse(page.metaTags)
    }

    if (typeof page.blocks === 'string') {
      page.blocks = JSON.parse(page.blocks)
    }

    if (typeof page.blocksBackup === 'string') {
      page.blocksBackup = JSON.parse(page.blocksBackup)
    }
  }

  @afterFetch()
  public static afterFetch(pages: Page[]) {
    for (const page of pages) {
      Page.afterFind(page)
    }
  }

  @beforeDelete()
  public static async beforeDelete(page: Page) {
    await page.$relation('parentPages')
    await page.$relation('parentPresets')
    await page.$relation('parentUploads')
    await page.$relation('parentPosts')
    await page.$relation('parentUsers')
    await page.$relation('parentSettings')

    for (const parentPage of page.parentPages) {
      await addInternalJob('flush', 'Page', parentPage.id)
    }

    for (const preset of page.parentPresets) {
      await addInternalJob('flush', 'Preset', preset.id)
    }

    for (const upload of page.parentUploads) {
      await addInternalJob('flush', 'Upload', upload.id)
    }

    for (const post of page.parentPosts) {
      await addInternalJob('flush', 'Post', post.id)
    }

    for (const user of page.parentUsers) {
      await addInternalJob('flush', 'User', user.id)
    }

    for (const setting of page.parentSettings) {
      await addInternalJob('flush', 'Setting', setting.id)
    }

    await addInternalJob('rebuildSitemap')
  }

  async $relation(relation: ExtractModelRelations<Page> | 'draftToken' | 'url') {
    if (relation === 'draftToken') {
      return this.draftToken
    } else if (relation === 'url') {
      return getSiteBaseUrl(false) + this.path
    }

    if (!this.$preloaded[relation!]) {
      await (this as Page).load(relation)
    }

    return this[relation!]
  }

  async getMetaFields(): Promise<Record<string, any>> {
    return getMetaFields(this, pageConfig)
  }

  async check(flush: boolean = true) {
    if (worker() && worker()!.createdAt > this.checkedAt) {
      if (this.blocksBackup) {
        this.blocks = JSON.parse(JSON.stringify(this.blocksBackup))
      }

      const blocksBackup = JSON.parse(JSON.stringify(this.blocks))
      const serialized = this.serialize()
      const standardFields = standardPageFields.map((field) => [field.name, serialized[field.name]])
      const metaFields = await getMetaFields(this, pageConfig, false)
      const allFields = { ...Object.fromEntries(standardFields), ...metaFields }
      const conditionalLogic = new ConditionalLogic(
        allFields,
        [...standardPageFields, ...(pageConfig.fields ?? [])],
        blocks,
      )
      const { sanitizedFieldRecords } = await sanitizeFields(
        metaFields,
        pageConfig.fields ?? [],
        conditionalLogic,
      )
      const { sanitizedBlockRecords } = await sanitizeBlocks(this.blocks, blocks, conditionalLogic)

      if (
        JSON.stringify(blocksBackup) !== JSON.stringify(sanitizedBlockRecords) &&
        !this.blocksBackup
      ) {
        this.blocksBackup = blocksBackup
      }

      this.blocks = sanitizedBlockRecords
      this.checkedAt = DateTime.now().plus({ second: 1 })

      await this.save()
      await this.refresh()
      await initMetaFields(sanitizedFieldRecords, this, pageConfig)
      await this.safeRebuildRelations(true, false)

      if (flush) {
        await addInternalJob('flush', 'Page', this.id)
      }
    }
  }

  async safeRebuildRelations(checkIds: boolean = false, rebuildTranslations: boolean = true) {
    const metaFields = await this.getMetaFields()
    const fieldRelations = extractSpecialFields(metaFields, pageConfig.fields ?? [])
    const blockRelations = extractSpecialBlocks(this.blocks, blocks)
    const translations = await getTranslations('pages', this.id)
    const pageIds = uniqueArray([
      ...Object.keys(fieldRelations.pageIds).map(Number),
      ...Object.keys(blockRelations.pageIds).map(Number),
      ...(Object.values(translations)
        .map((translation) => translation?.id)
        .filter(Boolean) as number[]),
    ]).filter((pageId) => pageId !== this.id)
    const presetIds = uniqueArray([
      ...Object.keys(fieldRelations.presetIds).map(Number),
      ...Object.keys(blockRelations.presetIds).map(Number),
    ])
    const uploadIds = uniqueArray([
      ...Object.keys(fieldRelations.uploadIds).map(Number),
      ...Object.keys(blockRelations.uploadIds).map(Number),
      ...(this.sharingImage ? [this.sharingImage] : []),
    ])
    const postIds = uniqueArray([
      ...Object.keys(fieldRelations.postIds).map(Number),
      ...Object.keys(blockRelations.postIds).map(Number),
    ])
    const roleIds = uniqueArray([
      ...Object.keys(fieldRelations.roleIds).map(Number),
      ...Object.keys(blockRelations.roleIds).map(Number),
    ])
    const userIds = uniqueArray([
      ...Object.keys(fieldRelations.userIds).map(Number),
      ...Object.keys(blockRelations.userIds).map(Number),
    ])

    if (checkIds) {
      await filterExistingIds({ pageIds, presetIds, uploadIds, postIds, roleIds, userIds })
    }

    await (this as Page).related('pages').sync(pageIds)
    await (this as Page).related('presets').sync(presetIds)
    await (this as Page).related('uploads').sync(uploadIds)
    await (this as Page).related('posts').sync(postIds)
    await (this as Page).related('roles').sync(roleIds)
    await (this as Page).related('users').sync(userIds)

    if (rebuildTranslations) {
      for (const translation of Object.values(translations)) {
        if (translation?.id && translation.id !== this.id) {
          ;(await Page.find(translation.id))?.safeRebuildRelations(checkIds, false)
        }
      }
    }
  }

  async rebuildCache() {
    const record = await getPage(this.id, { with: ['translations', 'url'] })
    const cache = JSON.parse(JSON.stringify(record))

    cache['blocks'] = sanitizeAllowedPageBlocks(cache).sanitizedBlockRecords

    await Database.from('pages')
      .where('id', this.id)
      .update({ cache: JSON.stringify(cache) })
      .exec()

    return cache
  }

  async flush(flushed: {
    pageIds: Set<number>
    pagePaths: Set<string>
    presetIds: Set<number>
    uploadIds: Set<number>
    postIds: Set<number>
    userIds: Set<number>
    settingIds: Set<number>
    settingsGroups: Set<string>
  }) {
    if (flushed.pageIds.has(this.id)) {
      return
    }

    flushed.pageIds.add(this.id)
    flushed.pagePaths.add(this.path)

    await this.check(false)
    await Database.from('pages').where('id', this.id).update({ cache: null }).exec()
    await this.rebuildKeywords()

    await this.$relation('parentPages')
    await this.$relation('parentPresets')
    await this.$relation('parentUploads')
    await this.$relation('parentPosts')
    await this.$relation('parentUsers')
    await this.$relation('parentSettings')

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
  }

  async rebuildKeywords() {
    await rebuildKeywords(
      'pages',
      this,
      pageConfig.search!,
      standardPageFields,
      pageConfig.fields ?? [],
    )
  }
}
