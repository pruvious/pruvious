import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { collectionsConfig } from 'App/imports'

export default class CollectionExistsMiddleware {
  public async handle(
    { params, request, response }: HttpContextContract,
    next: () => Promise<void>,
  ) {
    if (!collectionsConfig[params.collection]) {
      return response.notFound({ message: `E_ROUTE_NOT_FOUND: Cannot GET:${request.url()}` })
    }

    await next()
  }
}
