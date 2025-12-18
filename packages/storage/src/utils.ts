import { isString, slugify, snakeCase, withoutLeadingSlash, withoutTrailingSlash } from '@pruvious/utils'
import { basename, dirname, extname } from 'pathe'
import type { StorageFileLocation } from './types'

/**
 * Normalize a file `path` by removing leading/trailing slashes, decoding URI components,
 * and converting all parts to URL-friendly slugs.
 *
 * @throws an error if the path cannot be normalized.
 *
 * @example
 * ```ts
 * normalizePath('file.txt', 'file')
 * //=> '/file.txt'
 *
 * normalizePath('path/TO//MyImage.webp', 'file')
 * //=> '/path/to/my-image.webp'
 *
 * normalizePath('/folder/SUB%20Folder/doc%20file.PDF', 'file')
 * //=> '/folder/sub-folder/doc-file.pdf'
 * ```
 */
export function normalizePath(path: string, type: 'file' | 'directory') {
  if (!isString(path)) {
    throw new Error('Invalid path')
  }

  const parts = withoutLeadingSlash(withoutTrailingSlash(decodeURIComponent(path)))
    .split('/')
    .filter(Boolean)

  const normalized = parts
    .map((part, i) => {
      if (type === 'file' && i === parts.length - 1) {
        const lastDotIndex = part.lastIndexOf('.')

        if (lastDotIndex > -1 && lastDotIndex < part.length - 1) {
          const name = part.slice(0, lastDotIndex)
          const ext = part.slice(lastDotIndex + 1)
          const nameSlug = slugify(name, { '.': '.' })
          const extSnake = snakeCase(ext)
          return `${nameSlug}.${extSnake}`
        }

        return slugify(part)
      }

      return slugify(part)
    })
    .filter(Boolean)
    .join('/')

  if (!normalized) {
    throw new Error('Invalid path')
  }

  return `/${normalized}`
}

/**
 * Normalize a file `path` by removing leading/trailing slashes, decoding URI components,
 * and converting all parts to URL-friendly slugs.
 *
 * If the `path` cannot be normalized, it is returned as-is.
 *
 * @example
 * ```ts
 * tryNormalizePath('file.txt', 'file')
 * //=> '/file.txt'
 *
 * tryNormalizePath('path/TO//MyImage.webp', 'file')
 * //=> '/path/to/my-image.webp'
 *
 * tryNormalizePath('/folder/SUB%20Folder/doc%20file.PDF', 'file')
 * //=> '/folder/sub-folder/doc-file.pdf'
 *
 * tryNormalizePath('???', 'file')
 * //=> '???' (returned as-is)
 * ```
 */
export function tryNormalizePath(path: string, type: 'file' | 'directory'): string {
  try {
    return normalizePath(path, type)
  } catch {
    return path
  }
}

/**
 * Parse a file `path` into its components.
 *
 * @example
 * ```ts
 * parsePath('file.txt')
 * // {
 * //   path: '/file.txt',
 * //   dir: '/',
 * //   name: 'file.txt',
 * //   ext: 'txt',
 * // }
 *
 *
 * parsePath('path/TO//MyImage.webp')
 * // {
 * //   path: '/path/to/my-image.webp',
 * //   dir: '/path/to',
 * //   name: 'my-image.webp',
 * //   ext: 'webp',
 * // }
 * ```
 */
export function parsePath(path: string, type: 'file' | 'directory' = 'file'): StorageFileLocation {
  const normalizedPath = normalizePath(path, type)

  return {
    path: normalizedPath,
    dir: dirname(normalizedPath),
    name: basename(normalizedPath),
    ext: extname(normalizedPath).slice(1),
  }
}
