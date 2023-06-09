import { string } from '@ioc:Adonis/Core/Helpers'
import { BaseModel, SnakeCaseNamingStrategy } from '@ioc:Adonis/Lucid/Orm'

export class CamelCaseNamingStrategy extends SnakeCaseNamingStrategy {
  public serializedName(_model: typeof BaseModel, propertyName: string) {
    return string.camelCase(propertyName)
  }

  public paginationMetaKeys() {
    return {
      total: 'total',
      perPage: 'perPage',
      currentPage: 'currentPage',
      lastPage: 'lastPage',
      firstPage: 'firstPage',
      firstPageUrl: 'firstPageURL',
      lastPageUrl: 'lastPageURL',
      nextPageUrl: 'nextPageURL',
      previousPageUrl: 'previousPageURL',
    }
  }
}
