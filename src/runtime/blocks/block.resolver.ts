import babelGenerate from '@babel/generator'
import fs from 'fs-extra'
import { dirname, resolve, sep } from 'path'
import { compileScript, parse, walkIdentifiers } from 'vue/compiler-sfc'
import type { ResolvedField } from '../fields/field.resolver'
import { evaluateModule } from '../instances/evaluator'
import { queueError } from '../instances/logger'
import { resolveAppPath, resolveModulePath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { uniqueArray } from '../utils/array'
import { CodeGenerator } from '../utils/code-generator'
import { relativeImport, walkDir } from '../utils/fs'
import { camelCase, kebabCase, titleCase } from '../utils/string'
import { validatePascalCase } from '../utils/validation'
import type { BlockDefinition } from './block.definition'

export interface ResolvedBlock {
  definition: Partial<BlockDefinition> & { name: string }
  source: string
  code: string
}

const cachedBlockCode: Record<string, string> = {}
const cachedBlockDefinition: Record<string, BlockDefinition> = {}

const generate: typeof babelGenerate =
  typeof babelGenerate === 'function' ? babelGenerate : (babelGenerate as any).default

export async function resolveBlocks(
  fields: Record<string, ResolvedField>,
  skipCache = false,
): Promise<{
  records: Record<string, ResolvedBlock>
  errors: number
}> {
  const records: Record<string, ResolvedBlock> = {}
  const fromApp = resolveAppPath('./blocks')

  let errors = 0

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath, relativePath } of walkDir(fromApp, { endsWith: '.vue' })) {
      errors += await resolveBlock(fullPath, relativePath, records, fields, ['Preset'])
    }
  }

  for (const layer of getModuleOption('layers').slice(1)) {
    if (fs.existsSync(resolve(layer, 'blocks'))) {
      for (const { fullPath, relativePath } of walkDir(resolve(layer, 'blocks'), { endsWith: '.vue' })) {
        errors += await resolveBlock(fullPath, relativePath, records, fields, ['Preset'], true)
      }
    }
  }

  if (getModuleOption('standardCollections').presets) {
    const filePath = resolveModulePath('./runtime/blocks/standard/Preset.vue')
    errors += await resolveBlock(filePath, 'Preset.vue', records, fields)
  }

  if (skipCache) {
    clearAllCachedBlocks()
  }

  return { records, errors }
}

async function resolveBlock(
  filePath: string,
  relativePath: string,
  records: Record<string, ResolvedBlock>,
  fields: Record<string, ResolvedField>,
  reserved: string[] = [],
  ignoreDuplicate = false,
): Promise<0 | 1> {
  const res: ResolvedBlock = {
    definition: { name: relativePath.slice(0, -4).replaceAll(sep, '') },
    source: filePath,
    code: '',
  }

  if (cachedBlockCode[filePath]) {
    records[res.definition.name] = {
      ...res,
      ...(cachedBlockDefinition[filePath] ?? {}),
      code: cachedBlockCode[filePath],
    }
    return 0
  }

  if (records[res.definition.name]) {
    if (ignoreDuplicate) {
      return 0
    } else {
      queueError(`Cannot register duplicate block name $c{{ ${res.definition.name} }} in $c{{ ${filePath} }}`)
      return 1
    }
  } else if (
    !validatePascalCase({
      subject: 'block',
      prop: 'name',
      value: res.definition.name,
      path: filePath,
      examples: ["'Slider'", "'Button'", "'ButtonGroup'", 'etc.'],
    })
  ) {
    return 1
  } else if (reserved.includes(res.definition.name)) {
    queueError(`Cannot register reserved block name $c{{ ${res.definition.name} }} in $c{{ ${filePath} }}`)
    return 1
  }

  try {
    const component = fs.readFileSync(filePath, 'utf-8')
    const { descriptor } = parse(component, { filename: filePath })

    if (!descriptor.scriptSetup) {
      records[res.definition.name] = {
        ...res,
        ...(cachedBlockDefinition[filePath] ?? {}),
        code: [
          'export default {',
          `  name: '${res.definition.name}',`,
          `  label: '${res.definition.name}',`,
          '  fields: {},',
          '  slots: {},',
          "  description: '',",
          "  icon: 'Components',",
          '}',
          '',
        ].join('\n'),
      }
      cachedBlockCode[filePath] = records[res.definition.name].code
      return 0
    }

    const { scriptSetupAst, bindings } = compileScript(descriptor, {
      id: filePath,
      isProd: false,
      sourceMap: false,
    })

    const pruviousImports: string[] = [
      'type BlockDefinition',
      'defineBlock',
      ...Object.keys(fields)
        .map((fieldName) => [
          `${camelCase(fieldName)}Field`,
          `${camelCase(fieldName)}Subfield`,
          `${camelCase(fieldName)}FieldTrap`,
        ])
        .flat(),
    ].sort()

    if (scriptSetupAst) {
      let imports = ''
      let buffer = ''

      if (bindings) {
        for (const [key, value] of Object.entries(bindings)) {
          if (value === 'props') {
            if (!key.match(/[a-z]/i)) {
              queueError(`Prop name $c{{ ${key} }} must include at least one letter in $c{{ ${filePath} }}`)
            } else if (camelCase(key) !== key && !key.startsWith('__')) {
              queueError(
                `Prop name $c{{ ${key} }} must be written in camel case (e.g., $c{{ ${camelCase(
                  key,
                )} }}) in $c{{ ${filePath} }}`,
              )
            }
          }
        }
      }

      for (const node of scriptSetupAst) {
        if (node.type === 'ImportDeclaration') {
          if (!node.source.value.startsWith('#')) {
            imports += generate(node).code + '\n'
          } else if (node.source.value === '#pruvious') {
            pruviousImports.push(...node.specifiers.map((x) => x.local.name))
          }
        } else {
          let hasMacro = false

          walkIdentifiers(node, (id) => {
            if (id.name === 'defineBlock') {
              hasMacro = true
            } else if (id.name === 'defineProps') {
              id.name = 'defineBlockFields'
              hasMacro = true
            } else if (id.name.endsWith('Field') && fields[kebabCase(id.name.replace(/Field$/, ''))]) {
              id.name = `${id.name}Trap`
            } else if (id.name.endsWith('Subfield') && fields[kebabCase(id.name.replace(/Subfield$/, ''))]) {
              id.name = `${id.name.replace(/Subfield$/, 'Field')}Trap`
            }
          })

          if (hasMacro) {
            res.code += buffer + generate(node).code + '\n'
            buffer = ''
          } else {
            buffer += generate(node).code + '\n'
          }
        }
      }

      res.code = res.code
        .replace(/^.*defineBlock\(/m, 'export const __defineBlock = (')
        .replace(/^.*defineBlockFields\(/m, 'export const __defineProps = (')

      for (const x of ['Block', 'Props']) {
        if (res.code.includes(`export const __define${x} =`)) {
          res.code.replace(`export const __define${x} =`, `const __define${x} =`)
        } else {
          res.code += `const __define${x} = {}\n`
        }
      }

      records[res.definition.name] = {
        definition: cachedBlockDefinition[filePath] ?? res.definition,
        source: filePath,
        code: new CodeGenerator()
          .add(
            `import { ${uniqueArray(pruviousImports)
              .map((x) => `${x}`)
              .join(', ')} } from '#pruvious'`,
          )
          .newLine(
            imports
              .replace(/'(\.(.*))';$/gm, (_, source) => {
                return `'${relativeImport(resolveAppPath('./.pruvious/blocks'), resolve(dirname(filePath), source))}';`
              })
              .replace(/'(?:~{1,2}|@{1,2})\//g, "'../../"),
          )
          .add(res.code)
          .newLine(`const __defineBlockFields = (__defineBlock as any)['fields'] || {}`)
          .newLine(
            'const __definePropsFields = Object.fromEntries(Object.entries(__defineProps).filter(([_, prop]) => (prop as any).__fromDefineProps))',
          )
          .newLine('const __export = {')
          .newLine(`name: '${res.definition.name}',`)
          .newLine(`label: (__defineBlock as any).label || '${titleCase(res.definition.name, false)}',`)
          .newLine(`fields: { ...__defineBlockFields, ...__definePropsFields },`)
          .newLine(`slots: (__defineBlock as any).slots ?? {},`)
          .newLine(`description: (__defineBlock as any).description || '',`)
          .newLine(`icon: (__defineBlock as any).icon || 'Components',`)
          .newLine('}')
          .newLine('export default __export as unknown as Required<BlockDefinition>')
          .getContent(),
      }

      const hasLocalImports = /^\s*import.+['""](?:\.{1,2}|~{1,2}|@{1,2})\//m.test(imports)

      if (!hasLocalImports) {
        cachedBlockCode[filePath] = records[res.definition.name].code
      }

      return 0
    } else {
      queueError(`Cannot compile $c{{ <script setup> }} in $c{{ ${filePath} }}`)
    }
  } catch (e) {
    queueError(`Cannot define block in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export async function resolveBlockDefinition(block: ResolvedBlock): Promise<BlockDefinition> {
  const resolved: BlockDefinition = {
    name: block.definition.name,
    label: block.definition.label || titleCase(block.definition.name, false),
    fields: block.definition.fields ?? {},
    slots: block.definition.slots ?? {},
    description: block.definition.description || '',
  }

  if (!block.definition.fields && cachedBlockCode[block.source]) {
    try {
      cachedBlockDefinition[block.source] = (
        await evaluateModule(
          resolveAppPath('./.pruvious/blocks', `${block.definition.name}.ts`),
          cachedBlockCode[block.source],
        )
      ).default
      resolved.label = cachedBlockDefinition[block.source].label
      resolved.fields = cachedBlockDefinition[block.source].fields
      resolved.slots = cachedBlockDefinition[block.source].slots
      resolved.description = cachedBlockDefinition[block.source].description
    } catch {}
  }

  return resolved
}

export function clearCachedBlock(path: string) {
  delete cachedBlockCode[path]
  delete cachedBlockDefinition[path]
}

export function clearAllCachedBlocks() {
  for (const path of Object.keys(cachedBlockCode)) {
    clearCachedBlock(path)
  }
}
