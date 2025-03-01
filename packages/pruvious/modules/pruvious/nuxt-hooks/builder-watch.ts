import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import type { WatchEvent } from 'nuxt/schema'
import { join, relative } from 'pathe'
import { generateClientFiles } from '../build/client'
import { resolveCustomComponentsInFile } from '../components/resolver'
import { debug } from '../debug/console'
import { clearCachedClientHooks } from '../hooks/resolver'

/**
 * Watches Pruvious files for changes.
 */
export function watchPruviousFiles(event: WatchEvent, path: string) {
  const nuxt = useNuxt()

  for (const layer of nuxt.options._layers) {
    const collectionsDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.collections ?? 'collections')
      : null
    const singletonsDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.singletons ?? 'singletons')
      : null
    const fieldDefinitionsDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.fields?.definitions ?? 'fields')
      : null
    const fieldComponentsDir = join(layer.config.srcDir, layer.config.pruvious?.dir?.fields?.components ?? 'fields')
    const jobsDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.jobs ?? 'jobs')
      : null
    const templatesDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.templates ?? 'templates')
      : null
    const translationsDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.translations ?? 'translations')
      : null
    const apiDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.api ?? 'pruvious-api')
      : null
    const clientHooksDir = join(layer.config.srcDir, layer.config.pruvious?.dir?.hooks?.client ?? 'hooks')
    const serverHooksDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.hooks?.server ?? 'hooks')
      : null
    const clientActionsDir = join(layer.config.srcDir, layer.config.pruvious?.dir?.actions?.client ?? 'actions')
    const serverActionsDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.actions?.server ?? 'actions')
      : null
    const clientFiltersDir = join(layer.config.srcDir, layer.config.pruvious?.dir?.filters?.client ?? 'filters')
    const serverFiltersDir = layer.config.serverDir
      ? join(layer.config.serverDir, layer.config.pruvious?.dir?.filters?.server ?? 'filters')
      : null
    const sharedDir = join(layer.config.rootDir, layer.config.dir?.shared ?? 'shared')

    if (
      path.startsWith(`${clientHooksDir}/`) ||
      path.startsWith(`${clientActionsDir}/`) ||
      path.startsWith(`${clientFiltersDir}/`)
    ) {
      clearCachedClientHooks()
      generateClientFiles()
    } else if (path.startsWith(`${sharedDir}/`)) {
      resolveCustomComponentsInFile(path, layer.config.srcDir, true)
    } else if (
      (collectionsDir && path.startsWith(`${collectionsDir}/`)) ||
      (singletonsDir && path.startsWith(`${singletonsDir}/`)) ||
      (fieldDefinitionsDir && path.startsWith(`${fieldDefinitionsDir}/`)) ||
      path.startsWith(`${fieldComponentsDir}/`) ||
      (jobsDir && path.startsWith(`${jobsDir}/`)) ||
      (templatesDir && path.startsWith(`${templatesDir}/`)) ||
      (translationsDir && path.startsWith(`${translationsDir}/`)) ||
      (apiDir && path.startsWith(`${apiDir}/`)) ||
      (serverHooksDir && path.startsWith(`${serverHooksDir}/`)) ||
      (serverActionsDir && path.startsWith(`${serverActionsDir}/`)) ||
      (serverFiltersDir && path.startsWith(`${serverFiltersDir}/`))
    ) {
      // Skip newly created files
      if (event === 'add' && !fs.readFileSync(path, 'utf-8').trim()) {
        return
      }

      // Skip updates in Vue components
      if (event === 'change' && path.endsWith('.vue') && !path.startsWith(`${fieldComponentsDir}/`)) {
        // @todo `resolveCustomComponentsInFile()` if file is a block

        return
      }

      if (event === 'add' || event === 'change') {
        if (path.startsWith(`${fieldComponentsDir}/`)) {
          try {
            const clientFileContent = fs.readFileSync(
              `${nuxt.options.runtimeConfig.pruvious.dir.build}/client/index.ts`,
              'utf-8',
            )

            if (clientFileContent.includes(`import('${path}')`)) {
              return
            }
          } catch {}
        }

        try {
          const serverFileContent = fs.readFileSync(
            `${nuxt.options.runtimeConfig.pruvious.dir.build}/server/index.ts`,
            'utf-8',
          )
          const importPath = path.split('.').slice(0, -1).join('.')

          if (
            serverFileContent.includes(` from '${importPath}'`) ||
            serverFileContent.includes(`import('${importPath}')`)
          ) {
            if (
              (collectionsDir && path.startsWith(`${collectionsDir}/`)) ||
              (singletonsDir && path.startsWith(`${singletonsDir}/`)) ||
              (templatesDir && path.startsWith(`${templatesDir}/`))
            ) {
              resolveCustomComponentsInFile(path, layer.config.srcDir, true)
            }

            return
          }
        } catch {}
      }

      debug(`Restarting development server due to <${event}> event in <${relative(nuxt.options.workspaceDir, path)}>`)
      nuxt.callHook('restart')
    }
  }
}
