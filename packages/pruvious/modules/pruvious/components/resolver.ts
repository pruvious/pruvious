import { omit } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import { hash } from 'ohash'
import { relative } from 'pathe'
import { resolveCustomComponentPath, type ResolveCustomComponentPathOptions } from '../components/utils.server'
import { debug, warnWithContext } from '../debug/console'
import { extractStringLiteralArguments } from '../utils/ast'
import { resolveFromLayers } from '../utils/resolve'

export interface ResolveCustomComponentsInFileOptions extends Omit<ResolveCustomComponentPathOptions, 'component'> {
  /**
   * An array of source directories for all Nuxt layers, starting from the current layer.
   * You can use `nuxt.options._layers` to get the list of all layers.
   */
  srcDirs: string[]

  /**
   * Whether to write to the `#pruvious/client/custom-components.ts` file.
   *
   * @default true
   */
  write?: boolean
}

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
  for (const { file, layer, layers } of resolveFromLayers({
    nuxtDir: 'srcDir',
    pruviousDir: (options) => options.dir?.blocks ?? 'blocks',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in blocks in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile({
      file: file.absolute,
      srcDir: layer.config.srcDir,
      srcDirs: layers.map(({ config }) => config.srcDir),
      write: false,
    })
  }

  // Collections
  for (const { file, layer, layers } of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.collections ?? 'collections',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in collections in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile({
      file: file.absolute,
      srcDir: layer.config.srcDir,
      srcDirs: layers.map(({ config }) => config.srcDir),
      write: false,
    })
  }

  // Singletons
  for (const { file, layer, layers } of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.singletons ?? 'singletons',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in singletons in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile({
      file: file.absolute,
      srcDir: layer.config.srcDir,
      srcDirs: layers.map(({ config }) => config.srcDir),
      write: false,
    })
  }

  // Templates
  for (const { file, layer, layers } of resolveFromLayers({
    nuxtDir: 'serverDir',
    pruviousDir: (options) => options.dir?.templates ?? 'templates',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in templates in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile({
      file: file.absolute,
      srcDir: layer.config.srcDir,
      srcDirs: layers.map(({ config }) => config.srcDir),
      write: false,
    })
  }

  // Shared
  for (const { file, layer, layers } of resolveFromLayers({
    nuxtDir: 'rootDir',
    pruviousDir: (_, layer) => layer.config.dir?.shared ?? 'shared',
    beforeResolve: (layer) =>
      debug(
        `Resolving custom components in shared directory in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
      ),
  })) {
    resolveCustomComponentsInFile({
      file: file.absolute,
      srcDir: layer.config.srcDir,
      srcDirs: layers.map(({ config }) => config.srcDir),
      write: false,
    })
  }

  if (write) {
    writeToFile()
  }

  return components
}

/**
 * Finds all `resolvePruviousComponent()` calls in a `file` and adds them to the `components` array.
 * The `write` option can be used to disable writing to the `#pruvious/client/custom-components.ts` file (default: `true`).
 */
export function resolveCustomComponentsInFile(options: ResolveCustomComponentsInFileOptions) {
  const { file, srcDir, srcDirs } = options
  const write = options.write ?? true
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
          const componentPath = resolveCustomComponentPath({ component, file, srcDir })

          if (!componentPath) {
            warnWithContext(`Missing component path in ${colorize('yellow', 'resolvePruviousComponent()')}`, [
              `Source: ${colorize('dim', relativeFilePath)}`,
            ])
          } else if (componentPath.startsWith('@/') || componentPath.startsWith('~/')) {
            let resolved = false

            for (const _srcDir of srcDirs) {
              const _componentPath = resolveCustomComponentPath({
                component: '>/' + componentPath.slice(2),
                file,
                srcDir: _srcDir,
              })

              if (fs.existsSync(_componentPath)) {
                const key = hash(componentPath)
                nameMap[file].push(key)

                if (!components[key]) {
                  components[key] = _componentPath
                  if (write) {
                    debouncedWriteToFile()
                  }
                }

                if (components[key] === _componentPath) {
                  debug(`Resolved custom component \`${component}\` in <${relativeFilePath}>`)
                } else {
                  warnWithContext(
                    `Two custom components named \`${component}\` pointing to different file locations:`,
                    [
                      relative(nuxt.options.workspaceDir, components[key]),
                      relative(nuxt.options.workspaceDir, _componentPath),
                    ],
                  )
                }

                resolved = true
                break
              }
            }

            if (!resolved) {
              warnWithContext(`Unable to resolve custom component ${colorize('yellow', component)}`, [
                `Source: ${colorize('dim', relativeFilePath)}`,
              ])
            }
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
          const componentPath = resolveCustomComponentPath({ component, file, srcDir })

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
