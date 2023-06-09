import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { config } from 'App/imports'

export default class PresetsEnabledMiddleware {
  public async handle({ request, response }: HttpContextContract, next: () => Promise<void>) {
    if (config.presets === false) {
      return response.notFound({ message: `E_ROUTE_NOT_FOUND: Cannot GET:${request.url()}` })
    }

    await next()
  }
}
