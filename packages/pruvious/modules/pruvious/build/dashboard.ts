import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../debug/console'
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
  const workspaceDir = nuxt.options.workspaceDir

  debug(`Generating <${relative(workspaceDir, buildDir)}/dashboard/base.ts>`)
  fs.writeFileSync(`${buildDir}/dashboard/base.ts`, getDashboardBaseFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/dashboard/i18n.ts>`)
  fs.writeFileSync(`${buildDir}/dashboard/i18n.ts`, getDashboardI18nFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/dashboard/index.ts>`)
  fs.writeFileSync(`${buildDir}/dashboard/index.ts`, getDashboardFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/dashboard/index.d.ts>`)
  fs.writeFileSync(`${buildDir}/dashboard/index.d.ts`, getDashboardTypeFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/dashboard/dayjs.ts>`)
  fs.writeFileSync(`${buildDir}/dashboard/dayjs.ts`, getDashboardDayjsFileContent() + '\n')
}
