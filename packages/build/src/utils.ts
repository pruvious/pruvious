import { codeFrameColumns } from '@babel/code-frame'
import { uppercaseFirstLetter } from '@pruvious-test/utils'
import pc from 'picocolors'
import { Message } from './types'

export function log(message: Message): void {
  const messages: string[] = [message.text]

  if (message.subject) {
    const color = message.color ? pc[message.color] : pc.cyan
    messages.unshift(pc.bold(color(message.subject)))
  }

  if (message.timestamp) {
    const time = new Date(message.timestamp).toLocaleTimeString()
    messages.unshift(pc.gray(`[${time}]`))
  }

  console.log(...messages)
}

export function codeFrame(
  message: string,
  path: string,
  code: string,
  start: [line: number, column: number] | { line: number; column: number },
  end: [line: number, column: number] | { line: number; column: number },
  severity: 'error' | 'warn' | 'info',
  silent: boolean = false,
): string {
  const color = severity === 'error' ? pc.red : severity === 'warn' ? pc.yellow : pc.cyan
  const bgColor = severity === 'error' ? pc.bgRed : severity === 'warn' ? pc.bgYellow : pc.bgCyan
  const location = {
    start: Array.isArray(start) ? { line: start[0], column: start[1] } : start,
    end: Array.isArray(end) ? { line: end[0], column: end[1] } : end,
  }
  const frame = codeFrameColumns(code, location)
    .replace(/^( *\|\s*)(\^+)/gm, `$1${color('$2')}`)
    .replace(/^(> *[0-9]*)( *\|)/gm, color('$1') + pc.gray('$2'))
    .replace(/^( *[0-9]* *\|)/gm, pc.gray('$1'))

  const output = [
    '',
    bgColor(' '.repeat(severity.length + 2)) +
      ' ' +
      pc.gray(`${path}:${location.start.line}:${location.start.column}`),
    bgColor(` ${pc.black(uppercaseFirstLetter(severity))} `) + ' ' + color(message),
    frame,
  ].join('\n')

  if (!silent) {
    console.log(output)
  }

  return output
}
