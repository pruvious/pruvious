import type { ConsolaReporter } from 'consola'
import { consola } from 'consola'
import process from 'node:process'

function wrapReporter(reporter: ConsolaReporter) {
  return {
    log(logObj, ctx) {
      if (!logObj.args || !logObj.args.length) {
        return
      }
      const msg = logObj.args[0]
      if (typeof msg === 'string' && !process.env.DEBUG) {
        // Suppress warning about native Node.js fetch
        if (msg.includes('ExperimentalWarning: The Fetch API is an experimental feature')) {
          return
        }
      }
      return reporter.log(logObj, ctx)
    },
  } satisfies ConsolaReporter
}

export function setupGlobalConsole() {
  consola.options.reporters = consola.options.reporters.map(wrapReporter)
  consola.wrapConsole()
  process.on('unhandledRejection', (err) => consola.error('[unhandledRejection]', err))
  process.on('uncaughtException', (err) => consola.error('[uncaughtException]', err))
}

export { colors } from 'consola/utils'
