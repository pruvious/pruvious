import type { Resolvable } from 'citty'

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
