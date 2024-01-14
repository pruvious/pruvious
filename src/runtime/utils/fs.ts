import { toArray } from '@antfu/utils'
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import fse from 'fs-extra'
import { dirname, join, relative, resolve } from 'path'
import { resolveAppPath, resolveModulePath } from '../instances/path'

interface FileFilter {
  startsWith?: string | string[]
  startsWithout?: string | string[]
  endsWith?: string | string[]
  endsWithout?: string | string[]
}

/**
 * Recursively walks through a `directory` and yields all files that match the provided `filter`.
 */
export function* walkDir(
  directory: string,
  filter: FileFilter = {},
  rootDirectory?: string,
): IterableIterator<{ file: string; directory: string; fullPath: string; relativePath: string }> {
  rootDirectory ||= directory

  for (const file of readdirSync(directory)) {
    const fullPath = resolve(directory, file)
    const stats = lstatSync(fullPath)

    if (stats.isFile()) {
      if (
        (!filter.startsWith || toArray(filter.startsWith).some((v) => file.startsWith(v))) &&
        (!filter.startsWithout || toArray(filter.startsWithout).every((v) => !file.startsWith(v))) &&
        (!filter.endsWith || toArray(filter.endsWith).some((v) => file.endsWith(v))) &&
        (!filter.endsWithout || toArray(filter.endsWithout).every((v) => !file.endsWith(v)))
      ) {
        yield { file, directory, fullPath, relativePath: join(relative(rootDirectory, directory), file) }
      }
    } else if (stats.isDirectory()) {
      yield* walkDir(fullPath, filter, rootDirectory)
    }
  }
}

/**
 * Write the specified content to a file, but only if it differs from the current content.
 */
export function write(file: string, content: string) {
  fse.ensureDirSync(dirname(file))

  if (!existsSync(file) || readFileSync(file, 'utf-8') !== content) {
    writeFileSync(file, content)
  }
}

/**
 * Remove all files in a `directory`, except for the ones defined in the `except` parameter.
 */
export function removeExcept(directory: string, except: string[]) {
  fse.ensureDirSync(directory)

  for (const file of readdirSync(directory)) {
    if (!except.includes(file)) {
      fse.removeSync(resolve(directory, file))
    }
  }
}

/**
 * Create a relative module import path.
 */
export function relativeImport(fromDir: string, to: string) {
  return relative(fromDir, to)
    .replaceAll('\\', '/')
    .replace(/\.(?:mjs|\.d\.ts|ts)$/, '')
}

/**
 * Create a relative `.pruvious` module import path.
 */
export function relativeDotPruviousImport(...modulePath: string[]) {
  const dotPruviousPath = resolveAppPath('./.pruvious')
  return relativeImport(dotPruviousPath, resolveModulePath(...modulePath))
}
