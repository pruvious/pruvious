import Env from '@ioc:Adonis/Core/Env'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import {
  blocks,
  collectionsConfig,
  config,
  icons,
  pageConfig,
  presetConfig,
  roleConfig,
  uploadConfig,
  userConfig,
} from 'App/imports'
import { flush } from 'App/SettingQuery'
import { createUser, listCapabilities } from 'App/UserQuery'
import InstallValidator from 'App/Validators/InstallValidator'

export default class ConfigController {
  /**
   * GET: /config
   */
  public async config({ auth, bouncer }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'accessDashboard')

    await auth.user!.$relation('roleRelation')

    const combinedCapabilities = await auth.user!.getCombinedCapabilities()

    return {
      siteBaseUrl: Env.get('SITE_BASE_URL'),
      cms: config,
      pages: config.pages === false ? {} : pageConfig,
      presets: config.presets === false ? {} : presetConfig,
      uploads: config.uploads === false ? {} : uploadConfig,
      collections:
        auth.user!.isAdmin || combinedCapabilities.includes('listCollections')
          ? collectionsConfig
          : {},
      roles: roleConfig,
      users: userConfig,
      blocks,
      capabilities: listCapabilities(),
      me: {
        ...auth.user!.serialize(),
        combinedCapabilities,
      },
    }
  }

  /**
   * GET: /blocks
   */
  public async blocks({}: HttpContextContract) {
    return { blocks: blocks.map((block) => ({ name: block.name, label: block.label })) }
  }

  /**
   * GET: /languages
   */
  public async languages({}: HttpContextContract) {
    return {
      languages: config.languages,
      defaultLanguage: config.defaultLanguage,
    }
  }

  /**
   * POST: /flush
   */
  public async flush({ bouncer, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'clearCache')

    return (await flush())
      ? { message: 'Cache clearing started' }
      : response.accepted({ message: 'Cache clearing is already in progress' })
  }

  /**
   * POST: /install
   */
  public async install({ auth, request }: HttpContextContract) {
    await request.validate(InstallValidator)

    await createUser({
      email: request.input('email').trim(),
      password: request.input('password'),
      isAdmin: true,
    })

    const contract = await auth
      .use('api')
      .attempt(request.input('email').trim(), request.input('password'), {
        expiresIn: Env.get('OAT_EXPIRES_IN'),
      })

    return contract
  }

  /**
   * GET: /icons
   */
  public async icons({}: HttpContextContract) {
    return { icons }
  }
}
