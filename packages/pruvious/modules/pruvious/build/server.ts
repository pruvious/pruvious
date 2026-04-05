import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../debug/console'
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
export async function generateServerFiles() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build
  const workspaceDir = nuxt.options.workspaceDir

  if (!fs.existsSync(`${buildDir}/server/blocks.ts`)) {
    fs.writeFileSync(`${buildDir}/server/blocks.ts`, 'export const blocks = {}\n')
  }

  debug(`Generating <${relative(workspaceDir, buildDir)}/server/fields.ts>`)
  fs.writeFileSync(`${buildDir}/server/fields.ts`, getServerFieldsFileContent() + '\n')

  debug(`Generating <${relative(workspaceDir, buildDir)}/server/dynamic-routes-collection.ts>`)
  fs.writeFileSync(
    `${buildDir}/server/dynamic-routes-collection.ts`,
    getServerDynamicRoutesCollectionFileContent() + '\n',
  )

  debug(`Generating <${relative(workspaceDir, buildDir)}/server/hooks.ts>`)
  fs.writeFileSync(`${buildDir}/server/hooks.ts`, getServerHooksFileContent() + '\n')

  debug(`Generating <${relative(workspaceDir, buildDir)}/server/index.ts>`)
  fs.writeFileSync(`${buildDir}/server/index.ts`, (await getServerFileContent()) + '\n')
  debug(`Generating <${relative(workspaceDir, buildDir)}/server/index.d.ts>`)
  fs.writeFileSync(`${buildDir}/server/index.d.ts`, getServerTypeFileContent() + '\n')

  fs.appendFileSync(`${buildDir}/server/index.ts`, getServerFileContentPatch() + '\n')
  fs.appendFileSync(`${buildDir}/server/index.d.ts`, getServerTypeFileContentPatch() + '\n')
}
