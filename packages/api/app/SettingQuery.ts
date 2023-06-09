import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  ConditionalLogic,
  sanitizeFields,
  UpdateResult,
  ValidationResults,
} from '@pruvious-test/shared'
import { Pruvious } from '@pruvious-test/types'
import { config, settingConfigs } from 'App/imports'
import Setting from 'App/Models/Setting'
import SettingValidator from 'App/Validators/SettingValidator'
import { prepareFieldValue } from './BaseQuery'
import { populateFields } from './populator'
import { addInternalJob } from './worker'

/**
 * Validate the inputs in the settings field from a specific `group`.
 *
 * Returns `null` if the settings `group` does not exist.
 *
 * @example
 * ```js
 * @todo
 * ```
 */
export async function validateSettingsFields<SettingsGroup extends keyof Pruvious.Settings>(
  group: SettingsGroup,
  fields: Partial<Pruvious.SettingsInput[SettingsGroup]>,
): Promise<ValidationResults | null> {
  const config = settingConfigs.find((config) => config.group === group)

  if (!config) {
    return null
  }

  try {
    return {
      success: true,
      data: await validator.validate(new SettingValidator({ fields }, config)),
    }
  } catch (e) {
    return {
      success: false,
      errors: Object.entries(e.messages).map(([field, messages]: [string, string[]]) => ({
        field,
        message: messages[0],
      })),
    }
  }
}

/**
 * Fetch settings from a specific `group`.
 *
 * To retrieve settings for a specific language, set the `language` parameter
 * to an existing language code (e.g. `'en'`, `'de'`, etc.).
 *
 * @example
 * ```js
 * await pruviousSettings('general') // Get the `general` settings
 * await pruviousSettings('strings', 'de') // Get the `strings` settings in German
 * ```
 */
export async function getSettings<SettingsGroup extends keyof Pruvious.Settings>(
  group: SettingsGroup,
  language?: Pruvious.Settings[SettingsGroup]['language'],
): Promise<Pruvious.Settings[SettingsGroup]['fields'] | null> {
  const setting = await getSetting(group, language)
  const settingConfig = settingConfigs.find((config) => config.group === group)!

  if (!setting) {
    return null
  }

  await setting.check(false)

  if (settingConfig.onRead) {
    await settingConfig.onRead(setting.fields)
  }

  await populateFields(setting.fields, settingConfig?.fields ?? [])

  if (settingConfig.onPopulate) {
    await settingConfig.onPopulate(setting.fields)
  }

  return setting.fields as any
}

/**
 * Update settings based on their `group`.
 *
 * To update settings for a specific language, set the `language` parameter
 * to an existing language code (e.g. `'en'`, `'de'`, etc.).
 *
 * Returns `null` if the settings `group` does not exist.
 *
 * @example
 * ```js
 * // Update `general` settings
 * await updateSettings('general', { title: 'Pruvious' })
 *
 * // Update German `strings` settings
 * await updateSettings('strings', { invoice: 'Rechnung' }, 'de')
 * ```
 */
export async function updateSettings<SettingsGroup extends keyof Pruvious.Settings>(
  group: SettingsGroup,
  fields: Partial<Pruvious.SettingsInput[SettingsGroup]>,
  language?: Pruvious.Settings[SettingsGroup]['language'],
): Promise<UpdateResult<Pruvious.Settings[SettingsGroup]['fields']> | null> {
  const setting = await getSetting(group, language)

  if (!setting) {
    return null
  }

  const settingConfig = settingConfigs.find((config) => config.group === group)!

  if (settingConfig.onUpdate) {
    await settingConfig.onUpdate(fields)
  }

  const mergedFields = { ...setting.fields, ...fields }
  const validationResults = (await validateSettingsFields(group, mergedFields))!

  if (validationResults.success) {
    setting.merge({ fields: prepareFieldValue(mergedFields, setting.fields) })

    await setting.save()
    await setting.check()
    await setting.refresh()
    await setting.safeRebuildRelations()
    await addInternalJob('flush', 'Setting', setting.id)

    return {
      success: true,
      data: setting.serialize() as any,
    }
  }

  return {
    success: false,
    data: setting.serialize() as any,
    errors: validationResults.errors,
  }
}

export async function getSetting(group: string, language?: string): Promise<Setting | null> {
  const settingConfig = settingConfigs.find((config) => config.group === group)

  if (settingConfig) {
    if (language && config.languages?.every((l) => l.code !== language)) {
      return null
    }

    if (!language || !settingConfig.translatable) {
      language = config.defaultLanguage
    }

    let setting = await Setting.query()
      .where('group', group)
      .andWhere('language', language!)
      .first()

    if (!setting) {
      const conditionalLogic = new ConditionalLogic({}, settingConfig.fields, [])
      const fields = (await sanitizeFields({}, settingConfig.fields, conditionalLogic))
        .sanitizedFieldRecords

      conditionalLogic.setRecords(fields).check()

      try {
        setting = await Setting.create({ language, group, fields })
      } catch (_) {
        setting = await Setting.query()
          .where('group', group)
          .andWhere('language', language!)
          .first()
      }
    }

    return setting
  }

  return null
}

/**
 * Queue a job to clear the cache for all pages and settings.
 *
 * @returns `true` if the job is added to the queue and `false` if it's already queued.
 * @alias clearCache
 */
export async function flush(): Promise<boolean> {
  const queued = (
    await Database.from('jobs').where('action', 'flushPublic').count('id', 'count').exec()
  )[0]['count']

  if (!queued) {
    await addInternalJob('flushPublic')
  }

  return !queued
}

/**
 * Queue a job to clear the cache for all pages and settings.
 *
 * @returns `true` if the job is added to the queue and `false` if it's already queued.
 * @alias flush
 */
export const clearCache = flush

/**
 * Queue a job to rebuild the sitemaps.
 *
 * @returns `true` if the job is added to the queue and `false` if it's already queued.
 */
export async function rebuildSitemap(): Promise<boolean> {
  const queued = (
    await Database.from('jobs').where('action', 'rebuildSitemap').count('id', 'count').exec()
  )[0]['count']

  if (!queued) {
    await addInternalJob('rebuildSitemap')
  }

  return !queued
}
