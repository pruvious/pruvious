import type { Resolvable } from 'citty'
import { cleanDoubleSlashes, joinURL, withoutTrailingSlash } from 'ufo'

export function sortArgs<T extends Resolvable<any>>(args: T): T {
  return Object.fromEntries(Object.entries(args as any).sort(([a], [b]) => a.localeCompare(b))) as T
}

export function isHostname(value: string) {
  try {
    return new URL(`http://${value}`).hostname === value
  } catch {
    return false
  }
}

export function isSlug(value: string) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function slugify(string: string) {
  return string.normalize().trim().replace(/\s+/g, '-').toLowerCase()
}

export function joinRouteParts(...parts: string[]): string {
  const parsedParts = parts.filter(Boolean).map((part) => part.replaceAll('\\', '/'))

  if (parsedParts[0]?.includes(':')) {
    parsedParts[0] = parsedParts[0].replace(/^[a-z]:[\\\/]/i, '')
  }

  return withoutTrailingSlash(cleanDoubleSlashes(joinURL('/', ...parsedParts)))
}

export function convertBytesToM(bytes: number) {
  const megabytes = Math.ceil(bytes / (1024 * 1024))
  return `${megabytes}M`
}
