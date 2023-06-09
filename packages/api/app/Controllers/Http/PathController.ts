import Env from '@ioc:Adonis/Core/Env'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Page from 'App/Models/Page'
import Preview from 'App/Models/Preview'
import { pageConfig, redirects } from 'App/imports'
import { DateTime } from 'luxon'

export default class PathController {
  /**
   * GET: /path/:path
   */
  public async show({ auth, request, response, params }: HttpContextContract) {
    const previewToken = request.input('__p')

    if (previewToken) {
      const preview = await Preview.findByOrFail('token', previewToken)

      if (preview.expiresAt < DateTime.now()) {
        return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
      }

      return preview.data
    }

    let path = '/' + ((params['*'] ?? []).join('/') ?? '')

    for (const redirect of redirects) {
      let redirectTo: string | undefined

      if (typeof redirect.match === 'string') {
        if (redirect.match === path) {
          redirectTo = redirect.redirectTo
        }
      } else {
        const match = redirect.match.exec(path)

        if (match) {
          redirectTo = redirect.redirectTo.replace(/\$([1-9][0-9]*)/g, (_, i) => match[+i] ?? '')
        }
      }

      if (redirectTo) {
        const resolvedRedirectTo = redirect.external
          ? redirectTo
          : redirectTo + (Env.get('TRAILING_SLASH') && !redirectTo.endsWith('/') ? '/' : '')

        return redirect.isPermanent
          ? response.movedPermanently({ redirectTo: resolvedRedirectTo, redirectCode: 301 })
          : response.temporaryRedirect({ redirectTo: resolvedRedirectTo, redirectCode: 307 })
      }
    }

    const page = await Page.findByOrFail('path', path)

    if (!auth.user && !page.public) {
      const draftToken = request.input('__d')

      if (draftToken !== page.draftToken) {
        return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
      }
    }

    await page.check()

    const data = page.cache ? JSON.parse(page.cache) : await page.rebuildCache()

    if (pageConfig.onFetch) {
      await pageConfig.onFetch(data)
    }

    return data
  }
}
