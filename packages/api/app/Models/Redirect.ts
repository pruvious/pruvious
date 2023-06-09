import { afterFetch, afterFind, BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Redirect extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public match: string

  @column({ meta: { type: 'string' } })
  public redirectTo: string

  @column()
  public isRegex: boolean

  @column()
  public isPermanent: boolean

  @column({ serializeAs: null })
  public order: number

  @afterFind()
  public static afterFind(redirect: Redirect) {
    if (typeof redirect.isRegex === 'number') {
      redirect.isRegex = !!redirect.isRegex
    }

    if (typeof redirect.isPermanent === 'number') {
      redirect.isPermanent = !!redirect.isPermanent
    }
  }

  @afterFetch()
  public static afterFetch(redirects: Redirect[]) {
    for (const redirect of redirects) {
      Redirect.afterFind(redirect)
    }
  }
}
