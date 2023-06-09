import { BaseModel, column, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'

export default class Translation extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @hasMany(() => Page)
  public pages: HasMany<typeof Page>

  @hasMany(() => Preset)
  public presets: HasMany<typeof Preset>

  @hasMany(() => Post)
  public posts: HasMany<typeof Post>
}
