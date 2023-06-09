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
  manyToMany,
  ManyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import {
  BlockRecord,
  ConditionalLogic,
  extractSpecialBlocks,
  sanitizeBlocks,
  standardPresetFields,
} from '@pruvious/shared'
import { uniqueArray } from '@pruvious/utils'
import { blocks, presetConfig } from 'App/imports'
import { filterExistingIds, rebuildKeywords } from 'App/model-utils'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Role from 'App/Models/Role'
import Translation from 'App/Models/Translation'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { getTranslations } from 'App/translations'
import { addInternalJob, worker } from 'App/worker'
import { DateTime } from 'luxon'

export default class Preset extends BaseModel {
  translations: Record<string, { id: number } | null> = {}

  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public language: string

  @column()
  public translationId: number

  @belongsTo(() => Translation, { serializeAs: null })
  public translation: BelongsTo<typeof Translation>

  @column({ meta: { type: 'string' } })
  public title: string

  @column()
  public blocks: BlockRecord[]

  @column()
  public blocksBackup: BlockRecord[] | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public checkedAt: DateTime

  @manyToMany(() => Page, { pivotTable: 'preset_page' })
  public pages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, {
    pivotTable: 'preset_preset',
    pivotRelatedForeignKey: 'related_preset_id',
  })
  public presets: ManyToMany<typeof Preset>

  @manyToMany(() => Post, { pivotTable: 'preset_post' })
  public posts: ManyToMany<typeof Post>

  @manyToMany(() => Upload, { pivotTable: 'preset_upload' })
  public uploads: ManyToMany<typeof Upload>

  @manyToMany(() => Role, { pivotTable: 'preset_role' })
  public roles: ManyToMany<typeof Role>

  @manyToMany(() => User, { pivotTable: 'preset_user' })
  public users: ManyToMany<typeof User>

  @manyToMany(() => Page, { pivotTable: 'page_preset' })
  public parentPages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, {
    pivotTable: 'preset_preset',
    pivotForeignKey: 'related_preset_id',
  })
  public parentPresets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, { pivotTable: 'upload_preset' })
  public parentUploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, { pivotTable: 'post_preset' })
  public parentPosts: ManyToMany<typeof Post>

  @manyToMany(() => User, { pivotTable: 'user_preset' })
  public parentUsers: ManyToMany<typeof User>

  @beforeSave()
  public static async beforeSave(preset: Preset) {
    if (preset.$dirty.blocks) {
      preset.blocks = JSON.stringify(preset.blocks) as any
    }

    if (preset.$dirty.blocksBackup) {
      preset.blocksBackup = JSON.stringify(preset.blocksBackup) as any
    }
  }

  @afterSave()
  public static async afterSave(preset: Preset) {
    await preset.refresh()
  }

  @afterFind()
  public static afterFind(preset: Preset) {
    if (typeof preset.blocks === 'string') {
      preset.blocks = JSON.parse(preset.blocks)
    }

    if (typeof preset.blocksBackup === 'string') {
      preset.blocksBackup = JSON.parse(preset.blocksBackup)
    }
  }

  @afterFetch()
  public static afterFetch(presets: Preset[]) {
    for (const preset of presets) {
      Preset.afterFind(preset)
    }
  }

  @beforeDelete()
  public static async beforeDelete(preset: Preset) {
    await preset.$relation('parentPages')
    await preset.$relation('parentPresets')
    await preset.$relation('parentUploads')
    await preset.$relation('parentPosts')
    await preset.$relation('parentUsers')

    for (const page of preset.parentPages) {
      await addInternalJob('flush', 'Page', page.id)
    }

    for (const parentPreset of preset.parentPresets) {
      await addInternalJob('flush', 'Preset', parentPreset.id)
    }

    for (const parentUpload of preset.parentUploads) {
      await addInternalJob('flush', 'Upload', parentUpload.id)
    }

    for (const parentPost of preset.parentPosts) {
      await addInternalJob('flush', 'Post', parentPost.id)
    }

    for (const parentUser of preset.parentUsers) {
      await addInternalJob('flush', 'User', parentUser.id)
    }
  }

  async $relation(relation: ExtractModelRelations<Preset>) {
    if (!this.$preloaded[relation!]) {
      await (this as Preset).load(relation)
    }

    return this[relation!]
  }

  async check(flush: boolean = true) {
    if (worker() && worker()!.createdAt > this.checkedAt) {
      if (this.blocksBackup) {
        this.blocks = JSON.parse(JSON.stringify(this.blocksBackup))
      }

      const blocksBackup = JSON.parse(JSON.stringify(this.blocks))
      const serialized = this.serialize()
      const standardFields = standardPresetFields.map((field) => [
        field.name,
        serialized[field.name],
      ])
      const allFields = Object.fromEntries(standardFields)
      const conditionalLogic = new ConditionalLogic(allFields, standardPresetFields, blocks)
      const { sanitizedBlockRecords } = await sanitizeBlocks(
        this.blocks,
        blocks,
        conditionalLogic,
        undefined,
        ['Preset'],
      )

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
      await this.safeRebuildRelations(true, false)

      if (flush) {
        await addInternalJob('flush', 'Preset', this.id)
      }
    }
  }

  async safeRebuildRelations(checkIds: boolean = false, rebuildTranslations: boolean = true) {
    const relations = extractSpecialBlocks(this.blocks, blocks)
    const translations = await getTranslations('presets', this.id)
    const pageIds = Object.keys(relations.pageIds).map(Number)
    const presetIds = uniqueArray([
      ...Object.keys(relations.presetIds).map(Number),
      ...(Object.values(translations)
        .map((translation) => translation?.id)
        .filter(Boolean) as number[]),
    ]).filter((presetId) => presetId !== this.id)
    const uploadIds = Object.keys(relations.uploadIds).map(Number)
    const postIds = Object.keys(relations.postIds).map(Number)
    const roleIds = Object.keys(relations.roleIds).map(Number)
    const userIds = Object.keys(relations.userIds).map(Number)

    if (checkIds) {
      await filterExistingIds({ pageIds, presetIds, uploadIds, postIds, roleIds, userIds })
    }

    await (this as Preset).related('pages').sync(pageIds)
    await (this as Preset).related('presets').sync(presetIds)
    await (this as Preset).related('uploads').sync(uploadIds)
    await (this as Preset).related('posts').sync(postIds)
    await (this as Preset).related('roles').sync(roleIds)
    await (this as Preset).related('users').sync(userIds)

    if (rebuildTranslations) {
      for (const translation of Object.values(translations)) {
        if (translation?.id && translation.id !== this.id) {
          ;(await Preset.find(translation.id))?.safeRebuildRelations(checkIds, false)
        }
      }
    }
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
    if (flushed.presetIds.has(this.id)) {
      return
    }

    flushed.presetIds.add(this.id)

    await this.check(false)
    await this.rebuildKeywords()

    await this.$relation('parentPages')
    await this.$relation('parentPresets')
    await this.$relation('parentUploads')
    await this.$relation('parentPosts')
    await this.$relation('parentUsers')

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
  }

  async rebuildKeywords() {
    await rebuildKeywords('presets', this, presetConfig.search!, standardPresetFields, [])
  }
}
