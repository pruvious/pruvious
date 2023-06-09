import { bind } from '@adonisjs/route-model-binding'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Directory from 'App/Models/Directory'
import { queryUploads } from 'App/UploadQuery'
import DirectoryValidator from 'App/Validators/DirectoryValidator'

export default class DirectoriesController {
  /**
   * GET: /directories
   */
  public async index({ bouncer }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')
    return await Directory.all()
  }

  /**
   * GET: /directories/root
   */
  public async indexRoot({ bouncer }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')
    return await Directory.query().whereNull('directory_id')
  }

  /**
   * POST: /directories
   */
  public async store({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createMedia')
    await request.validate(DirectoryValidator)

    const directory = await Directory.create({
      name: request.input('name'),
      directoryId: request.input('directoryId', null),
    })

    await directory.load('directories')
    await directory.load('uploads')
    await directory.refresh()

    return directory
  }

  /**
   * GET: /directories/:id
   */
  @bind()
  public async show({ bouncer }: HttpContextContract, directory: Directory) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')
    await directory.load('directories')

    const json = directory.serialize()

    json.uploads = await queryUploads().select('*').where('directoryId', directory.id).all()

    return json
  }

  /**
   * GET: /directories/:path
   */
  public async showByPath({ bouncer, params }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')
    const directory = await Directory.findByOrFail('path', decodeURIComponent(params.path))
    return directory
  }

  /**
   * PATCH: /directories/:id
   */
  @bind()
  public async update(ctx: HttpContextContract, directory: Directory) {
    await ctx.bouncer.with('UserPolicy').authorize('can', 'updateMedia')
    await ctx.request.validate(new DirectoryValidator(ctx, directory))

    directory.merge({
      name: ctx.request.input('name', directory.name),
      directoryId: ctx.request.input('directoryId', directory.directoryId),
    })

    if (directory.$isDirty) {
      await directory.save()
      await directory.resolvePathCascade()
      await directory.refresh()
    }

    return directory
  }

  /**
   * DELETE: /directories/:id
   */
  @bind()
  public async destroy({ bouncer, response }: HttpContextContract, directory: Directory) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteMedia')
    await directory.delete()

    return response.noContent()
  }
}
