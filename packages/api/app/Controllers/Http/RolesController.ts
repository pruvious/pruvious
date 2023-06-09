import { bind } from '@adonisjs/route-model-binding'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { uniqueArray } from '@pruvious-test/utils'
import { getStandardChoices } from 'App/model-utils'
import Role from 'App/Models/Role'
import User from 'App/Models/User'
import { deleteRole, queryRoles } from 'App/RoleQuery'
import ChoicesValidator from 'App/Validators/ChoicesValidator'
import DestroyManyValidator from 'App/Validators/DestroyManyValidator'

export default class RolesController {
  /**
   * GET: /roles
   */
  public async index({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readRoles')

    return await queryRoles()
      .fromQueryString(request.parsedUrl.search ?? '')
      .paginate()
  }

  /**
   * POST: /roles
   */
  public async store({ auth, bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createRoles')

    const data = await this.prepareData(request.all(), auth.user!)
    const result = await (queryRoles().select('*').with('*') as any)._create(data)

    if (!result.success) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }

  /**
   * GET: /roles/:id
   */
  public async show({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readRoles')

    const role = await queryRoles().select('*').with('*').where('id', params.id).first()

    if (!role) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return role
  }

  /**
   * GET: /roles/:id/users
   */
  @bind()
  public async showUsers({ bouncer }: HttpContextContract, role: Role) {
    await bouncer.with('UserPolicy').authorize('can', 'readRoles', 'readUsers')
    await role.$relation('users')

    return role.users
  }

  /**
   * PATCH: /roles/:id
   */
  public async update({ auth, bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateRoles')

    const query = queryRoles().select('*').with('*').where('id', params.id)
    const role = await query.first()

    if (!role) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    const data = await this.prepareData(request.all(), auth.user!, role.capabilities)
    const result = await query.update(data)

    if (!result[0].success) {
      return response.unprocessableEntity({ errors: result[0].errors })
    }

    return result[0].data
  }

  /**
   * DELETE: /roles/:id
   */
  public async destroy({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteRoles')

    const result = await deleteRole(params.id)

    if (!result) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return response.noContent()
  }

  /**
   * POST: /delete-roles
   */
  public async destroyMany({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteRoles')
    await request.validate(DestroyManyValidator)

    const ids: (string | number)[] = request.input('ids')
    const query = queryRoles()

    if (!ids.includes('*')) {
      query.whereIn('id', ids as any)
    }

    return (await query.delete()).length
  }

  /**
   * GET: /role-choices
   */
  public async choices({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readRoles')
    await request.validate(ChoicesValidator)

    return await getStandardChoices(queryRoles, request, response)
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

      if (data.id && +data.id === user.role) {
        delete data.capabilities
      }
    }

    return data
  }
}
