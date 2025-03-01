import zeptomatch from 'zeptomatch'
import { LimitedSizeObject } from '../object/LimitedSizeObject'
import { withoutTrailingSlash } from './path'

export interface PathMatcherOptions {
  /**
   * List of glob patterns to include in path matching.
   * Include patterns are tested first.
   *
   * @default
   * []
   *
   * @example
   * ```ts
   * [
   *   '/products/**',
   *   '/cart',
   * ]
   * ```
   */
  include?: string[]

  /**
   * List of glob patterns to exclude from path matching.
   * Exclude patterns are tested after `include` patterns.
   *
   * @default
   * []
   *
   * @example
   * ```ts
   * [
   *   '/products/test/**',
   * ]
   * ```
   */
  exclude?: string[]

  /**
   * The maximum number of matches to cache.
   *
   * @default 10000
   */
  limit?: number
}

/**
 * Class for matching paths against multiple glob patterns with built-in caching.
 *
 * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
 * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
 *
 * @example
 * ```
 * const matcher = new PathMatcher({
 *   include: ['*.js'],
 *   exclude: ['_*.js'],
 * })
 *
 * console.log(matcher.test('index.js'))  // true
 * console.log(matcher.test('index.ts'))  // false
 * console.log(matcher.test('_index.js')) // false
 * ```
 */
export class PathMatcher {
  protected include: string[] = []
  protected exclude: string[] = []
  protected regexpCache: Record<string, RegExp> = {}
  protected matchesCache!: LimitedSizeObject<boolean>

  constructor(options: PathMatcherOptions = {}) {
    this.setOptions(options)
  }

  /**
   * Sets the path matching options.
   * Clears any existing match cache after updating.
   */
  setOptions(options: PathMatcherOptions): this {
    this.include = options.include ?? []
    this.exclude = options.exclude ?? []
    this.matchesCache = new LimitedSizeObject<boolean>(options.limit ?? 10000)
    return this
  }

  /**
   * Tests if a `path` matches the include patterns and doesn't match exclude patterns.
   * Results are cached.
   *
   * @example
   * ```ts
   * const matcher = new PathMatcher({
   *   include: ['*.js'],
   *   exclude: ['_*.js'],
   * })
   *
   * console.log(matcher.test('index.js'))  // true
   * console.log(matcher.test('index.ts'))  // false
   * console.log(matcher.test('_index.js')) // false
   * ```
   */
  test(path: string): boolean {
    const normalizedPath = withoutTrailingSlash(path)

    if (!this.matchesCache.has(normalizedPath)) {
      for (const glob of this.include) {
        if (!this.regexp(glob).test(normalizedPath)) {
          this.matchesCache.set(normalizedPath, false)
          break
        }
      }
    }

    if (!this.matchesCache.has(normalizedPath)) {
      for (const glob of this.exclude) {
        if (this.regexp(glob).test(normalizedPath)) {
          this.matchesCache.set(normalizedPath, false)
          break
        }
      }
    }

    if (!this.matchesCache.has(normalizedPath)) {
      this.matchesCache.set(normalizedPath, true)
    }

    return this.matchesCache.get(normalizedPath)!
  }

  /**
   * Returns the cached `RegExp` for a given glob pattern.
   * The glob pattern is compiled using `zeptomatch`.
   */
  protected regexp(glob: string): RegExp {
    if (!this.regexpCache[glob]) {
      this.regexpCache[glob] = zeptomatch.compile(glob)
    }

    return this.regexpCache[glob]
  }
}
