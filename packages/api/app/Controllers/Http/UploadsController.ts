import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { parseQueryString } from '@pruvious-test/shared'
import { getStandardChoices } from 'App/model-utils'
import { deleteUpload, queryUploads } from 'App/UploadQuery'
import ChoicesValidator from 'App/Validators/ChoicesValidator'

export default class UploadsController {
  /**
   * GET: /uploads
   */
  public async index({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')

    return await queryUploads()
      .fromQueryString(request.parsedUrl.search ?? '')
      .paginate()
  }

  /**
   * GET: /all-uploads
   */
  public async all({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')

    const { params } = parseQueryString(request.parsedUrl.search ?? '')

    if (Object.keys(params).length) {
      return await queryUploads(params as any)
        .select('*')
        .with('directory')
        .all()
    }

    return await queryUploads().select('*').with('directory').whereNull('directoryId').all()
  }

  /**
   * POST: /uploads
   */
  public async store({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createMedia')

    const result = await (queryUploads().select('*').with('directory') as any)._create(
      request.file('file'),
      request.all(),
    )

    if (!result.success) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }

  /**
   * GET: /uploads/:id
   */
  public async show({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')

    const upload = await queryUploads().select('*').with('directory').where('id', params.id).first()

    if (!upload) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    if (upload.directory) {
      ;(upload.directory as any).uploads = await queryUploads()
        .select('*')
        .where('directoryId', upload.directory.id)
        .all()
    }

    return upload
  }

  /**
   * PATCH: /uploads/:id
   */
  public async update({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateMedia')

    const result = await queryUploads()
      .select('*')
      .with('directory')
      .where('id', params.id)
      .update(request.all())

    if (!result.length) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    if (!result[0].success) {
      return response.unprocessableEntity({ errors: result[0].errors })
    }

    return result[0].data
  }

  /**
   * DELETE: /uploads/:id
   */
  public async destroy({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteMedia')

    const result = await deleteUpload(params.id)

    if (!result) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return response.noContent()
  }

  /**
   * GET: /upload-choices
   */
  public async choices({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readMedia')
    await request.validate(ChoicesValidator)

    return await getStandardChoices(queryUploads, request, response)
  }
}
