import { parse } from '@babel/parser'
import template from '@babel/template'
import type { CallExpression, ExpressionStatement, ObjectExpression, ObjectProperty } from '@babel/types'
import { exportDefaultDeclaration, identifier, objectExpression, objectProperty } from '@babel/types'
import { isDefined, pascalCase } from '@pruvious/utils'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { useDebounceFn } from '@vueuse/core'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { dirname, relative, resolve } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import { cleanupUnusedCode, generate, traverse } from '../utils/ast'
import { reduceFileNameSegments, resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

export interface ResolveBlockDefinitionOptions {
  /**
   * An absolute path to the `.vue` component file of the block.
   */
  vueFile: string

  /**
   * Whether to write to the `#pruvious/server/blocks.ts` file.
   *
   * @default true
   */
  write?: boolean
}

/**
 * Key-value object containing block names and their component file locations.
 */
let blocks: Record<string, ResolveFromLayersResult> | undefined

/**
 * Key-value object containing block names and their resolved definitions (as code).
 */
let blockDefinitions: Record<string, string> = {}

/**
 * Retrieves a key-value object containing block names and their component file locations.
 * It scans the `<srcDir>/<pruvious.dir.blocks>` directories across all Nuxt layers.
 *
 * The `write` parameter can be used to disable writing to the `#pruvious/server/blocks.ts` file.
 * By default, it is set to `true`.
 */
export function resolveBlockFiles(write = true): Record<string, ResolveFromLayersResult> {
  if (!blocks) {
    blocks = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (options) => options.dir?.blocks ?? 'blocks',
      extensions: ['vue'],
      beforeResolve: (layer) =>
        debug(`Resolving blocks in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const blockName = pascalCase(reduceFileNameSegments(pruviousDirNames, base).join(''))

      if (!blockName) {
        warnWithContext(`The block file <${base}> does not have a valid name.`, [
          `Source: ${colorize('dim', file.relative)}`,
        ])
        continue
      }

      if (isDefined(duplicates[blockName]) && duplicates[blockName].layer === layer) {
        warnWithContext(`Two block files resolving to the same name \`${blockName}\`:`, [
          file.relative,
          duplicates[blockName].relativePath,
        ])
        continue
      }

      if (isDefined(blocks[blockName])) {
        debug(`Skipping block <${blockName}> as it was previously resolved in a parent layer`)
        continue
      }

      blocks[blockName] = location
      resolveBlockDefinition({ vueFile: location.file.absolute, write: false })
      duplicates[blockName] = { layer, relativePath: file.relative }
      debug(`Resolved block \`${blockName}\` in <${file.relative}>`)
    }
  }

  if (write) {
    writeToFile()
  }

  return blocks
}

/**
 * Resolves the block definition from a Vue block component file.
 * It generates the block definition code and writes it to the `#pruvious/server/blocks.ts` file (if `options.write` is `true`).
 */
export function resolveBlockDefinition(options: ResolveBlockDefinitionOptions) {
  const write = options.write ?? true
  const [blockName] = Object.entries(blocks ?? {}).find(([_, { file }]) => file.absolute === options.vueFile) ?? []

  if (!blockName) {
    return
  }

  try {
    const nuxt = useNuxt()
    const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build
    const code = fs.existsSync(options.vueFile) ? fs.readFileSync(options.vueFile, 'utf-8') : ''
    const { descriptor } = parseSFC(code)
    const isTS = descriptor.scriptSetup?.lang === 'ts'
    const ast = parse(descriptor.scriptSetup?.content ?? '', {
      sourceType: 'module',
      plugins: isTS ? ['typescript'] : [],
    })

    let defineBlockNode: CallExpression | undefined
    let definePropsNode: CallExpression | undefined

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.type === 'Identifier') {
          if (path.node.callee.name === 'defineBlock') {
            defineBlockNode = path.node
            path.remove()
          } else if (path.node.callee.name === 'defineProps') {
            definePropsNode = path.node
          }
        }
      },
      ImportDeclaration(path) {
        if (path.node.source.value === '#pruvious/client') {
          path.node.source.value = '#pruvious/server'
        } else if (path.node.source.value.startsWith('.')) {
          path.node.source.value = relative(
            `${buildDir}/server/blocks`,
            resolve(dirname(options.vueFile), path.node.source.value),
          )
        }
      },
    })

    if (!defineBlockNode) {
      const defineBlockStatement = template.statement(`defineBlock({})`)() as ExpressionStatement
      defineBlockNode = defineBlockStatement.expression as CallExpression
      ast.program.body.unshift(template.statement(`import { defineBlock } from '#pruvious/server'`)())
    }

    if (defineBlockNode.arguments.length === 1) {
      const arg = defineBlockNode.arguments[0] as ObjectExpression

      // Add fields property if it doesn't exist
      if (
        !arg.properties.some(
          (prop) => prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === 'fields',
        )
      ) {
        arg.properties.push(objectProperty(identifier('fields'), objectExpression([])))
      }

      // Merge defineProps properties into defineBlock fields
      if (definePropsNode) {
        const fieldsProperty = arg.properties.find(
          (prop) => prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === 'fields',
        )! as ObjectProperty
        const fieldsValue = fieldsProperty.value as ObjectExpression

        if (definePropsNode.arguments[0]?.type === 'ObjectExpression') {
          for (const prop of definePropsNode.arguments[0].properties) {
            fieldsValue.properties.push(prop)
          }
        }
      }

      // Export default defineBlock
      ast.program.body.push(exportDefaultDeclaration(defineBlockNode))
    }

    blockDefinitions[blockName] = cleanupUnusedCode({
      code: generate(ast).code,
      mode: isTS ? 'ts' : 'js',
      targetFunctionNames: ['defineBlock'],
    })

    if (write) {
      debouncedWriteToFile()
    }
  } catch {
    blockDefinitions[blockName] = [
      `import { defineBlock } from '#pruvious/server'`,
      `export default defineBlock({})`,
    ].join('\n')
  }
}

function writeToFile() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build
  const blocksTS: string[] = []

  if (fs.existsSync(`${buildDir}/server/blocks`)) {
    fs.rmSync(`${buildDir}/server/blocks`, { recursive: true })
  }

  fs.mkdirSync(`${buildDir}/server/blocks`)

  for (const [blockName, definition] of Object.entries(blockDefinitions)) {
    fs.writeFileSync(`${buildDir}/server/blocks/${blockName}.ts`, definition)
    blocksTS.push(`// ${blocks?.[blockName]?.file.absolute}`, `import ${blockName} from './blocks/${blockName}'`, ``)
  }

  fs.writeFileSync(
    `${buildDir}/server/blocks.ts`,
    [
      ...blocksTS,
      `/**`,
      ` * Stores all blocks in a key-value structure.`,
      ` * The keys are the blocks names, and the values are the \`Block\` instances.`,
      ` */`,
      `export const blocks = {`,
      ...Object.keys(blockDefinitions).map((blockName) => `  ${blockName},`),
      `}`,
      ``,
    ].join('\n'),
  )
}

const debouncedWriteToFile = useDebounceFn(writeToFile, 250)

export function resetBlocksResolver() {
  blocks = undefined
  blockDefinitions = {}
}
