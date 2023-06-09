/**
 * Get the longest common path from specified `paths`.
 *
 * @example
 * getSharedPathStart('/foo', '/foo/bar') // '/foo'
 */
export function getSharedPathStart(...paths: string[]): string {
  const A = paths.sort()
  const a1 = A[0]
  const a2 = A[A.length - 1]
  const L = a1.length

  let i = 0

  while (i < L && a1.charAt(i) === a2.charAt(i)) {
    i++
  }

  let shared = a1.substring(0, i)

  if (A.some((T) => T.length > shared.length && !T.startsWith(`${shared}/`))) {
    shared = shared.split('/').slice(0, -1).join('/')
  }

  return shared
}

/**
 * Check if a `value` is a valid URL.
 *
 * @example
 * isUrl('http://foo.bar') // true
 * isUrl('foo.bar') // false
 */
export function isUrl(value: string): boolean {
  try {
    if (new URL(value).href.replace(/\/$/, '') === value.replace(/\/$/, '')) {
      return true
    }
  } catch (_) {}

  return false
}

/**
 * Check if a `value` is a valid URL path.
 *
 * @example
 * isUrlPath('/foo') // true
 * isUrlPath('foo') // false
 * isUrlPath('foo', true) // true
 */
export function isUrlPath(value: string, allowRelative: boolean = false): boolean {
  try {
    const url = new URL(value, 'http://__pruvious')

    if (
      !value.includes('//') &&
      (url.pathname === value || (allowRelative && url.pathname.slice(1) === value))
    ) {
      return true
    }
  } catch (_) {}

  return false
}

/**
 * Make a `relativePath` absolute.
 *
 * @example
 * resolvePath('../', '/foo/bar') // 'foo'
 */
export function resolvePath(relativePath: string, target: string): string {
  try {
    return new URL(
      relativePath,
      `http://__pruvious/${target.replace(/\/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '')}`,
    ).pathname
  } catch (_) {
    return relativePath
  }
}
