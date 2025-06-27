import { parse } from '@babel/parser'
import type { CallExpression, ObjectExpression } from '@babel/types'
import { exportDefaultDeclaration, identifier, objectProperty, stringLiteral } from '@babel/types'
import { isDefined, isNotNull, kebabCase, withoutLeadingSlash } from '@pruvious/utils'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { useDebounceFn } from '@vueuse/core'
import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { dirname, relative, resolve } from 'pathe'
import { debug } from '../debug/console'
import { cleanupUnusedCode, generate, traverse } from '../utils/ast'
import { reduceFileNameSegments, resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

export interface ResolveDashboardPageDefinitionOptions {
  /**
   * An absolute path to the `.vue` component file of the dashboard page.
   */
  vueFile: string

  /**
   * The source directory of the Nuxt layer where the dashboard page is defined.
   */
  srcDir: string

  /**
   * Whether to write to the `#pruvious/client/dashboard-pages.ts` file.
   *
   * @default true
   */
  write?: boolean
}

/**
 * Key-value object containing dashboard page paths and their component file locations.
 */
let dashboardPages: Record<string, ResolveFromLayersResult> | undefined

/**
 * Key-value object containing dashboard page paths and their resolved definitions (as code).
 */
let dashboardPageDefinitions: Record<string, string | null> = {}

/**
 * Retrieves a key-value object containing dashboard page paths and their component file locations.
 * It scans the `<srcDir>/<nuxt.options.dir.pages>` directories across all Nuxt layers.
 *
 * The `write` parameter can be used to disable writing to the `#pruvious/client/dashboard-pages.ts` file.
 * By default, it is set to `true`.
 */
export function resolveDashboardPageFiles(write = true): Record<string, ResolveFromLayersResult> {
  if (!dashboardPages) {
    dashboardPages = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (_, layer) => layer.config.dir?.pages ?? 'pages',
      extensions: ['vue'],
      beforeResolve: (layer) =>
        debug(`Resolving dashboard pages in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const dashboardPagePath = reduceFileNameSegments(pruviousDirNames, base).join('/')

      if (!dashboardPagePath) {
        continue
      }

      if (isDefined(duplicates[dashboardPagePath]) && duplicates[dashboardPagePath].layer === layer) {
        continue
      }

      if (isDefined(dashboardPages[dashboardPagePath])) {
        debug(`Skipping page <${dashboardPagePath}> as it was previously resolved in a parent layer`)
        continue
      }

      dashboardPages[dashboardPagePath] = location
      resolveDashboardPageDefinition({
        vueFile: location.file.absolute,
        srcDir: location.layer.config.srcDir,
        write: false,
      })
      duplicates[dashboardPagePath] = { layer, relativePath: file.relative }
      debug(`Resolved page \`${dashboardPagePath}\` in <${file.relative}>`)
    }
  }

  if (write) {
    writeDashboardPages()
  }

  return dashboardPages
}

/**
 * Resolves the dashboard page definition from a Vue page component file.
 * It generates the dashboard page definition code and writes it to the `#pruvious/client/dashboard-pages.ts` file (if `options.write` is `true`).
 *
 * @returns a Promise that resolves to `true` if any internal definition was successfully written, `false` otherwise.
 */
export async function resolveDashboardPageDefinition(options: ResolveDashboardPageDefinitionOptions): Promise<boolean> {
  const write = options.write ?? true
  const [dashboardPagePath] =
    Object.entries(dashboardPages ?? {}).find(([_, { file }]) => file.absolute === options.vueFile) ?? []

  if (dashboardPagePath) {
    dashboardPageDefinitions[dashboardPagePath] = null

    try {
      const code = fs.existsSync(options.vueFile) ? fs.readFileSync(options.vueFile, 'utf-8') : ''

      if (code.includes('defineDashboardPage')) {
        const nuxt = useNuxt()
        const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build
        const { descriptor } = parseSFC(code)
        const isTS = descriptor.scriptSetup?.lang === 'ts'
        const ast = parse(descriptor.scriptSetup?.content ?? '', {
          sourceType: 'module',
          plugins: isTS ? ['typescript'] : [],
        })

        let defineDashboardPageNode: CallExpression | undefined

        traverse(ast, {
          CallExpression(path) {
            if (path.node.callee.type === 'Identifier') {
              if (path.node.callee.name === 'defineDashboardPage') {
                defineDashboardPageNode = path.node
                path.remove()
              }
            }
          },
          ImportDeclaration(path) {
            if (path.node.source.value.startsWith('.')) {
              path.node.source.value = relative(
                `${buildDir}/client/dashboard-pages`,
                resolve(dirname(options.vueFile), path.node.source.value),
              )
            }
          },
        })

        if (defineDashboardPageNode?.arguments.length === 1) {
          const arg = defineDashboardPageNode.arguments[0] as ObjectExpression
          const dashboardBasePath = withoutLeadingSlash(nuxt.options.runtimeConfig.pruvious.dashboard.basePath)
          const kebabPath = dashboardPagePath.split('/').map(kebabCase).join('/')
          const _path = kebabPath.startsWith(dashboardBasePath) ? kebabPath.slice(dashboardBasePath.length) : kebabPath

          // Add fallback _path
          const _pathProperty = objectProperty(identifier('_path'), stringLiteral(_path))
          _pathProperty.leadingComments = [{ type: 'CommentLine', value: ' @ts-expect-error' }]
          arg.properties.push(_pathProperty)

          // Export default defineDashboardPage
          ast.program.body.push(exportDefaultDeclaration(defineDashboardPageNode))
        }

        dashboardPageDefinitions[dashboardPagePath] =
          cleanupUnusedCode({
            code: generate(ast).code,
            mode: isTS ? 'ts' : 'js',
            targetFunctionNames: ['defineDashboardPage'],
          }) + '\n'
      }
    } catch {}
  }

  if (write) {
    return !!(await debouncedWriteDashboardPages())
  }

  return false
}

export function writeDashboardPages(): boolean {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build
  const dashboardPagesTS: string[] = []

  let written = false

  if (fs.existsSync(`${buildDir}/client/dashboard-pages`)) {
    for (const file of fs.readdirSync(`${buildDir}/client/dashboard-pages`)) {
      if (!dashboardPageDefinitions[file.replace(/\.ts$/, '')]) {
        fs.rmSync(`${buildDir}/client/dashboard-pages/${file}`)
      }
    }
  } else {
    fs.mkdirSync(`${buildDir}/client/dashboard-pages`)
  }

  for (const [dashboardPagePath, definition] of Object.entries(dashboardPageDefinitions)) {
    if (isNotNull(definition)) {
      const identifier = dashboardPagePath.replaceAll('/', '_')
      const path = `${buildDir}/client/dashboard-pages/${identifier}.ts`

      if (!fs.existsSync(path) || fs.readFileSync(path, 'utf-8') !== definition) {
        fs.writeFileSync(path, definition)
        written = true
      }

      dashboardPagesTS.push(
        `// ${dashboardPages?.[dashboardPagePath]?.file.absolute}`,
        `import ${identifier} from './dashboard-pages/${identifier}'`,
        ``,
      )
    }
  }

  const path = `${buildDir}/client/dashboard-pages.ts`
  const content = [
    ...dashboardPagesTS,
    `/**`,
    ` * Stores the definitions of all custom dashboard pages.`,
    ` * The keys are the dashboard page paths, and the values are resolved definition objects.`,
    ` */`,
    `export const dashboardPages = {`,
    ...Object.entries(dashboardPageDefinitions)
      .filter(([_, definition]) => isNotNull(definition))
      .map(([dashboardPagePath]) => `  ${dashboardPagePath.replaceAll('/', '_')},`),
    `}`,
  ].join('\n')

  if (!fs.existsSync(path) || fs.readFileSync(path, 'utf-8') !== content) {
    fs.writeFileSync(path, content)
    written = true
  }

  return written
}

export const debouncedWriteDashboardPages = useDebounceFn(writeDashboardPages, 250)

export function resetDashboardPagesResolver() {
  dashboardPages = undefined
  dashboardPageDefinitions = {}
}
