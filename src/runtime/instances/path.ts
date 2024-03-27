import { type Resolver } from '@nuxt/kit'
import { existsSync } from 'fs'
import { join, relative, resolve } from 'path'
import { getModuleOption } from './state'

let moduleResolver: Resolver | undefined
let rootDir: string = ''

export function resolveAppPath(...path: string[]): string {
  return resolve(rootDir, ...path)
}

export function resolveRelativeAppPath(...path: string[]): string {
  const relativePath = relative(process.cwd(), resolveAppPath(...path))
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

export function resolveLayerPath(...path: string[]): string {
  const joined = join(...path)

  for (const layer of getModuleOption('layers')) {
    const resolved = resolve(layer, joined)

    if (existsSync(resolved)) {
      return resolved
    }
  }

  throw new Error(`Unable to resolve path ${joined.startsWith('.') ? joined : `./${joined}`}`)
}

export function resolveModulePath(...path: string[]): string {
  if (!moduleResolver) {
    throw new Error(`Module resolver is not instantiated.`)
  }

  return resolve(moduleResolver.resolve(...path))
}

export function resolveRelativeModulePath(...path: string[]): string {
  const relativePath = relative(process.cwd(), resolveModulePath(...path))
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

export function initModulePathResolver(resolver: Resolver) {
  moduleResolver = resolver
}

export function initRootDir(dir: string) {
  rootDir = dir
}

export function appPathExists(...path: string[]): boolean {
  return existsSync(resolveAppPath(...path))
}
