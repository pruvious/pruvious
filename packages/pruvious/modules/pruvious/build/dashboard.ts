import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { getDashboardBaseFileContent } from './dashboard/base'
import { getDashboardDayjsFileContent } from './dashboard/dayjs'
import { getDashboardI18nFileContent } from './dashboard/i18n'
import { getDashboardFileContent, getDashboardTypeFileContent } from './dashboard/index'

/**
 * Generates the `#pruvious/dashboard` files.
 */
export function generateDashboardFiles() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build

  fs.writeFileSync(`${buildDir}/dashboard/base.ts`, getDashboardBaseFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/dashboard/i18n.ts`, getDashboardI18nFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/dashboard/index.ts`, getDashboardFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/dashboard/index.d.ts`, getDashboardTypeFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/dashboard/dayjs.ts`, getDashboardDayjsFileContent() + '\n')
}
