import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { trimAll } from '@pruvious-test/utils'
import { collectionsConfig } from 'App/imports'
import { getChoices } from 'App/model-utils'
import PostMeta from 'App/Models/PostMeta'
import { deletePost, queryPosts } from 'App/PostQuery'
import ChoicesValidator from 'App/Validators/ChoicesValidator'
import DestroyManyValidator from 'App/Validators/DestroyManyValidator'

export default class PostsController {
  /**
   * GET: /collections/:collection/posts
   */
  public async index({ bouncer, params, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `readPosts:${params.collection}`)

    return await queryPosts(params.collection)
      .fromQueryString(request.parsedUrl.search ?? '')
      .with('translations')
      .paginate()
  }

  /**
   * POST: /collections/:collection/posts
   */
  public async store({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `createPosts:${params.collection}`)

    const result = await (
      queryPosts(params.collection).select('*').with('translations') as any
    )._create(request.all())

    if (!result.success) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }

  /**
   * GET: /collections/:collection/posts/:id
   */
  public async show({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `readPosts:${params.collection}`)

    const post = await queryPosts(params.collection)
      .select('*')
      .language('*')
      .with('*')
      .where('id', params.id)
      .first()

    if (!post) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return post
  }

  /**
   * PATCH: /collections/:collection/posts/:id
   */
  public async update({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `updatePosts:${params.collection}`)

    const result = await queryPosts(params.collection)
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
   * DELETE: /collections/:collection/posts/:id
   */
  public async destroy({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `deletePosts:${params.collection}`)

    const result = await deletePost(params.collection, params.id)

    if (!result) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return response.noContent()
  }

  /**
   * POST: /collections/:collection/delete-posts
   */
  public async destroyMany({ bouncer, params, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `deletePosts:${params.collection}`)
    await request.validate(DestroyManyValidator)

    const ids: (string | number)[] = request.input('ids')
    const query = queryPosts(params.collection)

    if (!ids.includes('*')) {
      query.whereIn('id', ids)
    }

    return (await query.delete()).length
  }

  /**
   * GET: /collections/:collection/post-choices
   */
  public async choices({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `readPosts:${params.collection}`)
    await request.validate(ChoicesValidator)

    return await getChoices(
      collectionsConfig[params.collection],
      PostMeta,
      queryPosts.bind(null, params.collection),
      request,
      response,
    )
  }

  protected sanitizePath(value: string): string {
    return trimAll(value === '/' ? '' : value)
      .replace(/\/\/*/g, '/')
      .replace(/\/*$/, '')
  }
}
