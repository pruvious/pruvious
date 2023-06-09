import { bind } from '@adonisjs/route-model-binding'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { nanoid, sanitizeAllowedBlocks } from '@pruvious-test/shared'
import { blocks } from 'App/imports'
import Preview from 'App/Models/Preview'
import { sanitizeAllowedPageBlocks } from 'App/PageQuery'
import { populatePage, populatePreset } from 'App/populator'
import PreviewValidator from 'App/Validators/PreviewValidator'
import { DateTime } from 'luxon'

export default class PreviewsController {
  /**
   * POST: /previews
   */
  public async store({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'accessDashboard')
    await request.validate(PreviewValidator)

    const data = request.input('data', {})
    const type = request.input('type', 'page')

    if (!Array.isArray(data.blocks)) {
      data.blocks = []
    }

    try {
      if (type === 'preset') {
        await populatePreset(data)
      } else {
        await populatePage(data)
      }

      if (type === 'page' && data.type && data.layout) {
        data.blocks = sanitizeAllowedPageBlocks(data).sanitizedBlockRecords
      } else {
        const blockNames = blocks.map((block) => block.name)
        data.blocks = sanitizeAllowedBlocks(
          data.blocks,
          blocks,
          blockNames,
          blockNames,
        ).sanitizedBlockRecords
      }
    } catch (e) {
      return response.badRequest({ message: e.toString() })
    }

    let token: string

    do {
      token = nanoid()
    } while (await Preview.findBy('token', token))

    const preview = await Preview.create({
      token,
      data,
      expiresAt: DateTime.now().plus({ hours: 4 }),
    })

    await preview.refresh()

    return preview
  }

  /**
   * GET: /previews/:token
   */
  @bind()
  public async show({ response }: HttpContextContract, preview: Preview) {
    if (preview.expiresAt < DateTime.now()) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return preview.data
  }

  /**
   * PATCH: /previews/:token
   */
  @bind()
  public async update({ bouncer, request, response }: HttpContextContract, preview: Preview) {
    await bouncer.with('UserPolicy').authorize('can', 'accessDashboard')
    await request.validate(PreviewValidator)

    const data = request.input('data', {})
    const type = request.input('type', 'page')

    if (!Array.isArray(data.blocks)) {
      data.blocks = []
    }

    try {
      if (type === 'preset') {
        await populatePreset(data)
      } else {
        await populatePage(data)
      }

      if (type === 'page' && data.type && data.layout) {
        data.blocks = sanitizeAllowedPageBlocks(data).sanitizedBlockRecords
      } else {
        const blockNames = blocks.map((block) => block.name)
        data.blocks = sanitizeAllowedBlocks(
          data.blocks,
          blocks,
          blockNames,
          blockNames,
        ).sanitizedBlockRecords
      }
    } catch (e) {
      return response.badRequest({ message: e.toString() })
    }

    preview.merge({
      data,
      expiresAt: DateTime.now().plus({ hours: 4 }),
    })

    await preview.save()
    await preview.refresh()

    return preview
  }
}
