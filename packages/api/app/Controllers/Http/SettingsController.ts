import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { ConditionalLogic, sanitizeFields } from '@pruvious/shared'
import { settingConfigs } from 'App/imports'
import { getSetting, updateSettings } from 'App/SettingQuery'

export default class SettingsController {
  /**
   * GET: /settings
   */
  public async index({ bouncer }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'listSettings')

    return settingConfigs.map((config) => ({
      group: config.group,
      translatable: config.translatable,
      label: config.label,
      description: config.description,
      icon: config.icon,
    }))
  }

  /**
   * GET: /settings/:group
   */
  public async show({ params, request, response }: HttpContextContract) {
    const setting = await getSetting(params.group, request.input('language'))
    const settingConfig = settingConfigs.find((config) => config.group === params.group)!

    if (!setting || !settingConfig.public) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    await setting.check()

    const fields = setting.cache ? JSON.parse(setting.cache) : await setting.rebuildCache()

    if (settingConfig.onFetch) {
      await settingConfig.onFetch(fields)
    }

    return fields
  }

  /**
   * GET: /settings/:group/raw
   */
  public async showRaw({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `readSettings:${params.group}`)

    const setting = await getSetting(params.group, request.input('language'))

    if (!setting) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    await setting.check()

    return setting
  }

  /**
   * GET: /settings/:group/config
   */
  public async showConfig({ bouncer, params, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `readSettings:${params.group}`)

    const config = settingConfigs.find((config) => config.group === params.group)

    if (!config) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return config
  }

  /**
   * GET: /settings/:group/defaults
   */
  public async showDefaults({ bouncer, params, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', `readSettings:${params.group}`)

    const setting = await getSetting(params.group, request.input('language'))
    const config = settingConfigs.find((config) => config.group === params.group)

    if (!setting) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    const conditionalLogic = new ConditionalLogic({}, config!.fields, [])
    const fields = (await sanitizeFields({}, config!.fields, conditionalLogic))
      .sanitizedFieldRecords

    conditionalLogic.setRecords(fields).check()

    return { ...setting.serialize(), fields }
  }

  /**
   * PATCH: /settings/:group
   */
  public async update(ctx: HttpContextContract) {
    await ctx.bouncer.with('UserPolicy').authorize('can', `updateSettings:${ctx.params.group}`)

    const result = await updateSettings(
      ctx.params.group,
      ctx.request.input('fields'),
      ctx.request.input('language'),
    )

    if (!result) {
      return ctx.response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    if (!result.success) {
      return ctx.response.unprocessableEntity({ errors: result.errors })
    }

    return result.data
  }
}
