import { __ } from '#pruvious/client'
import type { LogsDatabase } from '#pruvious/server'
import { isEmpty } from '@pruvious/utils'

/**
 * Formats a JSON string with proper indentation and spacing.
 * If the input is not valid JSON, returns the original string unchanged.
 */
export function beautifyCode(code: string) {
  try {
    return JSON.stringify(JSON.parse(code), null, 2)
  } catch {
    return code
  }
}

/**
 * Formats a query string with proper indentation and spacing.
 * If the input is not a valid query string, returns the original string unchanged.
 */
export function beautifyQueryString(qs: string) {
  try {
    const params = new URLSearchParams(qs)
    return JSON.stringify(Object.fromEntries(params), null, 2)
  } catch {
    return qs
  }
}

/**
 * Formats a SQL query with proper indentation and spacing for better readability.
 * Includes query details, parameters, execution results, and timing information.
 */
export function beautifyQuery(query: { id: number } & LogsDatabase['collections']['Queries']['TCastedTypes']) {
  const output: string[] = [__('pruvious-dashboard', 'SQL') + ':', `> ${query.sql}`]
  const hasParameters = !isEmpty(query.params)

  if (hasParameters) {
    output.push('', __('pruvious-dashboard', 'Parameters') + ':')
    JSON.stringify(query.params, null, 2)
      .split('\n')
      .forEach((param) => output.push(`> ${param}`))
  }

  output.push('', __('pruvious-dashboard', 'Output (database)') + ':')
  try {
    JSON.stringify(JSON.parse(query.rawResult!), null, 2)
      .split('\n')
      .forEach((line) => output.push(`> ${line}`))
  } catch {
    output.push(`> ${query.rawResult}`)
  }

  output.push('', __('pruvious-dashboard', 'Output (ORM)') + ':')
  JSON.stringify(query.result, null, 2)
    .split('\n')
    .forEach((line) => output.push(`> ${line}`))

  output.push(
    '',
    __('pruvious-dashboard', 'Execution time') + ':',
    `> ${query.executionTime}ms`,
    '',
    __('pruvious-dashboard', 'Query debug ID') + ':',
    `> ${query.queryDebugId}`,
  )

  return output.join('\n')
}
