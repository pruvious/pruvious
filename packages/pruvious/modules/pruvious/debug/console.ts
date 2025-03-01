import { toArray } from '@pruvious/utils'
import { type InputLogObject, createConsola } from 'consola'
import { colorize } from 'consola/utils'

export const logger = createConsola().withTag('pruvious')
export const debugLogger = createConsola({ level: 4 }).withTag('pruvious')

let verbose = false
let errorCount = 0

/**
 * Logs a success message.
 */
export function success(message: InputLogObject | any, ...args: any[]) {
  logger.success(message, ...args)
}

/**
 * Logs an error message.
 */
export function error(message: InputLogObject | any, ...args: any[]) {
  errorCount++
  logger.error(message, ...args)
}

/**
 * Logs a warning message.
 */
export function warn(message: InputLogObject | any, ...args: any[]) {
  logger.warn(message, ...args)
}

/**
 * Logs a warning message with supplementary context lines.
 */
export function warnWithContext(message: string, context: string[]) {
  if (context.length) {
    message += '\n'
    message += context.map((line) => `\n - ${line}`).join('')
  }
  warn(message)
}

/**
 * Logs an informational message.
 */
export function info(message: InputLogObject | any, ...args: any[]) {
  logger.info(message, ...args)
}

/**
 * Logs a message.
 */
export function log(message: InputLogObject | any, ...args: any[]) {
  logger.log(message, ...args)
}

/**
 * Logs a message with a box around it.
 */
export function box(message: InputLogObject | any, ...args: any[]) {
  logger.box(message, ...args)
}

/**
 * Logs an error message with a box around it.
 */
export function errorBox(errorMessage: string, additionalLines?: string | string[], source?: string) {
  const message = [`${colorize('bgRed', ' ERROR ')} ${errorMessage}`]

  if (additionalLines?.length) {
    message.push('')
    message.push(...toArray(additionalLines))
  }

  if (source) {
    message.push('')
    message.push(colorize('dim', `Source: ${source}`))
  }

  errorCount++
  logger.box(message.join('\n'))
}

/**
 * Logs a debug message if `debug.verbose` is enabled.
 */
export function debug(message: InputLogObject | any, ...args: any[]) {
  if (verbose) {
    const colorizedMessage = [message, ...args].join(' ').replace(/<([^>]+)>/g, (_, text) => colorize('dim', text))
    debugLogger.debug(colorizedMessage)
  }
}

/**
 * Enables or disable verbose logging.
 */
export function setVerbose(value: boolean | undefined) {
  verbose = !!value
}

/**
 * Sets the error count to a specific `value`.
 */
export function setErrorCount(value: number) {
  errorCount = value
}

/**
 * Retrieves the error count.
 */
export function getErrorCount() {
  return errorCount
}

/**
 * Sets the error count to `0`.
 */
export function resetErrorCount() {
  errorCount = 0
}
