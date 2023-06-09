import { afterFind, BaseModel, beforeSave, column } from '@ioc:Adonis/Lucid/Orm'
import Page from 'App/Models/Page'
import { DateTime } from 'luxon'

export default class Preview extends BaseModel {
  public static routeLookupKey = 'token'

  @column({ isPrimary: true })
  public id: number

  @column()
  public token: string

  @column()
  public data: Page

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime()
  public expiresAt: DateTime

  @beforeSave()
  public static beforeSave(preview: Preview) {
    if (preview.$dirty.data) {
      preview.data = JSON.stringify(preview.data) as any
    }
  }

  @afterFind()
  public static afterFind(preview: Preview) {
    if (typeof preview.data === 'string') {
      preview.data = JSON.parse(preview.data)
    }
  }
}
