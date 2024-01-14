import { useLogger } from '@nuxt/kit'
import { cyan, green, red, underline, yellow } from 'colorette'
import { clearArray } from '../utils/array'

const queue: { level: 'error' | 'info' | 'success' | 'warn'; message: any; args: any[] }[] = []

export function log(message: any, ...args: any[]) {
  useLogger('pruvious').log(applyFormats(message, ...args))
}

export function error(message: any, ...args: any[]) {
  useLogger('pruvious').error(applyFormats(message, ...args))
}

export function info(message: any, ...args: any[]) {
  useLogger('pruvious').info(applyFormats(message, ...args))
}

export function success(message: any, ...args: any[]) {
  useLogger('pruvious').success(applyFormats(message, ...args))
}

export function warn(message: any, ...args: any[]) {
  useLogger('pruvious').warn(applyFormats(message, ...args))
}

export function queueError(message: any, ...args: any[]) {
  queue.push({ level: 'error', message, args })
}

export function queueInfo(message: any, ...args: any[]) {
  queue.push({ level: 'info', message, args })
}

export function queueSuccess(message: any, ...args: any[]) {
  queue.push({ level: 'success', message, args })
}

export function queueWarn(message: any, ...args: any[]) {
  queue.push({ level: 'warn', message, args })
}

export function clearLogQueue() {
  clearArray(queue)
}

export function processLogQueue() {
  for (const { level, message, args } of queue) {
    useLogger('pruvious')[level](applyFormats(message, ...args))
  }

  clearLogQueue()
}

export function applyFormats(message: any, ...args: any[]): string {
  return [message, ...args]
    .map((text) =>
      text
        ?.toString()
        .replace(/\$(c|g|r|u|y){{(.+?)}}/g, (_: string, f: 'c' | 'g' | 'r' | 'u' | 'y', value: string) => {
          const trimmed = value.trim()
          return f === 'c'
            ? cyan(trimmed)
            : f === 'g'
            ? green(trimmed)
            : f === 'r'
            ? red(trimmed)
            : f === 'u'
            ? underline(trimmed)
            : yellow(trimmed)
        }),
    )
    .join(' ')
}
