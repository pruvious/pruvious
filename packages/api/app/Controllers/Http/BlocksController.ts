import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { sanitizeAllowedBlocks } from '@pruvious-test/shared'
import { blocks } from 'App/imports'
import { populateBlocks } from 'App/populator'

export default class BlocksController {
  /**
   * POST: /validate-allowed-blocks
   */
  public async validateAllowedBlocks({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'accessDashboard')

    try {
      const blockRecords = request.input('blocks')

      await populateBlocks(blockRecords)

      const result = sanitizeAllowedBlocks(
        request.input('blocks'),
        blocks,
        request.input('allowedBlocks'),
        request.input('rootBlocks'),
      )

      return {
        blocks: blockRecords,
        sanitized: result.sanitizedBlockRecords,
        errors: result.errors,
      }
    } catch (e) {
      return response.badRequest({ message: e.toString() })
    }
  }
}
