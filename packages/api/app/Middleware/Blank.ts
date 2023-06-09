import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'

export default class BlankMiddleware {
  public async handle({ response }: HttpContextContract, next: () => Promise<void>) {
    if ((await Database.from('users').count('id', 'count').exec())[0]['count']) {
      return response.badRequest({ message: 'The application is already installed' })
    }

    await next()
  }
}
