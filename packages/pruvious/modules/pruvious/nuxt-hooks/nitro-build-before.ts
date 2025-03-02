import type { Nitro } from 'nitropack/types'
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
}

/**
 * Organizes Pruvious paths in `.nuxt/tsconfig.json`.
 */
async function resolvePruviousTSConfigPaths(tsConfig: Partial<Pick<TSConfig, 'compilerOptions'>>) {
  const nuxt = useNuxt()

  tsConfig.compilerOptions ||= {}
  tsConfig.compilerOptions.paths ||= {}
  tsConfig.compilerOptions.paths['#pruvious/server'] ??= [`${nuxt.options.runtimeConfig.pruvious.dir.build}/server`]
  tsConfig.compilerOptions.paths['#pruvious/server/*'] ??= [`${nuxt.options.runtimeConfig.pruvious.dir.build}/server/*`]
  tsConfig.compilerOptions.paths = {
    ...Object.fromEntries(
      Object.entries(tsConfig.compilerOptions.paths).filter(
        ([path]) => path.startsWith('#pruvious/') && !path.startsWith('#pruvious/client'),
      ),
    ),
    ...Object.fromEntries(
      Object.entries(tsConfig.compilerOptions.paths).filter(
        ([path]) => !path.startsWith('#pruvious/') && !path.startsWith('#pruvious/client'),
      ),
    ),
  }

  for (const pkgName of ['i18n', 'orm', 'storage', 'utils']) {
    const resolvedPath = await resolveTypePath(`@pruvious/${pkgName}`, '', nuxt.options.modulesDir)

    if (resolvedPath) {
      tsConfig.compilerOptions.paths[`@pruvious/${pkgName}`] = [`${resolvedPath}/dist`]
    }
  }
}
