import { useNuxt } from '@nuxt/kit'
import fs from 'fs-extra'
import { resolve } from 'path'
import { evaluateModule } from '../instances/evaluator'
import { queueError } from '../instances/logger'
import { resolveAppPath } from '../instances/path'
import { isUndefined } from '../utils/common'
import { walkDir } from '../utils/fs'
import { validateDefaultExport } from '../utils/validation'
import type { ResolvedDashboardPageDefinition } from './dashboard.definition'

export interface ResolvedDashboardPage {
  definition: ResolvedDashboardPageDefinition
  source: string
}

// <filePath, exports>
const cachedDashboardPages: Record<string, any> = {}

export function resolveDashboardPages(): { records: Record<string, ResolvedDashboardPage>; errors: number } {
  const nuxt = useNuxt()
  const records: Record<string, ResolvedDashboardPage> = {}
  const fromApp = resolveAppPath('./dashboard')

  let errors = 0

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath } of walkDir(fromApp, { endsWith: '.ts', endsWithout: '.d.ts' })) {
      errors += resolveDashboardPage(fullPath, records, false)
    }
  }

  for (const layer of nuxt.options._layers.slice(1)) {
    if (fs.existsSync(resolve(layer.cwd, 'dashboard'))) {
      for (const { fullPath } of walkDir(resolve(layer.cwd, 'dashboard'), {
        endsWith: ['.ts'],
        endsWithout: '.d.ts',
      })) {
        errors += resolveDashboardPage(fullPath, records, false, true)
      }
    }
  }

  return { records, errors }
}

function resolveDashboardPage(
  filePath: string,
  records: Record<string, ResolvedDashboardPage>,
  isStandard: boolean,
  ignoreDuplicate = false,
): 0 | 1 {
  try {
    let exports = cachedDashboardPages[filePath]

    if (isUndefined(exports)) {
      let code = fs.readFileSync(filePath, 'utf-8')
      const hasLocalImports = /^\s*import.+['""](?:\.|~~|~|@@|@)/m.test(code)

      if (!isStandard && !/^\s*import.+defineDashboardPage.+pruvious/m.test(code)) {
        code += "import { defineDashboardPage } from '#pruvious'\n"
      }

      exports = evaluateModule(filePath, code)

      if (isStandard || !hasLocalImports) {
        cachedDashboardPages[filePath] = exports
      }
    }

    if (validateDefaultExport('dashboard pages', 'defineDashboardPage({ ... })', exports, filePath)) {
      if (!records[exports.default.path] || !ignoreDuplicate) {
        records[exports.default.path] = { definition: exports.default, source: filePath }
      }

      return 0
    }
  } catch (e) {
    queueError(`Cannot define dashboard page in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export function clearCachedDashboardPages(path: string) {
  delete cachedDashboardPages[path]
}
