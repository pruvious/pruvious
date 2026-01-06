import { resolvePruviousUtilsFile } from '../utils'

/**
 * Generates the `#pruvious/dashboard/dayjs.ts` file content.
 */
export function getDashboardDayjsFileContent() {
  return [
    `export { dayjsLocales, dayjs, dayjsUTC, dayjsConfig, dayjsFormatDateTime, dayjsFormatDate, dayjsFormatTime, dayjsRelative, dayjsResolveTimezone } from '${resolvePruviousUtilsFile('dashboard/dayjs')}'`,
  ].join('\n')
}
