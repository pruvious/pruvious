import Hash from '@ioc:Adonis/Core/Hash'
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
  sanitizeFields,
  standardUserFields,
} from '@pruvious-test/shared'
import { sortNatural, uniqueArray } from '@pruvious-test/utils'
import { userConfig } from 'App/imports'
import { filterExistingIds, getMetaFields, initMetaFields, rebuildKeywords } from 'App/model-utils'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Setting from 'App/Models/Setting'
import Upload from 'App/Models/Upload'
import UserMeta from 'App/Models/UserMeta'
import { addInternalJob, worker } from 'App/worker'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column({ meta: { type: 'string' } })
  public dateFormat: string

  @column({ meta: { type: 'string' } })
  public timeFormat: string

  @column()
  public role: number

  @belongsTo(() => Role, {
    foreignKey: 'role',
    onQuery(subQuery) {
      subQuery.select('id', 'name', 'capabilities')
    },
  })
  public roleRelation: BelongsTo<typeof Role>

  @column()
  public capabilities: string[]

  @column()
  public isAdmin: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public checkedAt: DateTime

  @hasMany(() => UserMeta)
  public meta: HasMany<typeof UserMeta>

  @manyToMany(() => Page, { pivotTable: 'user_page', serializeAs: null })
  public pages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'user_preset', serializeAs: null })
  public presets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, { pivotTable: 'user_upload', serializeAs: null })
  public uploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, { pivotTable: 'user_post', serializeAs: null })
  public posts: ManyToMany<typeof Post>

  @manyToMany(() => Role, { pivotTable: 'user_role', serializeAs: null })
  public roles: ManyToMany<typeof Role>

  @manyToMany(() => User, {
    pivotTable: 'user_user',
    pivotRelatedForeignKey: 'related_user_id',
    serializeAs: null,
  })
  public users: ManyToMany<typeof User>

  @manyToMany(() => Page, { pivotTable: 'page_user', serializeAs: null })
  public parentPages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'preset_user', serializeAs: null })
  public parentPresets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, { pivotTable: 'upload_user', serializeAs: null })
  public parentUploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, { pivotTable: 'post_user', serializeAs: null })
  public parentPosts: ManyToMany<typeof Post>

  @manyToMany(() => User, {
    pivotTable: 'user_user',
    pivotForeignKey: 'related_user_id',
    serializeAs: null,
  })
  public parentUsers: ManyToMany<typeof User>

  @manyToMany(() => Setting, { pivotTable: 'setting_user', serializeAs: null })
  public parentSettings: ManyToMany<typeof Setting>

  @beforeSave()
  public static async beforeSave(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }

    if (user.$dirty.capabilities) {
      user.capabilities = JSON.stringify(user.capabilities) as any
    }
  }

  @afterSave()
  public static async afterSave(user: User) {
    await user.refresh()
  }

  @afterFind()
  public static afterFind(user: User) {
    if (typeof user.capabilities === 'string') {
      user.capabilities = JSON.parse(user.capabilities)
    }

    if (typeof user.isAdmin === 'number') {
      user.isAdmin = !!user.isAdmin
    }
  }

  @afterFetch()
  public static afterFetch(users: User[]) {
    for (const user of users) {
      User.afterFind(user)
    }
  }

  @beforeDelete()
  public static async beforeDelete(user: User) {
    await user.$relation('parentPages')
    await user.$relation('parentPresets')
    await user.$relation('parentUploads')
    await user.$relation('parentPosts')
    await user.$relation('parentUsers')
    await user.$relation('parentSettings')

    for (const page of user.parentPages) {
      await addInternalJob('flush', 'Page', page.id)
    }

    for (const preset of user.parentPresets) {
      await addInternalJob('flush', 'Preset', preset.id)
    }

    for (const upload of user.parentUploads) {
      await addInternalJob('flush', 'Upload', upload.id)
    }

    for (const post of user.parentPosts) {
      await addInternalJob('flush', 'Post', post.id)
    }

    for (const parentUser of user.parentUsers) {
      await addInternalJob('flush', 'User', parentUser.id)
    }

    for (const setting of user.parentSettings) {
      await addInternalJob('flush', 'Setting', setting.id)
    }
  }

  async $relation(relation: ExtractModelRelations<User> | 'combinedCapabilities') {
    if (relation === 'combinedCapabilities') {
      return this.getCombinedCapabilities()
    }

    if (!this.$preloaded[relation!]) {
      await (this as User).load(relation)
    }

    return this[relation!]
  }

  async getMetaFields(): Promise<Record<string, any>> {
    return getMetaFields(this, userConfig)
  }

  async check(flush: boolean = true) {
    if (worker() && worker()!.createdAt > this.checkedAt) {
      const serialized = this.serialize()
      const standardFields = standardUserFields.map((field) => [field.name, serialized[field.name]])
      const metaFields = await this.getMetaFields()
      const allFields = { ...Object.fromEntries(standardFields), ...metaFields }
      const conditionalLogic = new ConditionalLogic(
        allFields,
        [...standardUserFields, ...(userConfig.fields ?? [])],
        [],
      )
      const { sanitizedFieldRecords } = await sanitizeFields(
        metaFields,
        userConfig.fields ?? [],
        conditionalLogic,
      )

      this.checkedAt = DateTime.now().plus({ second: 1 })

      await this.save()
      await this.refresh()
      await initMetaFields(sanitizedFieldRecords, this, userConfig)
      await this.safeRebuildRelations(true)

      if (flush) {
        await addInternalJob('flush', 'User', this.id)
      }
    }
  }

  async safeRebuildRelations(checkIds: boolean = false) {
    const metaFields = await getMetaFields(this, userConfig, false)
    const relations = extractSpecialFields(metaFields, userConfig.fields ?? [])
    const pageIds = Object.keys(relations.pageIds).map(Number)
    const presetIds = Object.keys(relations.presetIds).map(Number)
    const uploadIds = Object.keys(relations.uploadIds).map(Number)
    const postIds = Object.keys(relations.postIds).map(Number)
    const roleIds = Object.keys(relations.roleIds).map(Number)
    const userIds = Object.keys(relations.userIds)
      .map(Number)
      .filter((userId) => userId !== this.id)

    if (checkIds) {
      await filterExistingIds({ pageIds, presetIds, uploadIds, postIds, roleIds, userIds })
    }

    await (this as User).related('pages').sync(pageIds)
    await (this as User).related('presets').sync(presetIds)
    await (this as User).related('uploads').sync(uploadIds)
    await (this as User).related('posts').sync(postIds)
    await (this as User).related('roles').sync(roleIds)
    await (this as User).related('users').sync(userIds)
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
    if (flushed.userIds.has(this.id)) {
      return
    }

    flushed.userIds.add(this.id)

    await this.check(false)
    await this.rebuildKeywords()

    await this.$relation('parentPages')
    await this.$relation('parentPresets')
    await this.$relation('parentPosts')
    await this.$relation('parentUploads')
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
      'users',
      this,
      userConfig.search!,
      standardUserFields,
      userConfig.fields ?? [],
    )
  }

  async getCombinedCapabilities(): Promise<string[]> {
    await this.$relation('roleRelation')
    return sortNatural(
      uniqueArray([...this.capabilities, ...(this.roleRelation?.capabilities ?? [])]),
    )
  }
}
