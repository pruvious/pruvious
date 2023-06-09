import {
  afterFetch,
  afterFind,
  afterSave,
  BaseModel,
  beforeSave,
  BelongsTo,
  belongsTo,
  column,
} from '@ioc:Adonis/Lucid/Orm'
import { isObject } from '@pruvious-test/utils'
import User from 'App/Models/User'

export default class UserMeta extends BaseModel {
  public static table = 'user_meta'

  public static primaryKey = 'mid'

  @column({ isPrimary: true })
  public mid: number

  @column({ meta: { type: 'string' } })
  public key: string

  @column()
  public value: string

  @column({ serializeAs: null })
  public json: boolean

  @column()
  public userId: number

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @beforeSave()
  public static async beforeSave(meta: UserMeta) {
    meta.json = !!meta.value && (isObject(meta.value) || Array.isArray(meta.value))

    if (meta.$dirty.value) {
      meta.value = meta.json ? JSON.stringify(meta.value) : meta.value
    }
  }

  @afterSave()
  public static async afterSave(meta: UserMeta) {
    await meta.refresh()
  }

  @afterFind()
  public static afterFind(meta: UserMeta) {
    if (meta.json && typeof meta.value === 'string') {
      meta.value = JSON.parse(meta.value)
    }
  }

  @afterFetch()
  public static afterFetch(metas: UserMeta[]) {
    for (const meta of metas) {
      UserMeta.afterFind(meta)
    }
  }
}
