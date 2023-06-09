import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class GuestMiddleware {
  public async handle({ auth, response }: HttpContextContract, next: () => Promise<void>) {
    if (auth.isLoggedIn) {
      return response.badRequest({ message: 'You are already logged in' })
    }

    await next()
  }
}
