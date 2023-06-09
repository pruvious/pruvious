import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import ProfileValidator from 'App/Validators/ProfileValidator'
import { addInternalJob } from 'App/worker'

export default class ProfileController {
  /**
   * PATCH: /profile
   */
  public async update({ auth, bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateProfile')
    await request.validate(ProfileValidator)

    auth.user!.merge({
      dateFormat: request.input('dateFormat', auth.user!.dateFormat),
      timeFormat: request.input('timeFormat', auth.user!.timeFormat),
    })

    if (request.input('password')) {
      auth.user!.password = request.input('password')
    }

    await auth.user!.save()
    await auth.user!.refresh()
    await addInternalJob('flush', 'User', auth.user!.id)

    return {
      ...auth.user!.serialize(),
      combinedCapabilities: await auth.user!.getCombinedCapabilities(),
    }
  }
}
