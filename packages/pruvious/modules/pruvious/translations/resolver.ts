import { kebabCase } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../debug/console'
import { resolveFromLayers } from '../utils/resolve'

type ResolvedTranslationFiles = { [domain: string]: { [language: string]: string[] } }

/**
 * Key-value object containing domain names for translatable strings and their definition import paths for each language.
 */
let translations: ResolvedTranslationFiles | undefined

/**
 * Retrieves a key-value object containing domain names for translatable strings and their definition import paths for each language.
 * It scans the `<serverDir>/<pruvious.dir.translations>` directories across all Nuxt layers and merges the translations.
 */
export function resolveTranslationFiles(): ResolvedTranslationFiles {
  if (!translations) {
    translations = {
      'pruvious-orm': {
        en: ['@pruvious/orm'],
        de: ['@pruvious/orm'],
      },
    }

    const nuxt = useNuxt()
    const languages = nuxt.options.runtimeConfig.pruvious.i18n.languages

    for (const { file, base } of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.translations ?? 'translations',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(`Resolving translations in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const baseNameParts = base.split('.')
      const domain = baseNameParts[1] ? kebabCase(baseNameParts[0]!) : 'default'
      const language = kebabCase(baseNameParts[1] ?? baseNameParts[0]!)

      if (!languages.some(({ code }) => code === language)) {
        debug(`Skipping translation <${domain}.${language}> as the language is not defined in the Nuxt configuration`)
        continue
      }

      if (!translations[domain]) {
        translations[domain] = {}
      }

      if (!translations[domain]![language]) {
        translations[domain]![language] = []
      }

      translations[domain]![language]!.unshift(file.import)

      debug(`Resolved translation \`${domain}.${language}\` in <${file.relative}>`)
    }
  }

  return translations
}

export function resetTranslationsResolver() {
  translations = undefined
}
