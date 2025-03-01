import { omit } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { hash } from 'ohash'
import { relative } from 'pathe'
import { resolveCustomComponentPath } from '../components/utils.server'
import { debug, warnWithContext } from '../debug/console'
import { extractStringLiteralArguments } from '../utils/ast'
import { resolveFromLayers } from '../utils/resolve'

/**
 * Key-value object containing component names and their file paths.
 */
const components: Record<string, string> = {}

/**
 * Key-value object containing absolute file paths and component names that were resolved from them.
 */
const nameMap: Record<string, string[]> = {}

/**
 * Retrieves an object containing component names and their file paths resolved using `resolvePruviousComponent()` and `resolveNamedPruviousComponent()`.
 * It scans the following directories across all Nuxt layers:
 *
 * - `<srcDir>/<pruvious.dir.blocks>`
 * - `<serverDir>/<pruvious.dir.collections>`
 * - `<serverDir>/<pruvious.dir.singletons>`
 * - `<serverDir>/<pruvious.dir.templates>`
 * - `<sharedDir>`
 *
 * The `write` parameter can be used to disable writing to the `#pruvious/client/custom-components.ts` file.
 * By default, it is set to `true`.
 */
export function resolveCustomComponents(write = true): Record<string, string> {
  const nuxt = useNuxt()

  // Blocks
  // @todo resolve custom components in blocks

  // Collections
  for (const { file, layer } of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.collections ?? 'collections',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in collections in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile(file.absolute, layer.config.srcDir, false)
  }

  // Singletons
  for (const { file, layer } of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.singletons ?? 'singletons',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in singletons in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile(file.absolute, layer.config.srcDir, false)
  }

  // Templates
  for (const { file, layer } of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.templates ?? 'templates',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in templates in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile(file.absolute, layer.config.srcDir, false)
  }

  // Shared
  for (const { file, layer } of resolveFromLayers({
    nuxtDir: 'rootDir',
    pruviousDir: (_, layer) => layer.config.dir?.shared ?? 'shared', // @todo
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in shared directory in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile(file.absolute, layer.config.srcDir, false)
  }

  if (write) {
    writeToFile()
  }

  return components
}

/**
 * Finds all `resolvePruviousComponent()` calls in a `file` and adds them to the `components` array.
 *
 * - The `file` parameter is the path to the file to scan.
 * - The `srcDir` parameter specifies the source directory of a Nuxt layer.
 * - The `write` parameter can be used to disable writing to the `#pruvious/client/custom-components.ts` file (default: `true`).
 */
export function resolveCustomComponentsInFile(file: string, srcDir: string, write = true) {
  const nuxt = useNuxt()
  const code = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''

  if (nameMap[file]) {
    const omitNames = Object.values(omit(nameMap, [file])).flat()

    for (const name of nameMap[file]) {
      if (!omitNames.includes(name)) {
        delete components[name]
      }
    }

    delete nameMap[file]

    if (write) {
      debouncedWriteToFile()
    }
  }

  if (code.includes('resolvePruviousComponent') || code.includes('resolveNamedPruviousComponent')) {
    const matches = extractStringLiteralArguments({
      code,
      mode: file.endsWith('.ts') ? 'ts' : 'js',
      targetFunctionNames: ['resolvePruviousComponent', 'resolveNamedPruviousComponent'],
    })

    if (matches.length) {
      nameMap[file] = []
      const relativeFilePath = relative(nuxt.options.workspaceDir, file)

      for (const { functionName, args } of matches) {
        if (functionName === 'resolvePruviousComponent') {
          const component = args[0] ?? ''
          const componentPath = resolveCustomComponentPath(file, component, srcDir)

          if (!componentPath) {
            warnWithContext(`Missing component path in ${colorize('yellow', 'resolvePruviousComponent()')}`, [
              `Source: ${colorize('dim', relativeFilePath)}`,
            ])
          } else if (fs.existsSync(componentPath)) {
            const key = hash(componentPath)
            nameMap[file].push(key)

            if (!components[key]) {
              components[key] = componentPath
              if (write) {
                debouncedWriteToFile()
              }
            }

            if (components[key] === componentPath) {
              debug(`Resolved custom component \`${component}\` in <${relativeFilePath}>`)
            } else {
              warnWithContext(`Two custom components named \`${component}\` pointing to different file locations:`, [
                relative(nuxt.options.workspaceDir, components[key]),
                relative(nuxt.options.workspaceDir, componentPath),
              ])
            }
          } else {
            warnWithContext(`Unable to resolve custom component ${colorize('yellow', component)}`, [
              `Source: ${colorize('dim', relativeFilePath)}`,
            ])
          }
        } else if (functionName === 'resolveNamedPruviousComponent') {
          const name = args[0] ?? ''
          const component = args[1] ?? ''
          const componentPath = resolveCustomComponentPath(file, component, srcDir)

          if (!name) {
            warnWithContext(`Missing component name in ${colorize('yellow', 'resolveNamedPruviousComponent()')}`, [
              `Source: ${colorize('dim', relativeFilePath)}`,
            ])
          } else if (!componentPath) {
            warnWithContext(`Missing component path in ${colorize('yellow', 'resolveNamedPruviousComponent()')}`, [
              `Source: ${colorize('dim', relativeFilePath)}`,
            ])
          } else if (fs.existsSync(componentPath)) {
            nameMap[file].push(name)

            if (!components[name]) {
              components[name] = componentPath
              if (write) {
                debouncedWriteToFile()
              }
            }

            if (components[name] === componentPath) {
              debug(`Resolved custom component \`${name}\` in <${relativeFilePath}>`)
            } else {
              warnWithContext(`Two custom components named \`${name}\` pointing to different file locations:`, [
                relative(nuxt.options.workspaceDir, components[name]),
                relative(nuxt.options.workspaceDir, componentPath),
              ])
            }
          } else {
            warnWithContext(`Unable to resolve custom component ${colorize('yellow', name)}`, [
              `Source: ${colorize('dim', relativeFilePath)}`,
            ])
          }
        }
      }
    }
  }
}

function writeToFile() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build

  fs.writeFileSync(
    `${buildDir}/client/custom-components.ts`,
    [
      `import { type Component, defineAsyncComponent } from 'vue'`,
      ``,
      `export const customComponents: Record<string, () => Component | string> = {`,
      ...Object.entries(components).map(
        ([name, path]) => `  '${name}': () => defineAsyncComponent(() => import('${path}')),`,
      ),
      `}`,
      ``,
    ].join('\n'),
  )
}

const debouncedWriteToFile = useDebounceFn(writeToFile, 250)
