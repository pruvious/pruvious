import {
  afterFetch,
  afterFind,
  afterSave,
  BaseModel,
  beforeDelete,
  beforeSave,
  column,
  ExtractModelRelations,
  HasMany,
  hasMany,
  manyToMany,
  ManyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import { standardRoleFields } from '@pruvious-test/shared'
import { roleConfig } from 'App/imports'
import { rebuildKeywords } from 'App/model-utils'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Setting from 'App/Models/Setting'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { addInternalJob } from 'App/worker'
import { DateTime } from 'luxon'

export default class Role extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public name: string

  @column()
  public capabilities: string[]

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @hasMany(() => User, {
    foreignKey: 'role',
    onQuery(subQuery) {
      subQuery.select('id', 'email')
    },
  })
  public users: HasMany<typeof User>

  @manyToMany(() => Page, { pivotTable: 'page_role', serializeAs: null })
  public parentPages: ManyToMany<typeof Page>

  @manyToMany(() => Preset, { pivotTable: 'preset_role', serializeAs: null })
  public parentPresets: ManyToMany<typeof Preset>

  @manyToMany(() => Upload, { pivotTable: 'upload_role', serializeAs: null })
  public parentUploads: ManyToMany<typeof Upload>

  @manyToMany(() => Post, { pivotTable: 'post_role', serializeAs: null })
  public parentPosts: ManyToMany<typeof Post>

  @manyToMany(() => User, { pivotTable: 'user_role', serializeAs: null })
  public parentUsers: ManyToMany<typeof User>

  @manyToMany(() => Setting, { pivotTable: 'setting_role', serializeAs: null })
  public parentSettings: ManyToMany<typeof Setting>

  @beforeSave()
  public static async beforeSave(role: Role) {
    if (role.$dirty.capabilities) {
      role.capabilities = JSON.stringify(role.capabilities) as any
    }
  }

  @afterSave()
  public static async afterSave(role: Role) {
    await role.refresh()
  }

  @afterFind()
  public static afterFind(role: Role) {
    if (typeof role.capabilities === 'string') {
      role.capabilities = JSON.parse(role.capabilities)
    }
  }

  @afterFetch()
  public static afterFetch(roles: Role[]) {
    for (const role of roles) {
      Role.afterFind(role)
    }
  }

  @beforeDelete()
  public static async beforeDelete(role: Role) {
    await role.$relation('parentPages')
    await role.$relation('parentPresets')
    await role.$relation('parentUploads')
    await role.$relation('parentPosts')
    await role.$relation('users')
    await role.$relation('parentUsers')
    await role.$relation('parentSettings')

    for (const page of role.parentPages) {
      await addInternalJob('flush', 'Page', page.id)
    }

    for (const preset of role.parentPresets) {
      await addInternalJob('flush', 'Preset', preset.id)
    }

    for (const upload of role.parentUploads) {
      await addInternalJob('flush', 'Upload', upload.id)
    }

    for (const post of role.parentPosts) {
      await addInternalJob('flush', 'Post', post.id)
    }

    for (const user of role.users) {
      await addInternalJob('flush', 'User', user.id)
    }

    for (const user of role.parentUsers) {
      await addInternalJob('flush', 'User', user.id)
    }

    for (const setting of role.parentSettings) {
      await addInternalJob('flush', 'Setting', setting.id)
    }
  }

  async $relation(relation: ExtractModelRelations<Role>) {
    if (!this.$preloaded[relation!]) {
      await (this as Role).load(relation)
    }

    return this[relation!]
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
    await this.rebuildKeywords()

    await this.$relation('parentPages')
    await this.$relation('parentPresets')
    await this.$relation('parentPosts')
    await this.$relation('parentUploads')
    await this.$relation('users')
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

    for (const user of this.users) {
      await user.flush(flushed)
    }

    for (const user of this.parentUsers) {
      await user.flush(flushed)
    }

    for (const setting of this.parentSettings) {
      await setting.flush(flushed)
    }
  }

  async rebuildKeywords() {
    await rebuildKeywords('roles', this, roleConfig.search!, standardRoleFields, [])
  }
}
