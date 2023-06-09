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
import Upload from 'App/Models/Upload'

export default class UploadMeta extends BaseModel {
  public static table = 'upload_meta'

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
  public uploadId: number

  @belongsTo(() => Upload)
  public upload: BelongsTo<typeof Upload>

  @beforeSave()
  public static async beforeSave(meta: UploadMeta) {
    meta.json = !!meta.value && (isObject(meta.value) || Array.isArray(meta.value))

    if (meta.$dirty.value) {
      meta.value = meta.json ? JSON.stringify(meta.value) : meta.value
    }
  }

  @afterSave()
  public static async afterSave(meta: UploadMeta) {
    await meta.refresh()
  }

  @afterFind()
  public static afterFind(meta: UploadMeta) {
    if (meta.json && typeof meta.value === 'string') {
      meta.value = JSON.parse(meta.value)
    }
  }

  @afterFetch()
  public static afterFetch(metas: UploadMeta[]) {
    for (const meta of metas) {
      UploadMeta.afterFind(meta)
    }
  }
}
