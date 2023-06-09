import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Sitemap extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public index: number

  @column()
  public xml: string
}
