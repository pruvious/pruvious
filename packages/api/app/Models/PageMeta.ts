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
import { isObject } from '@pruvious/utils'
import Page from 'App/Models/Page'

export default class PageMeta extends BaseModel {
  public static table = 'page_meta'

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
  public pageId: number

  @belongsTo(() => Page)
  public page: BelongsTo<typeof Page>

  @beforeSave()
  public static async beforeSave(meta: PageMeta) {
    meta.json = !!meta.value && (isObject(meta.value) || Array.isArray(meta.value))

    if (meta.$dirty.value) {
      meta.value = meta.json ? JSON.stringify(meta.value) : meta.value
    }
  }

  @afterSave()
  public static async afterSave(meta: PageMeta) {
    await meta.refresh()
  }

  @afterFind()
  public static afterFind(meta: PageMeta) {
    if (meta.json && typeof meta.value === 'string') {
      meta.value = JSON.parse(meta.value)
    }
  }

  @afterFetch()
  public static afterFetch(metas: PageMeta[]) {
    for (const meta of metas) {
      PageMeta.afterFind(meta)
    }
  }
}
