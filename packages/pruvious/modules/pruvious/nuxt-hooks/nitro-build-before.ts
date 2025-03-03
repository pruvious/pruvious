import type { Nitro } from 'nitropack/types'
import fs from 'node:fs'
import { createResolver, useNuxt } from 'nuxt/kit'
import { join, relative } from 'pathe'
import type { TSConfig } from 'pkg-types'
import { debug } from '../debug/console'
import { resolveTypePath } from './prepare-types'

/**
 * Optimizes `.nuxt/tsconfig.server.json` for `#pruvious/*` imports.
 */
export async function optimizeServerTsConfig(nitro: Nitro) {
  const nuxt = useNuxt()
  const tsConfigPath = join(nuxt.options.buildDir, 'tsconfig.server.json')

  debug(`Optimizing <${relative(nuxt.options.workspaceDir, tsConfigPath)}> for <#pruvious/*> imports`)

  const { resolve } = createResolver(import.meta.url)

  nitro.options.typescript.tsConfig ||= {}

  await resolvePruviousTSConfigPaths(nitro.options.typescript.tsConfig)

  nitro.options.typescript.tsConfig.include ||= []
  nitro.options.typescript.tsConfig.include.push(`${nuxt.options.runtimeConfig.pruvious.dir.build}/server`)

  nitro.options.typescript.tsConfig.exclude ||= []
  nitro.options.typescript.tsConfig.exclude.push(resolve('..'))

  /**
   * Reorders the paths in `tsconfig.server.json` after compilation.
   * Ensures that `#pruvious/server` and `#pruvious/server/*` paths are placed first in the `paths` list.
   */
  nitro.hooks.hook('compiled', () => {
    const serverPath = relative(nuxt.options.buildDir, `${nuxt.options.runtimeConfig.pruvious.dir.build}/server`)
    const content = fs
      .readFileSync(nuxt.options.buildDir + '/tsconfig.server.json', 'utf-8')
      .replace(
        /^    "paths": {/m,
        [
          `    "paths": {`,
          `      "#pruvious/server": [`,
          `        "${serverPath}"`,
          `      ],`,
          `      "#pruvious/server/*": [`,
          `        "${serverPath}/*"`,
          `      ],`,
        ].join('\n'),
      )

    fs.writeFileSync(nuxt.options.buildDir + '/tsconfig.server.json', content)
  })
}

/**
 * Organizes Pruvious paths in `.nuxt/tsconfig.json`.
 */
async function resolvePruviousTSConfigPaths(tsConfig: Partial<Pick<TSConfig, 'compilerOptions'>>) {
  const nuxt = useNuxt()

  tsConfig.compilerOptions ||= {}
  tsConfig.compilerOptions.paths ||= {}

  delete tsConfig.compilerOptions.paths['#pruvious/client']
  delete tsConfig.compilerOptions.paths['#pruvious/client/*']
  delete tsConfig.compilerOptions.paths['#pruvious/server']
  delete tsConfig.compilerOptions.paths['#pruvious/server/*']

  for (const pkgName of ['i18n', 'orm', 'storage', 'utils']) {
    const resolvedPath = await resolveTypePath(`@pruvious/${pkgName}`, '', nuxt.options.modulesDir)

    if (resolvedPath) {
      tsConfig.compilerOptions.paths[`@pruvious/${pkgName}`] = [`${resolvedPath}/dist`]
    }
  }
}
