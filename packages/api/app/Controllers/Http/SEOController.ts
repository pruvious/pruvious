import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Sitemap from 'App/Models/Sitemap'
import { getSiteBaseUrl } from 'App/helpers'

export default class SEOController {
  /**
   * GET: /robots
   */
  public async robots({}: HttpContextContract) {
    const robots: string[] = ['User-agent: *', '']
    const sitemaps = await Sitemap.query().orderBy('index', 'asc').exec()

    for (const sitemap of sitemaps) {
      robots.push(
        `Sitemap: ${getSiteBaseUrl(true)}sitemap.xml` + (sitemap.index ? `/${sitemap.index}` : ''),
      )
    }

    if (sitemaps.length) {
      robots.push('')
    }

    return robots.join('\n')
  }

  /**
   * GET: /sitemap/:index
   */
  public async sitemap({ params, response }: HttpContextContract) {
    const sitemap = await Sitemap.findBy('index', params.index || 0)

    if (!sitemap) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return response.header('content-type', 'text/xml').send(sitemap.xml)
  }
}
