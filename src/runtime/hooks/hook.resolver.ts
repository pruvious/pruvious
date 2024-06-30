import fs from 'fs-extra'
import { resolve, sep } from 'path'
import { evaluateModule } from '../instances/evaluator'
import { queueError } from '../instances/logger'
import { resolveAppPath, resolveModulePath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { isUndefined } from '../utils/common'
import { walkDir } from '../utils/fs'
import { validateDefaultExport, validateSafeSlug } from '../utils/validation'
import type { HookDefinition } from './hook.definition'

export interface ResolvedHook {
  definition: Required<HookDefinition>
  source: string
  isStandard: boolean
}

// <filePath, exports>
const cachedHooks: Record<string, any> = {}

export function resolveHooks(): { records: Record<string, ResolvedHook>; errors: number } {
  const records: Record<string, ResolvedHook> = {}
  const fromModule = resolveModulePath('./runtime/hooks/standard')
  const fromApp = resolveAppPath('./hooks')
  const registeredStandardHooks: Record<string, boolean> = getModuleOption('standardHooks')

  let errors = 0

  if (fs.existsSync(fromModule)) {
    for (const { fullPath, directory } of walkDir(fromModule, { endsWith: ['.js', '.ts'], endsWithout: '.d.ts' })) {
      if (registeredStandardHooks[directory.split(sep).pop()!]) {
        errors += resolveHook(fullPath, records, true)
      }
    }
  }

  for (const layer of getModuleOption('layers').slice(1).reverse()) {
    if (fs.existsSync(resolve(layer, 'hooks'))) {
      for (const { fullPath } of walkDir(resolve(layer, 'hooks'), {
        endsWith: ['.ts'],
        endsWithout: '.d.ts',
      })) {
        errors += resolveHook(fullPath, records, false)
      }
    }
  }

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath } of walkDir(fromApp, { endsWith: '.ts', endsWithout: '.d.ts' })) {
      errors += resolveHook(fullPath, records, false)
    }
  }

  return { records, errors }
}

function resolveHook(filePath: string, records: Record<string, ResolvedHook>, isStandard: boolean): 0 | 1 {
  try {
    let exports = cachedHooks[filePath]

    if (isUndefined(exports)) {
      let code = fs.readFileSync(filePath, 'utf-8')
      const hasLocalImports = /^\s*import.+['""](?:\.|~~|~|@@|@)/m.test(code)

      if (!isStandard && !/^\s*import.+defineHook.+pruvious/m.test(code)) {
        code += "import { defineHook } from '#pruvious'\n"
      }

      exports = evaluateModule(filePath, code)

      if (isStandard || !hasLocalImports) {
        cachedHooks[filePath] = exports
      }
    }

    if (
      validateDefaultExport('hooks', 'defineHook({ ... })', exports, filePath) &&
      validateSafeSlug({
        subject: 'collection',
        prop: 'collection',
        value: exports.default.collection,
        path: filePath,
        examples: ["'products'", "'news'", "'form-entries'", 'etc.'],
      })
    ) {
      records[filePath] = { definition: exports.default, source: filePath, isStandard }
      return 0
    }
  } catch (e) {
    queueError(`Cannot define hook in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export function clearCachedHook(path: string) {
  delete cachedHooks[path]
}
