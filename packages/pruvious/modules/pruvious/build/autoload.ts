import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../debug/console'
import { resolveFromLayers } from '../utils/resolve'

/**
 * Autoloads all build files from the `<serverDir>/<pruvious.dir.buildAutoload>` directories across all Nuxt layers.
 */
export async function autoloadBuildFiles() {
  const nuxt = useNuxt()

  for (const location of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.buildAutoload ?? 'build',
    extensions: ['js', 'mjs', 'ts'],
    beforeResolve: (layer) =>
      debug(`Resolving autoloaded build files from layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
  })) {
    const { file } = location

    await import(file.absolute)

    debug(`Autoloaded build file <${file.relative}>`)
  }
}
