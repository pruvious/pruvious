import { last } from '../array/op'

/**
 * Resolves a relative path using dot notation based on `from` and `to` paths.
 *
 * @example
 * ```ts
 * resolveRelativeDotNotation('foo', 'bar')            // 'bar'
 * resolveRelativeDotNotation('foo', './bar')          // 'bar'
 * resolveRelativeDotNotation('foo.baz', 'bar')        // 'foo.bar'
 * resolveRelativeDotNotation('foo.baz', '/bar')       // 'bar'
 * resolveRelativeDotNotation('foo.0.baz', '../1.bar') // 'foo.1.bar'
 * resolveRelativeDotNotation('foo', '../bar')         // 'bar'
 * ```
 */
export function resolveRelativeDotNotation(from: string, to: string) {
  if (to.startsWith('/')) {
    return to.slice(1)
  }

  const result = from.split('.').slice(0, -1)
  const toParts = to.split('/')

  if (!last(toParts)!.startsWith('.')) {
    toParts.splice(-1, 1, ...last(toParts)!.split('.'))
  }

  for (const segment of toParts) {
    if (segment === '.') {
      continue
    } else if (segment === '..') {
      if (result.length > 0) {
        result.pop()
      }
    } else if (segment !== '') {
      result.push(segment)
    }
  }

  return result.join('.')
}

/**
 * Normalizes a path to have a single leading slash.
 *
 * @example
 * ```ts
 * withLeadingSlash('foo')   // '/foo'
 * withLeadingSlash('/foo')  // '/foo'
 * withLeadingSlash('//foo') // '/foo'
 * ```
 */
export function withLeadingSlash(path: string) {
  return '/' + path.replace(/^\/+/, '')
}

/**
 * Removes all leading slashes from a path.
 *
 * @example
 * ```ts
 * withoutLeadingSlash('foo')   // 'foo'
 * withoutLeadingSlash('/foo')  // 'foo'
 * withoutLeadingSlash('//foo') // 'foo'
 * ```
 */
export function withoutLeadingSlash(path: string) {
  return path.replace(/^\/+/, '')
}

/**
 * Normalizes a path to have a single trailing slash.
 *
 * @example
 * ```ts
 * withTrailingSlash('foo')   // 'foo/'
 * withTrailingSlash('foo/')  // 'foo/'
 * withTrailingSlash('foo//') // 'foo/'
 * ```
 */
export function withTrailingSlash(path: string) {
  return path.replace(/\/*$/, '/')
}

/**
 * Removes all trailing slashes from a path.
 *
 * @example
 * ```ts
 * withoutTrailingSlash('foo')   // 'foo'
 * withoutTrailingSlash('foo/')  // 'foo'
 * withoutTrailingSlash('foo//') // 'foo'
 * ```
 */
export function withoutTrailingSlash(path: string) {
  return path.replace(/\/+$/, '')
}
