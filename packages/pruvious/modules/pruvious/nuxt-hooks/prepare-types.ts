import { resolvePath as _resolvePath } from 'mlly'
import { createResolver, useNuxt } from 'nuxt/kit'
import type { TSReference, VueTSConfig } from 'nuxt/schema'
import { dirname, join, relative } from 'pathe'
import { resolvePackageJSON, type TSConfig } from 'pkg-types'
import { debug } from '../debug/console'

/**
 * Optimizes `.nuxt/tsconfig.json` for `#pruvious/*` imports.
 */
export async function optimizeTsConfig(options: { references: TSReference[]; tsConfig: VueTSConfig }) {
  const nuxt = useNuxt()
  const tsConfigPath = join(nuxt.options.buildDir, 'tsconfig.json')

  debug(`Optimizing <${relative(nuxt.options.workspaceDir, tsConfigPath)}> for <#pruvious/*> imports`)

  const { tsConfig } = options
  const { resolve } = createResolver(import.meta.url)

  await resolvePruviousTSConfigPaths(tsConfig)

  tsConfig.include ||= []
  tsConfig.include.push(`${nuxt.options.runtimeConfig.pruvious.dir.build}/client`)

  tsConfig.exclude ||= []
  tsConfig.exclude.push(resolve('..'))
}

/**
 * Organizes Pruvious paths in `.nuxt/tsconfig.json`.
 */
async function resolvePruviousTSConfigPaths(tsConfig: Partial<Pick<TSConfig, 'compilerOptions'>>) {
  const nuxt = useNuxt()

  tsConfig.compilerOptions ||= {}
  tsConfig.compilerOptions.paths ||= {}
  tsConfig.compilerOptions.paths = {
    ...Object.fromEntries(
      Object.entries(tsConfig.compilerOptions.paths).filter(([path]) => path.startsWith('#pruvious/')),
    ),
    ...Object.fromEntries(
      Object.entries(tsConfig.compilerOptions.paths).filter(([path]) => !path.startsWith('#pruvious/')),
    ),
  }

  for (const pkgName of ['i18n', 'orm', 'storage', 'utils']) {
    const resolvedPath = await resolveTypePath(`@pruvious/${pkgName}`, '', nuxt.options.modulesDir)

    if (resolvedPath) {
      tsConfig.compilerOptions.paths[`@pruvious/${pkgName}`] = [`${resolvedPath}/dist`]
    }
  }
}

/**
 * @see https://github.com/nuxt/nuxt/blob/abd5cae5410dcd80dc5a9e6d408eedf9f9cead4f/packages/nuxt/src/core/utils/types.ts
 */
export async function resolveTypePath(path: string, subpath: string, searchPaths: string[]) {
  try {
    const resolvedPath = await _resolvePath(path, { url: searchPaths, conditions: ['types', 'import', 'require'] })

    if (subpath) {
      return resolvedPath.replace(/(?:\.d)?\.[mc]?[jt]s$/, '')
    }

    const rootPath = await resolvePackageJSON(resolvedPath)

    return dirname(rootPath)
  } catch {
    return null
  }
}
