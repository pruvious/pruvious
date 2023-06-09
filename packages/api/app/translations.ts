import Database from '@ioc:Adonis/Lucid/Database'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Setting from 'App/Models/Setting'
import { collectionsConfig, config } from 'App/imports'
import { getSiteBaseUrl } from './helpers'

export type LanguageType = 'pages' | 'presets' | 'posts' | 'settings'

export async function getTranslations(
  type: LanguageType,
  id: number,
  model?: any,
  populate: boolean = false,
): Promise<Record<string, { id: number; path?: string; url?: string } | null>> {
  const languages: Record<string, { id: number; path?: string } | null> = {}

  if (!model) {
    const select = ['id', 'language', 'translation_id']

    if (type === 'posts') {
      select.push('collection')
    }

    if (populate && (type === 'pages' || type === 'posts')) {
      select.push('public')
    }

    model = await Database.from(type)
      .select(...select)
      .where('id', id)
      .first()
  }

  if (type === 'posts' && collectionsConfig[model.collection]?.translatable === false) {
    return {}
  }

  if (model) {
    const otherModels = await Database.from(type)
      .select('*')
      .where('translation_id', model.translation_id ?? model.translationId)
      .andWhereNot('id', model.id)
      .exec()

    config.languages!.forEach((language) => {
      if (language.code !== model.language) {
        const translatedModel = otherModels.find((otherModel) => {
          if (populate && (type === 'pages' || type === 'posts') && !otherModel.public) {
            return false
          }

          return otherModel.language === language.code
        })

        if (translatedModel) {
          const translations: any = { id: translatedModel.id }

          if (translatedModel.path !== undefined) {
            translations['path'] = translatedModel.path
            translations['url'] = getSiteBaseUrl(false) + translatedModel.path
          }

          languages[language.code] = translations
        } else {
          languages[language.code] = null
        }
      }
    })
  }

  return languages
}

export function getTranslationModel(type: LanguageType) {
  return type === 'pages' ? Page : type === 'presets' ? Preset : type === 'posts' ? Post : Setting
}
