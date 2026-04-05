import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../debug/console'
import { getAppBlocksFileContent } from './app/blocks'
import { getAppFieldsFileContent } from './app/fields'
import { getAppHooksFileContent } from './app/hooks'
import { getAppI18nFileContent } from './app/i18n'
import { getAppFileContent, getAppTypeFileContent } from './app/index'
import { getAppValidatorsFileContent } from './app/validators'

/**
 * Generates the `#pruvious/app` files.
 */
export function generateAppFiles() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build
  const workspaceDir = nuxt.options.workspaceDir

  debug(`Generating <${relative(workspaceDir, buildDir)}/app/fields.ts>`)
  fs.writeFileSync(`${buildDir}/app/fields.ts`, getAppFieldsFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/app/blocks.ts>`)
  fs.writeFileSync(`${buildDir}/app/blocks.ts`, getAppBlocksFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/app/validators.ts>`)
  fs.writeFileSync(`${buildDir}/app/validators.ts`, getAppValidatorsFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/app/i18n.ts>`)
  fs.writeFileSync(`${buildDir}/app/i18n.ts`, getAppI18nFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/app/hooks.ts>`)
  fs.writeFileSync(`${buildDir}/app/hooks.ts`, getAppHooksFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/app/index.ts>`)
  fs.writeFileSync(`${buildDir}/app/index.ts`, getAppFileContent() + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/app/index.d.ts>`)
  fs.writeFileSync(`${buildDir}/app/index.d.ts`, getAppTypeFileContent() + '\n')
}
