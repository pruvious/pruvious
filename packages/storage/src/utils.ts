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
 * const normalized = normalizePath('file.txt')
 * //=> '/file.txt'
 *
 * const normalized = normalizePath('path/TO//MyImage.webp')
 * //=> '/path/to/my-image.webp'
 *
 * const normalized = normalizePath('/folder/SUB%20Folder/doc%20file.PDF')
 * //=> '/folder/sub-folder/doc-file.pdf'
 * ```
 */
export function normalizePath(path: string) {
  if (!isString(path)) {
    throw new Error('Invalid path')
  }

  const parts = withoutLeadingSlash(withoutTrailingSlash(decodeURIComponent(path)))
    .split('/')
    .filter(Boolean)

  const normalized = parts
    .map((part, i) => {
      if (i === parts.length - 1) {
        const dotIndex = part.lastIndexOf('.')

        if (dotIndex > -1 && dotIndex < part.length - 1) {
          const name = part.slice(0, dotIndex)
          const ext = part.slice(dotIndex + 1)
          const slugName = slugify(name)
          const slugExt = snakeCase(ext)
          return `${slugName === name.replaceAll('_', '-') ? name : slugName}.${slugExt}`
        }

        const slug = slugify(part)
        return slug === part.replaceAll('_', '-') ? part : slug
      }

      return slugify(part)
    })
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
 */
export function tryNormalizePath(path: string) {
  try {
    return normalizePath(path)
  } catch {
    return path
  }
}

/**
 * Parse a file `path` into its components.
 *
 * @example
 * ```ts
 * const parsed = instance.parse('file.txt')
 * // {
 * //   path: '/file.txt',
 * //   dir: '/',
 * //   name: 'file.txt',
 * //   ext: 'txt',
 * // }
 *
 *
 * const sanitized = instance.parse('path/TO//MyImage.webp')
 * // {
 * //   path: '/path/to/my-image.webp',
 * //   dir: '/path/to',
 * //   name: 'my-image.webp',
 * //   ext: 'webp',
 * // }
 * ```
 */
export function parsePath(path: string): StorageFileLocation {
  const normalizedPath = normalizePath(path)

  return {
    path: normalizedPath,
    dir: dirname(normalizedPath),
    name: basename(normalizedPath),
    ext: extname(normalizedPath).slice(1),
  }
}
