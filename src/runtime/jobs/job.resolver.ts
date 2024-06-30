import fs from 'fs-extra'
import { resolve } from 'path'
import { evaluateModule } from '../instances/evaluator'
import { queueError } from '../instances/logger'
import { resolveAppPath, resolveModulePath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { isUndefined } from '../utils/common'
import { walkDir } from '../utils/fs'
import type { ResolvedJobDefinition } from './job.definition'

export interface ResolvedJob {
  definition: ResolvedJobDefinition<any>
  source: string
  isStandard: boolean
}

// <filePath, exports>
const cachedJobs: Record<string, any> = {}

export function resolveJobs(): { records: Record<string, ResolvedJob>; errors: number } {
  const records: Record<string, ResolvedJob> = {}
  const fromModule = resolveModulePath('./runtime/jobs/standard')
  const fromApp = resolveAppPath('./jobs')
  const registeredStandardJobs: Record<string, boolean> = getModuleOption('standardJobs')

  let errors = 0

  for (const { fullPath, file } of walkDir(fromModule, { endsWith: ['.js', '.ts'], endsWithout: '.d.ts' })) {
    if (registeredStandardJobs[file.split('.')[0]]) {
      errors += resolveJob(fullPath, records, true)
    }
  }

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath } of walkDir(fromApp, { endsWith: '.ts', endsWithout: '.d.ts' })) {
      errors += resolveJob(fullPath, records, false)
    }
  }

  for (const layer of getModuleOption('layers').slice(1)) {
    if (fs.existsSync(resolve(layer, 'jobs'))) {
      for (const { fullPath } of walkDir(resolve(layer, 'jobs'), {
        endsWith: ['.ts'],
        endsWithout: '.d.ts',
      })) {
        errors += resolveJob(fullPath, records, false, true)
      }
    }
  }

  return { records, errors }
}

function resolveJob(
  filePath: string,
  records: Record<string, ResolvedJob>,
  isStandard: boolean,
  ignoreDuplicate = false,
): 0 | 1 {
  try {
    let exports = cachedJobs[filePath]

    if (isUndefined(exports)) {
      let code = fs.readFileSync(filePath, 'utf-8')
      const hasLocalImports = /^\s*import.+['""](?:\.|~~|~|@@|@)/m.test(code)

      if (!isStandard && !/^\s*import.+defineJob.+pruvious/m.test(code)) {
        code += "import { defineJob } from '#pruvious'\n"
      }

      exports = evaluateModule(filePath, code)

      if (isStandard || !hasLocalImports) {
        cachedJobs[filePath] = exports
      }
    }

    if (records[exports.default.name]) {
      if (ignoreDuplicate) {
        return 0
      } else {
        queueError(`Cannot register duplicate job name $c{{ ${exports.default.name} }} in $c{{ ${filePath} }}`)
      }
    } else {
      records[filePath] = { definition: exports.default, source: filePath, isStandard }
      return 0
    }
  } catch (e) {
    queueError(`Cannot define job in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export function clearCachedJob(path: string) {
  delete cachedJobs[path]
}
