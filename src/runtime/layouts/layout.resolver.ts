import babelGenerate from '@babel/generator'
import fs from 'fs-extra'
import { dirname, resolve, sep } from 'path'
import { compileScript, parse, walkIdentifiers } from 'vue/compiler-sfc'
import { queueError } from '../instances/logger'
import { resolveAppPath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { uniqueArray } from '../utils/array'
import { CodeGenerator } from '../utils/code-generator'
import { relativeImport, walkDir } from '../utils/fs'
import { titleCase } from '../utils/string'
import { validateSlug } from '../utils/validation'
import type { LayoutDefinition } from './layout.definition'

export interface ResolvedLayout {
  definition: Partial<LayoutDefinition> & { name: string }
  source: string
  code: string
}

const cachedLayouts: Record<string, { code: string; label?: string }> = {}

const generate: typeof babelGenerate =
  typeof babelGenerate === 'function' ? babelGenerate : (babelGenerate as any).default

export async function resolveLayouts(): Promise<{
  records: Record<string, ResolvedLayout>
  errors: number
}> {
  const records: Record<string, ResolvedLayout> = {}
  const fromApp = resolveAppPath('./layouts')

  let errors = 0

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath, relativePath } of walkDir(fromApp, { endsWith: '.vue' })) {
      errors += await resolveLayout(fullPath, relativePath, records)
    }
  }

  for (const layer of getModuleOption('layers').slice(1)) {
    if (fs.existsSync(resolve(layer, 'layouts'))) {
      for (const { fullPath, relativePath } of walkDir(resolve(layer, 'layouts'), {
        endsWith: '.vue',
      })) {
        errors += await resolveLayout(fullPath, relativePath, records, true)
      }
    }
  }

  return { records, errors }
}

async function resolveLayout(
  filePath: string,
  relativePath: string,
  records: Record<string, ResolvedLayout>,
  ignoreDuplicate = false,
): Promise<0 | 1> {
  const res: ResolvedLayout = {
    definition: { name: relativePath.slice(0, -4).replaceAll(sep, '') },
    source: filePath,
    code: '',
  }

  if (cachedLayouts[filePath]) {
    records[res.definition.name] = {
      definition: { ...res.definition, label: cachedLayouts[filePath].label },
      source: res.source,
      code: cachedLayouts[filePath].code,
    }
    return 0
  }

  if (records[res.definition.name]) {
    if (ignoreDuplicate) {
      return 0
    } else {
      queueError(`Cannot register duplicate layout name $c{{ ${res.definition.name} }} in $c{{ ${filePath} }}`)
      return 1
    }
  } else if (
    !validateSlug({
      subject: 'layout',
      prop: 'name',
      value: res.definition.name,
      path: filePath,
      examples: ["'default'", "'documentation'", "'sidebar-right'", 'etc.'],
    })
  ) {
    return 1
  }

  try {
    const component = fs.readFileSync(filePath, 'utf-8')
    const { descriptor } = parse(component, { filename: filePath })

    if (!descriptor.scriptSetup) {
      records[res.definition.name] = {
        ...res,
        code: `export default { name: '${res.definition.name}', label: '${titleCase(res.definition.name, false)}' }`,
      }
      cachedLayouts[filePath] = { code: records[res.definition.name].code }
      return 0
    }

    const { scriptSetupAst } = compileScript(descriptor, {
      id: filePath,
      isProd: false,
      sourceMap: false,
    })

    const pruviousImports: string[] = ['type LayoutDefinition', 'defineLayout']

    if (scriptSetupAst) {
      let imports = ''
      let buffer = ''

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
            if (id.name === 'defineLayout') {
              hasMacro = true

              try {
                res.definition.label = (node as any).expression?.arguments[0]?.properties?.find(
                  (x: any) => x.key.name === 'label',
                )?.value?.value
              } catch (e) {
                console.error(e)
              }
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

      res.code = res.code.replace(/^.*defineLayout\(/m, 'export const __defineLayout = (')

      if (res.code.includes('export const __defineLayout =')) {
        res.code.replace('export const __defineLayout =', 'const __defineLayout =')
      } else {
        res.code += 'const __defineLayout = {}\n'
      }

      records[res.definition.name] = {
        definition: res.definition,
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
                return `'${relativeImport(resolveAppPath('./.pruvious/layouts'), resolve(dirname(filePath), source))}';`
              })
              .replace(/'(?:~~|~|@@|@)/g, "'../.."),
          )
          .add(res.code)
          .newLine('const __export = {')
          .newLine(`name: '${res.definition.name}',`)
          .newLine(`label: (__defineLayout as any).label || '${titleCase(res.definition.name, false)}',`)
          .newLine(`allowedBlocks: (__defineLayout as any).allowedBlocks,`)
          .newLine(`allowedRootBlocks: (__defineLayout as any).allowedRootBlocks,`)
          .newLine('}')
          .newLine('export default __export as unknown as LayoutDefinition')
          .getContent(),
      }

      const hasLocalImports = /^\s*import.+['""](?:\.|~~|~|@@|@)/m.test(imports)

      if (!hasLocalImports) {
        cachedLayouts[filePath] = { code: records[res.definition.name].code, label: res.definition.label }
      }

      return 0
    } else {
      queueError(`Cannot compile $c{{ <script setup> }} in $c{{ ${filePath} }}`)
    }
  } catch (e) {
    queueError(`Cannot define layout in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export function clearCachedLayout(path: string) {
  delete cachedLayouts[path]
}
