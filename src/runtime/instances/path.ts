import { useNuxt, type Resolver } from '@nuxt/kit'
import { existsSync } from 'fs'
import { relative, resolve } from 'path'

let moduleResolver: Resolver | undefined

export function resolveAppPath(...path: string[]): string {
  try {
    return resolve(useNuxt().options.rootDir, ...path)
  } catch {}

  return resolve(process.cwd(), ...path)
}

export function resolveRelativeAppPath(...path: string[]): string {
  const relativePath = relative(process.cwd(), resolveAppPath(...path))
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
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

export function appPathExists(...path: string[]): boolean {
  return existsSync(resolveAppPath(...path))
}
