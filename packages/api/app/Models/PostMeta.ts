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
import Post from 'App/Models/Post'

export default class PostMeta extends BaseModel {
  public static table = 'post_meta'

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
  public postId: number

  @belongsTo(() => Post)
  public post: BelongsTo<typeof Post>

  @beforeSave()
  public static async beforeSave(meta: PostMeta) {
    meta.json = !!meta.value && (isObject(meta.value) || Array.isArray(meta.value))

    if (meta.$dirty.value) {
      meta.value = meta.json ? JSON.stringify(meta.value) : meta.value
    }
  }

  @afterSave()
  public static async afterSave(meta: PostMeta) {
    await meta.refresh()
  }

  @afterFind()
  public static afterFind(meta: PostMeta) {
    if (meta.json && typeof meta.value === 'string') {
      meta.value = JSON.parse(meta.value)
    }
  }

  @afterFetch()
  public static afterFetch(metas: PostMeta[]) {
    for (const meta of metas) {
      PostMeta.afterFind(meta)
    }
  }
}
