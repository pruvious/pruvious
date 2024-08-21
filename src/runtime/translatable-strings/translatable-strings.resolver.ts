import fs from 'fs-extra'
import { resolve } from 'path'
import { evaluateModule } from '../instances/evaluator'
import { queueError } from '../instances/logger'
import { resolveAppPath, resolveModulePath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { isUndefined } from '../utils/common'
import { walkDir } from '../utils/fs'
import { isKeyOf, isObject } from '../utils/object'
import { isString } from '../utils/string'
import { extractPlaceholders } from '../utils/translatable-strings'
import { queueErrorAndReturn, validateDefaultExport, validateSafeSlug } from '../utils/validation'
import type { TranslatableStringPattern, TranslatableStringsDefinition } from './translatable-strings.definition'

export interface ResolvedTranslatableStrings {
  definition: Required<TranslatableStringsDefinition>
  source: string
  isStandard: boolean
}

// <filePath, exports>
const cachedTranslatableStrings: Record<string, any> = {}

export function resolveTranslatableStrings(): { records: Record<string, ResolvedTranslatableStrings>; errors: number } {
  const records: Record<string, ResolvedTranslatableStrings> = {}
  const fromModule = resolveModulePath('./runtime/translatable-strings/standard')
  const fromApp = resolveAppPath('./translatable-strings')
  const registeredStandardTranslatableStrings: Record<string, boolean> = getModuleOption('standardTranslatableStrings')

  let errors = 0

  for (const { file, fullPath } of walkDir(fromModule, { endsWith: ['.js', '.ts'], endsWithout: '.d.ts' })) {
    if (registeredStandardTranslatableStrings[file.split('.').shift()!]) {
      errors += resolveTranslatableStringFile(fullPath, records, true)
    }
  }

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath } of walkDir(fromApp, { endsWith: '.ts', endsWithout: '.d.ts' })) {
      errors += resolveTranslatableStringFile(fullPath, records, false)
    }
  }

  for (const layer of getModuleOption('layers').slice(1)) {
    if (fs.existsSync(resolve(layer, 'translatable-strings'))) {
      for (const { fullPath } of walkDir(resolve(layer, 'translatable-strings'), {
        endsWith: ['.ts'],
        endsWithout: '.d.ts',
      })) {
        errors += resolveTranslatableStringFile(fullPath, records, false, true)
      }
    }
  }

  return { records, errors }
}

function resolveTranslatableStringFile(
  filePath: string,
  records: Record<string, ResolvedTranslatableStrings>,
  isStandard: boolean,
  ignoreDuplicate = false,
): 0 | 1 {
  try {
    let exports = cachedTranslatableStrings[filePath]

    if (isUndefined(exports)) {
      let code = fs.readFileSync(filePath, 'utf-8')
      const hasLocalImports = /^\s*import.+['""](?:\.|~~|~|@@|@)/m.test(code)

      if (!isStandard && !/^\s*import.+defineTranslatableStrings.+pruvious/m.test(code)) {
        code += "import { defineTranslatableStrings } from '#pruvious'\n"
      }

      exports = evaluateModule(filePath, code)

      if (isStandard || !hasLocalImports) {
        cachedTranslatableStrings[filePath] = exports
      }
    }

    if (
      validateDefaultExport('translatable strings', 'defineTranslatableStrings({ ... })', exports, filePath) &&
      validateSafeSlug({
        subject: 'translatable strings',
        prop: 'domain',
        value: exports.default.domain,
        path: filePath,
        examples: ["'default'", "'blog'", "'client-dashboard'", 'etc.'],
      }) &&
      validateTranslatableStrings(exports.default.strings, filePath)
    ) {
      if (
        Object.values(records).some(
          ({ definition }) =>
            definition.domain === exports.default.domain && definition.language === exports.default.language,
        )
      ) {
        if (ignoreDuplicate) {
          return 0
        } else {
          queueError(
            `Cannot register duplicate translatable strings $c{{ ${exports.default.domain} (${exports.default.language}) }} in $c{{ ${filePath} }}`,
          )
        }
      } else {
        records[filePath] = { definition: exports.default, source: filePath, isStandard }
        return 0
      }
    }
  } catch (e) {
    queueError(`Cannot define translatable string in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export function validateTranslatableStrings(
  strings: Record<string, string | TranslatableStringPattern>,
  path: string,
): boolean {
  for (const [key, value] of Object.entries(strings)) {
    if (isObject(value)) {
      const { pattern, input, replacements } = value

      if (!isString(pattern)) {
        return queueErrorAndReturn(`Invalid pattern in translatable string $c{{ ${key} }} in $c{{ ${path} }}`)
      }

      const placeholders = extractPlaceholders(pattern)

      for (const placeholder of placeholders) {
        if ((!input || !isKeyOf(input, placeholder)) && (!replacements || !isKeyOf(replacements, placeholder))) {
          return queueErrorAndReturn(
            `Missing replacement for placeholder $c{{ ${placeholder} }} in $c{{ ${path} }}`,
            `\n\nPattern: $c{{ ${pattern} }}`,
          )
        }
      }
    }
  }

  return true
}

export function clearCachedTranslatableStrings(path: string) {
  delete cachedTranslatableStrings[path]
}
