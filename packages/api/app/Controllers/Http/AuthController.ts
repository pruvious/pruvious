import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Auth } from 'App/UserQuery'
import LoginValidator from 'App/Validators/LoginValidator'

export default class AuthController {
  /**
   * POST: /login
   */
  public async login({ auth, bouncer, request, response }: HttpContextContract) {
    await request.validate(LoginValidator)

    try {
      return await new Auth(auth, bouncer).attemptLogin(
        request.input('email').trim(),
        request.input('password'),
        request.input('remember'),
      )
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * POST: /refresh-token
   */
  public async refreshToken({ auth, bouncer, response }: HttpContextContract) {
    try {
      return await new Auth(auth, bouncer).refreshAccessToken()
    } catch (error) {
      return response.forbidden({ message: error.message })
    }
  }

  /**
   * POST: /logout
   */
  public async logout({ auth, bouncer, response }: HttpContextContract) {
    await new Auth(auth, bouncer).revokeAccessToken()
    return response.noContent()
  }

  /**
   * POST: /logout-from-other-devices
   */
  public async logoutFromOtherDevices({ auth, bouncer }: HttpContextContract) {
    return await new Auth(auth, bouncer).logoutFromOtherDevices()
  }
}
