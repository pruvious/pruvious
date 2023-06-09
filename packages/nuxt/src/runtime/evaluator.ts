const globalVariables = [
  '__dirname',
  '__filename',
  '_',
  'abortController',
  'abortSignal',
  'atob',
  'BroadcastChannel',
  'btoa',
  'Buffer',
  'clearImmediate',
  'clearInterval',
  'clearTimeout',
  'console',
  'crypto',
  'Crypto',
  'CryptoKey',
  'CustomEvent',
  'document',
  'DOMException',
  'eval',
  'Event',
  'EventTarget',
  'exports',
  'fetch',
  'FormData',
  'Function',
  'global',
  'GLOBAL',
  'Headers',
  'localStorage',
  'MessageChannel',
  'MessageEvent',
  'MessagePort',
  'module',
  'performance',
  'PerformanceEntry',
  'PerformanceMark',
  'PerformanceMeasure',
  'PerformanceObserver',
  'PerformanceObserverEntryList',
  'PerformanceResourceTiming',
  'process',
  'queueMicrotask',
  'Request',
  'require',
  'Response',
  'root',
  'setImmediate',
  'setInterval',
  'setTimeout',
  'structuredClone',
  'SubtleCrypto',
  'TextDecoder',
  'TextEncoder',
  'WebAssembly',
  'window',
]

export function evaluate(expression: string, variables: { [name: string]: any } = {}): any {
  let declarations = globalVariables.map((name) => `let ${name} = null`).join('\n')

  for (const name in variables) {
    let prefix = ''

    if (!globalVariables.includes(name)) {
      prefix += 'let '
    }

    declarations += `\n${prefix}${name} = ${JSON.stringify(variables[name])}`
  }

  try {
    return Function(`${declarations}\nreturn ${expression}`).call({})
  } catch (_) {
    return undefined
  }
}

export function evaluateBoolean(
  expression: string,
  variables: { [name: string]: any } = {},
): boolean {
  return !!evaluate(expression, variables)
}
