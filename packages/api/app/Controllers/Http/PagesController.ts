import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { trimAll } from '@pruvious-test/utils'
import { pageConfig } from 'App/imports'
import { getChoices } from 'App/model-utils'
import PageMeta from 'App/Models/PageMeta'
import { deletePage, queryPages } from 'App/PageQuery'
import ChoicesValidator from 'App/Validators/ChoicesValidator'
import DestroyManyValidator from 'App/Validators/DestroyManyValidator'

export default class PagesController {
  /**
   * GET: /pages
   */
  public async index({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPages')

    return await queryPages()
      .fromQueryString(request.parsedUrl.search ?? '')
      .with('translations')
      .paginate()
  }

  /**
   * POST: /pages
   */
  public async store({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createPages')

    const result = await (queryPages().select('*').with('translations') as any)._create(
      request.all(),
    )

    if (!result.success) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }

  /**
   * GET: /pages/:id
   */
  public async show({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPages')

    const page = await queryPages()
      .select('*')
      .language('*')
      .with('*')
      .where('id', params.id)
      .first()

    if (!page) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return page
  }

  /**
   * PATCH: /pages/:id
   */
  public async update({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updatePages')

    const result = await queryPages()
      .select('*')
      .language('*')
      .with('*')
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
   * DELETE: /pages/:id
   */
  public async destroy({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deletePages')

    const result = await deletePage(params.id)

    if (!result) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return response.noContent()
  }

  /**
   * POST: /delete-pages
   */
  public async destroyMany({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deletePages')
    await request.validate(DestroyManyValidator)

    const ids: (string | number)[] = request.input('ids')
    const query = queryPages()

    if (!ids.includes('*')) {
      query.whereIn('id', ids as any)
    }

    return (await query.delete()).length
  }

  /**
   * GET: /page-choices
   */
  public async choices({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPages')
    await request.validate(ChoicesValidator)

    return await getChoices(pageConfig, PageMeta, queryPages, request, response)
  }

  /**
   * POST: /export-pages
   */
  /*public async export({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPages')
    await request.validate(ExportValidator)

    const pages = await queryPages()
      .select('*')
      .language('*')
      .with('*')
      .whereIn('id', request.input('ids'))
      .all()

    return pages
  }*/

  /**
   * POST: /import-pages
   */
  /*public async import({ bouncer }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createpages', 'readPages', 'updatePages')
    // await request.validate(ImportValidator)
  }*/

  protected sanitizePath(value: string): string {
    return trimAll(value === '/' ? '' : value)
      .replace(/\/\/*/g, '/')
      .replace(/\/*$/, '')
  }
}
