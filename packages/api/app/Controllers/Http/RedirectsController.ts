import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Redirect from 'App/Models/Redirect'
import RedirectValidator from 'App/Validators/RedirectValidator'

export default class RedirectController {
  /**
   * GET: /redirects
   */
  public async show({ bouncer }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readRedirects')
    return await Redirect.query().orderBy('order', 'asc').exec()
  }

  /**
   * PATCH: /redirects
   */
  public async update({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateRedirects')
    await request.validate(RedirectValidator)

    await Redirect.query().delete()

    for (const [i, redirect] of request.input('redirects').entries()) {
      await Redirect.create({
        match: redirect.match,
        redirectTo: redirect.redirectTo,
        isRegex: redirect.isRegex,
        isPermanent: redirect.isPermanent,
        order: i + 1,
      })
    }

    return await Redirect.query().orderBy('order', 'asc').exec()
  }
}
