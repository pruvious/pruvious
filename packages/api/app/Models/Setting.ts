import Database from '@ioc:Adonis/Lucid/Database'
import {
  afterFetch,
  afterFind,
  afterSave,
  BaseModel,
  beforeSave,
  column,
  ExtractModelRelations,
  ManyToMany,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import { ConditionalLogic, extractSpecialFields, sanitizeFields } from '@pruvious-test/shared'
import { settingConfigs } from 'App/imports'
import { filterExistingIds } from 'App/model-utils'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { getSettings } from 'App/SettingQuery'
import { addInternalJob, worker } from 'App/worker'
import { DateTime } from 'luxon'

export default class Setting extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public group: string

  @column({ meta: { type: 'string' } })
  public language: string

  @column()
  public fields: Record<string, any>

  @column({ serializeAs: null })
  public cache: string | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public checkedAt: DateTime

  @manyToMany(() => Page, { pivotTable: 'setting_page' })
  public pages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'setting_preset' })
  public presets: ManyToMany<typeof Preset>

  @manyToMany(() => Post, { pivotTable: 'setting_post' })
  public posts: ManyToMany<typeof Post>

  @manyToMany(() => Upload, { pivotTable: 'setting_upload' })
  public uploads: ManyToMany<typeof Upload>

  @manyToMany(() => Role, { pivotTable: 'setting_role' })
  public roles: ManyToMany<typeof Role>

  @manyToMany(() => User, { pivotTable: 'setting_user' })
  public users: ManyToMany<typeof User>

  @beforeSave()
  public static async beforeSave(setting: Setting) {
    if (setting.$dirty.fields) {
      setting.fields = JSON.stringify(setting.fields) as any
    }
  }

  @afterSave()
  public static async afterSave(setting: Setting) {
    await setting.refresh()
  }

  @afterFind()
  public static afterFind(setting: Setting) {
    if (typeof setting.fields === 'string') {
      setting.fields = JSON.parse(setting.fields)
    }
  }

  @afterFetch()
  public static afterFetch(settings: Setting[]) {
    for (const setting of settings) {
      Setting.afterFind(setting)
    }
  }

  async $relation(relation: ExtractModelRelations<Setting>) {
    if (!this.$preloaded[relation!]) {
      await (this as Setting).load(relation)
    }

    return this[relation!]
  }

  async check(flush: boolean = true) {
    if (worker() && worker()!.createdAt > this.checkedAt) {
      const settingConfig = settingConfigs.find((config) => config.group === this.group)
      const conditionalLogic = new ConditionalLogic(this.fields, settingConfig?.fields ?? [], [])
      const { sanitizedFieldRecords } = await sanitizeFields(
        this.fields,
        settingConfig?.fields ?? [],
        conditionalLogic,
      )

      this.fields = sanitizedFieldRecords
      this.checkedAt = DateTime.now().plus({ second: 1 })

      await this.save()
      await this.refresh()
      await this.safeRebuildRelations(true)

      if (flush) {
        await addInternalJob('flush', 'Setting', this.id)
      }
    }
  }

  async safeRebuildRelations(checkIds: boolean = false) {
    const settingConfig = settingConfigs.find((config) => config.group === this.group)
    const relations = extractSpecialFields(this.fields, settingConfig?.fields ?? [])
    const pageIds = Object.keys(relations.pageIds).map(Number)
    const presetIds = Object.keys(relations.presetIds).map(Number)
    const uploadIds = Object.keys(relations.uploadIds).map(Number)
    const postIds = Object.keys(relations.postIds).map(Number)
    const roleIds = Object.keys(relations.roleIds).map(Number)
    const userIds = Object.keys(relations.userIds).map(Number)

    if (checkIds) {
      await filterExistingIds({ pageIds, presetIds, uploadIds, postIds, roleIds, userIds })
    }

    await (this as Setting).related('pages').sync(pageIds)
    await (this as Setting).related('presets').sync(presetIds)
    await (this as Setting).related('uploads').sync(uploadIds)
    await (this as Setting).related('posts').sync(postIds)
    await (this as Setting).related('roles').sync(roleIds)
    await (this as Setting).related('users').sync(userIds)
  }

  async rebuildCache() {
    const fields = await getSettings(this.group as any)
    const cache = JSON.parse(JSON.stringify(fields))

    await Database.from('settings')
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
    if (flushed.settingIds.has(this.id)) {
      return
    }

    flushed.settingIds.add(this.id)
    flushed.settingsGroups.add(this.group)

    await Database.from('settings').where('id', this.id).update({ cache: null }).exec()
  }
}
