import { useNuxt } from 'nuxt/kit'
import { resolveTranslationFiles } from '../../translations/resolver'

/**
 * Generates the `#pruvious/dashboard/i18n.ts` file content.
 */
export function getDashboardI18nFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  const translationFiles = resolveTranslationFiles()
  const dashboardLanguages = Object.keys(translationFiles['pruvious-dashboard'] ?? {}).map((code) => ({
    code,
    name: new Intl.DisplayNames([code, 'en'], { type: 'language' }).of(code) ?? code,
  }))

  return [
    `/**`,
    ` * Array containing all supported languages for the dashboard interface.`,
    ` */`,
    `export const dashboardLanguages = [`,
    ...Object.values(dashboardLanguages).map(({ code, name }) => `  { code: '${code}', name: '${name}' },`),
    `] as const`,
    ``,
  ].join('\n')
}
