import jiti, { type JITI } from 'jiti'
import { platform } from 'os'
import { resolveAppPath } from './path'

let jit: JITI

function init() {
  const appPath = resolveAppPath()

  jit = jiti(resolveAppPath(), {
    alias: {
      '#pruvious': resolveAppPath('./.pruvious/index.ts'),
      '#pruvious/blocks': resolveAppPath('./.pruvious/blocks/index.ts'),
      '#pruvious/client': resolveAppPath('./.pruvious/client.ts'),
      '#pruvious/collections': resolveAppPath('./.pruvious/collections.ts'),
      '#pruvious/dashboard': resolveAppPath('./.pruvious/dashboard.ts'),
      '#pruvious/icons': resolveAppPath('./.pruvious/icons.ts'),
      '#pruvious/layouts': resolveAppPath('./.pruvious/layouts/index.ts'),
      '#pruvious/preflight': resolveAppPath('./.pruvious/preflight.ts'),
      '#pruvious/server': resolveAppPath('./.pruvious/server.ts'),
      '#pruvious/standard': resolveAppPath('./.pruvious/standard.ts'),
      '~': appPath,
      '~~': appPath,
      '@': appPath,
      '@@': appPath,
    },
    esmResolve: true,
    sourceMaps: false,
  })
}

export function evaluate(path: string) {
  init()
  return jit(path)
}

export function evaluateModule(filename: string, code: string): any {
  init()
  const dotPruviousServerPath = resolveAppPath('./.pruvious/server.ts').replaceAll('\\', '/')

  return jit.evalModule(code, {
    filename,
    ext: '.ts',
    cache: {
      [dotPruviousServerPath]: {
        children: [],
        exports: {},
        filename: 'server.ts',
        id: dotPruviousServerPath,
        isPreloading: false,
        loaded: true,
        parent: null,
        path: dotPruviousServerPath,
        paths: [],
        require: {} as any,
      },
    },
  })
}

export function hasEvalCache(path: string) {
  init()
  return !!jit.cache[path]
}

export function clearEvalCache(path: string) {
  init()

  delete jit.cache[path]

  if (platform() === 'win32') {
    delete jit.cache[path.replaceAll('\\', '/')]
  }
}

export function clearAppEvalCache() {
  init()

  const isWin = platform() === 'win32'
  const cache = isWin ? jit.cache : Object.keys(jit.cache)
  const search = resolveAppPath()
  const searchWin = search.replaceAll('\\', '/')

  for (const path in cache) {
    if (path.startsWith(search) || (isWin && path.startsWith(searchWin))) {
      delete jit.cache[path]
    }
  }
}
