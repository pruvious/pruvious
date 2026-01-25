import type { Range, RangeOptions, SemVer } from 'semver'
import valid from 'semver/functions/valid.js'

/**
 * Check if a version satisfies a given semver range.
 */
export async function satisfiesVersion(
  version: string | SemVer,
  range: string | Range,
  options?: boolean | RangeOptions,
) {
  const satisfies = await import('semver/functions/satisfies.js').then(
    (r) => r.default || (r as any as typeof import('semver/functions/satisfies.js')),
  ) // npm/node-semver#381
  return satisfies(version, range, options)
}

/**
 * Validate if a version string is a valid semver version.
 */
export function isValidVersion(version: string) {
  return valid(version)
}
