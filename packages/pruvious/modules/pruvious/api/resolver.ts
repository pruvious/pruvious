import { isDefined } from '@pruvious/utils'
import fs from 'node:fs'
import { resolveFiles, useNuxt } from 'nuxt/kit'
import { basename, extname, join, relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'

type Method = 'delete' | 'get' | 'patch' | 'post' | 'put' | undefined
type ServerHandlers = { route: string; handler: string; method?: Method }[]

/**
 * Key-value object containing server handler names and their definition file paths.
 */
let handlers: ServerHandlers | undefined

/**
 * Retrieves a key-value object containing API paths and their handler file paths.
 * It scans the `<serverDir>/<pruvious.dir.api>` directories across all Nuxt layers.
 */
export async function resolveServerHandlers(): Promise<ServerHandlers> {
  if (!handlers) {
    handlers = []

    const nuxt = useNuxt()

    for (const layer of nuxt.options._layers) {
      debug(`Resolving server handler in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`)

      if (isDefined(layer.config.serverDir)) {
        const apiDir = join(layer.config.serverDir, layer.config.pruvious?.dir?.api ?? 'pruvious-api')
        const fullPathsWithoutExt: string[] = []
        const fullPaths: string[] = []

        if (fs.existsSync(apiDir)) {
          for (const fullPath of await resolveFiles(apiDir, [`${apiDir}/**/*{.js,.mjs,.ts}`])) {
            const ext = extname(fullPath)
            const name = basename(fullPath, ext)
            const fullPathWithoutExt = fullPath.slice(0, fullPath.length - ext.length)
            const method = (name.includes('.') ? name.split('.').pop() : undefined) as Method
            const route =
              nuxt.options.runtimeConfig.pruvious.api.basePath.slice(0, -1) +
              fullPath
                .slice(apiDir.length, fullPath.length - ext.length - (method ? method.length + 1 : 0))
                .replace('[...]', '**')
                .replace(/\[([^\]]+)\]/g, ':$1')
                .replace(/\/index$/, '')

            if (fullPathsWithoutExt.includes(fullPathWithoutExt)) {
              warnWithContext(`Two server handler files resolving to the same name \`${name}\`:`, [
                relative(nuxt.options.workspaceDir, fullPath),
                relative(nuxt.options.workspaceDir, fullPaths[fullPathsWithoutExt.indexOf(fullPathWithoutExt)]!),
              ])
              continue
            }

            if (handlers.some((handler) => handler.route === route && handler.method === method)) {
              debug(
                `Skipping server handler <${(method ? `[${method.toUpperCase()}] ` : '') + route}> as it was previously resolved in a parent layer`,
              )
              continue
            }

            handlers.push({ route, handler: fullPath, method })
            fullPathsWithoutExt.push(fullPathWithoutExt)
            fullPaths.push(fullPath)
            debug(`Resolved server handler \`${(method ? `[${method.toUpperCase()}] ` : '') + route}\``)
            debug(`...in <${relative(nuxt.options.workspaceDir, apiDir)}${fullPath.slice(apiDir.length)}>`)
          }
        }
      }
    }
  }

  return handlers
}

export function resetServerHandlersResolver() {
  handlers = undefined
}
