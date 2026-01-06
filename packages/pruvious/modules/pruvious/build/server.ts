import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { getServerDynamicRoutesCollectionFileContent } from './server/dynamic-routes-collection'
import { getServerFieldsFileContent } from './server/fields'
import { getServerHooksFileContent } from './server/hooks'
import {
  getServerFileContent,
  getServerFileContentPatch,
  getServerTypeFileContent,
  getServerTypeFileContentPatch,
} from './server/index'

/**
 * Generates the `#pruvious/server` files.
 */
export function generateServerFiles() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build

  if (!fs.existsSync(`${buildDir}/server/blocks.ts`)) {
    fs.writeFileSync(`${buildDir}/server/blocks.ts`, 'export const blocks = {}\n')
  }

  fs.writeFileSync(`${buildDir}/server/fields.ts`, getServerFieldsFileContent() + '\n')

  fs.writeFileSync(
    `${buildDir}/server/dynamic-routes-collection.ts`,
    getServerDynamicRoutesCollectionFileContent() + '\n',
  )

  fs.writeFileSync(`${buildDir}/server/hooks.ts`, getServerHooksFileContent() + '\n')

  fs.writeFileSync(`${buildDir}/server/index.ts`, getServerFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/server/index.d.ts`, getServerTypeFileContent() + '\n')

  fs.appendFileSync(`${buildDir}/server/index.ts`, getServerFileContentPatch() + '\n')
  fs.appendFileSync(`${buildDir}/server/index.d.ts`, getServerTypeFileContentPatch() + '\n')
}
