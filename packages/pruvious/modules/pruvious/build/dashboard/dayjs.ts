import { useNuxt } from 'nuxt/kit'
import { resolvePruviousUtilsFile } from '../utils'

/**
 * Generates the `#pruvious/dashboard/dayjs.ts` file content.
 */
export function getDashboardDayjsFileContent() {
  const nuxt = useNuxt()

  return [
    ...(nuxt.options.runtimeConfig._tsCheckPruvious ? [] : [`// @ts-nocheck`]),
    `export { dayjsLocales, dayjs, dayjsUTC, dayjsConfig, dayjsFormatDateTime, dayjsFormatDate, dayjsFormatTime, dayjsRelative, dayjsResolveTimezone } from '${resolvePruviousUtilsFile('dashboard/dayjs')}'`,
  ].join('\n')
}
