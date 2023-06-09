import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { uniqueArray } from '@pruvious/utils'
import { userConfig } from 'App/imports'
import { getChoices } from 'App/model-utils'
import User from 'App/Models/User'
import UserMeta from 'App/Models/UserMeta'
import { queryUsers, revokeAllAccessToken } from 'App/UserQuery'
import ChoicesValidator from 'App/Validators/ChoicesValidator'
import DestroyManyValidator from 'App/Validators/DestroyManyValidator'

export default class UsersController {
  /**
   * GET: /users
   */
  public async index({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readUsers')

    return await queryUsers()
      .fromQueryString(request.parsedUrl.search ?? '')
      .paginate()
  }

  /**
   * POST: /users
   */
  public async store({ auth, bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createUsers')

    const data = await this.prepareData(request.all(), auth.user!)
    const result = await (queryUsers().select('*').with('*') as any)._create(data)

    if (!result.success) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }

  /**
   * GET: /users/:id
   */
  public async show({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readUsers')

    const user = await queryUsers().select('*').with('*').where('id', params.id).first()

    if (!user) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return user
  }

  /**
   * PATCH: /users/:id
   */
  public async update({ auth, bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateUsers')

    const query = queryUsers().select('*').with('*').where('id', params.id)
    const user = await query.first()

    if (!user) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    const data = await this.prepareData(request.all(), auth.user!, user.capabilities)

    if (user.isAdmin && !auth.user!.isAdmin) {
      delete data.password
    }

    const result = await query.update(data)

    if (!result[0].success) {
      return response.unprocessableEntity({ errors: result[0].errors })
    }

    return result[0].data
  }

  /**
   * DELETE: /users/:id
   */
  public async destroy({ auth, bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteUsers')

    const query = queryUsers().select('isAdmin').where('id', params.id)
    const user = await query.first()

    if (!user) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    if (user.id === auth.user!.id) {
      return response.badRequest({ message: 'You cannot delete your own account' })
    }

    if (user.isAdmin && !auth.user!.isAdmin) {
      return response.forbidden({
        message: 'Administrators can only be deleted by other administrators',
      })
    }

    await query.delete()

    return response.noContent()
  }

  /**
   * POST: /delete-users
   */
  public async destroyMany({ auth, bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteUsers')
    await request.validate(DestroyManyValidator)

    const ids: (string | number)[] = request.input('ids')
    const query = queryUsers().select('isAdmin')

    if (!ids.includes('*')) {
      query.whereIn('id', ids as any)
    }

    const users = await query.all()

    for (const user of users) {
      if (user.id === auth.user!.id) {
        return response.badRequest({ message: 'You cannot delete your own account' })
      }

      if (user.isAdmin && !auth.user!.isAdmin) {
        return response.forbidden({
          message: 'Admin users can only be deleted by other admin users',
        })
      }
    }

    return (await query.delete()).length
  }

  /**
   * GET: /user-choices
   */
  public async choices({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readUsers')
    await request.validate(ChoicesValidator)

    return await getChoices(userConfig, UserMeta, queryUsers, request, response)
  }

  /**
   * POST: /users/:id/logout
   */
  public async logout({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateUsers')

    const user = await queryUsers().select('*').with('*').where('id', params.id).first()

    if (!user) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return await revokeAllAccessToken(params.id)
  }

  protected async prepareData(
    data: Record<string, any>,
    user: User,
    currentCapabilities: string[] = [],
  ): Promise<any> {
    if (!user.isAdmin) {
      const combinedCapabilities = await user.getCombinedCapabilities()

      if (data.capabilities && Array.isArray(data.capabilities)) {
        data.capabilities = data.capabilities.filter((capability: string) => {
          return combinedCapabilities.includes(capability)
        })

        currentCapabilities.forEach((capability) => {
          if (!combinedCapabilities.includes(capability)) {
            data.capabilities.push(capability)
          }
        })

        data.capabilities = uniqueArray(data.capabilities).sort()
      }

      delete data.isAdmin

      if (data.id && +data.id === user.id) {
        delete data.capabilities
      }
    } else if (data.id && +data.id === user.id) {
      delete data.isAdmin
    }

    return data
  }
}
