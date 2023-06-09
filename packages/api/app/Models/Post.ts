import {
  afterFetch,
  afterFind,
  afterSave,
  BaseModel,
  beforeDelete,
  beforeSave,
  belongsTo,
  BelongsTo,
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
  sanitizeFields,
  standardCollectionFields,
} from '@pruvious-test/shared'
import { uniqueArray } from '@pruvious-test/utils'
import { collectionsConfig } from 'App/imports'
import { filterExistingIds, getMetaFields, initMetaFields, rebuildKeywords } from 'App/model-utils'
import Page from 'App/Models/Page'
import PostMeta from 'App/Models/PostMeta'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Setting from 'App/Models/Setting'
import Translation from 'App/Models/Translation'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { getTranslations } from 'App/translations'
import { addInternalJob, worker } from 'App/worker'
import { DateTime } from 'luxon'

export default class Post extends BaseModel {
  translations: Record<string, { id: number } | null> = {}

  @column({ isPrimary: true })
  public id: number

  @column({ serializeAs: null })
  public collection: string

  @column()
  public public: boolean

  @column({ meta: { type: 'string' } })
  public language: string

  @column()
  public translationId: number

  @belongsTo(() => Translation, { serializeAs: null })
  public translation: BelongsTo<typeof Translation>

  @column.dateTime()
  public publishDate: DateTime | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public checkedAt: DateTime

  @hasMany(() => PostMeta)
  public meta: HasMany<typeof PostMeta>

  @manyToMany(() => Page, { pivotTable: 'post_page' })
  public pages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'post_preset' })
  public presets: ManyToMany<typeof Preset>

  @manyToMany(() => Post, {
    pivotTable: 'post_post',
    pivotRelatedForeignKey: 'related_post_id',
  })
  public posts: ManyToMany<typeof Post>

  @manyToMany(() => Upload, { pivotTable: 'post_upload' })
  public uploads: ManyToMany<typeof Upload>

  @manyToMany(() => Role, { pivotTable: 'post_role' })
  public roles: ManyToMany<typeof Role>

  @manyToMany(() => User, { pivotTable: 'post_user' })
  public users: ManyToMany<typeof User>

  @manyToMany(() => Page, { pivotTable: 'page_post' })
  public parentPages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'preset_post' })
  public parentPresets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, { pivotTable: 'upload_post' })
  public parentUploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, {
    pivotTable: 'post_post',
    pivotForeignKey: 'related_post_id',
  })
  public parentPosts: ManyToMany<typeof Post>

  @manyToMany(() => User, { pivotTable: 'user_post' })
  public parentUsers: ManyToMany<typeof User>

  @manyToMany(() => Setting, { pivotTable: 'setting_post' })
  public parentSettings: ManyToMany<typeof Setting>

  @beforeSave()
  public static async beforeSave(post: Post) {
    if (post.$dirty.publishDate) {
      try {
        post.publishDate = post.publishDate ? DateTime.fromISO(post.publishDate.toString()) : null
      } catch (_) {
        post.publishDate = null
      }
    }
  }

  @afterSave()
  public static async afterSave(post: Post) {
    await post.refresh()
  }

  @afterFind()
  public static afterFind(post: Post) {
    if (typeof post.public === 'number') {
      post.public = !!post.public
    }
  }

  @afterFetch()
  public static afterFetch(posts: Post[]) {
    for (const post of posts) {
      Post.afterFind(post)
    }
  }

  @beforeDelete()
  public static async beforeDelete(post: Post) {
    await post.$relation('parentPages')
    await post.$relation('parentPresets')
    await post.$relation('parentUploads')
    await post.$relation('parentPosts')
    await post.$relation('parentUsers')
    await post.$relation('parentSettings')

    for (const page of post.parentPages) {
      await addInternalJob('flush', 'Page', page.id)
    }

    for (const preset of post.parentPresets) {
      await addInternalJob('flush', 'Preset', preset.id)
    }

    for (const upload of post.parentUploads) {
      await addInternalJob('flush', 'Upload', upload.id)
    }

    for (const parentPost of post.parentPosts) {
      await addInternalJob('flush', 'Post', parentPost.id)
    }

    for (const user of post.parentUsers) {
      await addInternalJob('flush', 'User', user.id)
    }

    for (const setting of post.parentSettings) {
      await addInternalJob('flush', 'Setting', setting.id)
    }
  }

  async $relation(relation: ExtractModelRelations<Post>) {
    if (!this.$preloaded[relation!]) {
      await (this as Post).load(relation)
    }

    return this[relation!]
  }

  async getMetaFields(): Promise<Record<string, any>> {
    return getMetaFields(this, collectionsConfig[this.collection])
  }

  async check(flush: boolean = true) {
    if (collectionsConfig[this.collection] && worker() && worker()!.createdAt > this.checkedAt) {
      const serialized = this.serialize()
      const standardFields = standardCollectionFields.map((field) => [
        field.name,
        serialized[field.name],
      ])
      const metaFields = await this.getMetaFields()
      const allFields = { ...Object.fromEntries(standardFields), ...metaFields }
      const conditionalLogic = new ConditionalLogic(
        allFields,
        [...standardCollectionFields, ...(collectionsConfig[this.collection].fields ?? [])],
        [],
      )
      const { sanitizedFieldRecords } = await sanitizeFields(
        metaFields,
        collectionsConfig[this.collection].fields ?? [],
        conditionalLogic,
      )

      this.checkedAt = DateTime.now().plus({ second: 1 })

      await this.save()
      await this.refresh()
      await initMetaFields(sanitizedFieldRecords, this, collectionsConfig[this.collection])
      await this.safeRebuildRelations(true, false)

      if (flush) {
        await addInternalJob('flush', 'Post', this.id)
      }
    }
  }

  async safeRebuildRelations(checkIds: boolean = false, rebuildTranslations: boolean = true) {
    const metaFields = await getMetaFields(this, collectionsConfig[this.collection], false)
    const relations = extractSpecialFields(
      metaFields,
      collectionsConfig[this.collection].fields ?? [],
    )
    const translations = await getTranslations('posts', this.id)
    const pageIds = Object.keys(relations.pageIds).map(Number)
    const presetIds = Object.keys(relations.presetIds).map(Number)
    const uploadIds = Object.keys(relations.uploadIds).map(Number)
    const postIds = uniqueArray([
      ...Object.keys(relations.postIds).map(Number),
      ...(Object.values(translations)
        .map((translation) => translation?.id)
        .filter(Boolean) as number[]),
    ]).filter((postId) => postId !== this.id)
    const roleIds = Object.keys(relations.roleIds).map(Number)
    const userIds = Object.keys(relations.userIds).map(Number)

    if (checkIds) {
      await filterExistingIds({ pageIds, presetIds, uploadIds, postIds, roleIds, userIds })
    }

    await (this as Post).related('pages').sync(pageIds)
    await (this as Post).related('presets').sync(presetIds)
    await (this as Post).related('uploads').sync(uploadIds)
    await (this as Post).related('posts').sync(postIds)
    await (this as Post).related('roles').sync(roleIds)
    await (this as Post).related('users').sync(userIds)

    if (rebuildTranslations) {
      for (const translation of Object.values(translations)) {
        if (translation?.id && translation.id !== this.id) {
          ;(await Preset.find(translation.id))?.safeRebuildRelations(checkIds, false)
        }
      }
    }
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
    if (flushed.postIds.has(this.id)) {
      return
    }

    flushed.postIds.add(this.id)

    await this.check(false)
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
      'posts',
      this,
      collectionsConfig[this.collection].search!,
      standardCollectionFields,
      collectionsConfig[this.collection].fields ?? [],
    )
  }
}
