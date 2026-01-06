import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
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

  fs.writeFileSync(`${buildDir}/app/fields.ts`, getAppFieldsFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/app/blocks.ts`, getAppBlocksFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/app/validators.ts`, getAppValidatorsFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/app/i18n.ts`, getAppI18nFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/app/hooks.ts`, getAppHooksFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/app/index.ts`, getAppFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/app/index.d.ts`, getAppTypeFileContent() + '\n')
}
