import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../../debug/console'
import { resolveTranslationFiles } from '../../translations/resolver'

/**
 * Generates the `#pruvious/dashboard/i18n.ts` file content.
 */
export function getDashboardI18nFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/dashboard/i18n.ts>`)

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
