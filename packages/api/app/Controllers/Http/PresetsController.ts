import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { isNumeric, trimAll } from '@pruvious/utils'
import { getStandardChoices } from 'App/model-utils'
import Preset from 'App/Models/Preset'
import { queryPages } from 'App/PageQuery'
import { deletePreset, queryPresets } from 'App/PresetQuery'
import ChoicesValidator from 'App/Validators/ChoicesValidator'
import DestroyManyValidator from 'App/Validators/DestroyManyValidator'

export default class PresetsController {
  /**
   * GET: /presets
   */
  public async index({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPresets')

    return await queryPresets()
      .fromQueryString(request.parsedUrl.search ?? '')
      .with('translations')
      .paginate()
  }

  /**
   * POST: /presets
   */
  public async store({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'createPresets')

    const result = await (queryPresets().select('*').with('translations') as any)._create(
      request.all(),
    )

    if (!result.success) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }

  /**
   * GET: /presets/:id
   */
  public async show({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPresets')

    const preset = await queryPresets()
      .select('*')
      .language('*')
      .with('*')
      .where('id', params.id)
      .first()

    if (!preset) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return preset
  }

  /**
   * GET: /presets/:id/pages
   */
  public async relatedPages({ bouncer, params, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPresets', 'readPages')

    await Preset.findOrFail(params.id)

    const pagePresets = await Database.from('page_preset').where('preset_id', params.id).exec()
    const paginationPage = request.input('page', 1)

    return await queryPages()
      .select('title')
      .language('*')
      .whereIn(
        'id',
        pagePresets.map((pagePreset) => pagePreset.page_id),
      )
      .orderBy('title', 'asc')
      .paginate(isNumeric(paginationPage) ? +paginationPage : 1)
  }

  /**
   * PATCH: /presets/:id
   */
  public async update({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updatePresets')

    const result = await queryPresets()
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
   * DELETE: /presets/:id
   */
  public async destroy({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deletePresets')

    const result = await deletePreset(params.id)

    if (!result) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return response.noContent()
  }

  /**
   * POST: /delete-presets
   */
  public async destroyMany({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deletePresets')
    await request.validate(DestroyManyValidator)

    const ids: (string | number)[] = request.input('ids')
    const query = queryPresets()

    if (!ids.includes('*')) {
      query.whereIn('id', ids as any)
    }

    return (await query.delete()).length
  }

  /**
   * GET: /preset-choices
   */
  public async choices({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'readPresets')
    await request.validate(ChoicesValidator)

    return await getStandardChoices(queryPresets, request, response)
  }

  protected sanitizePath(value: string): string {
    return trimAll(value === '/' ? '' : value)
      .replace(/\/\/*/g, '/')
      .replace(/\/*$/, '')
  }
}
