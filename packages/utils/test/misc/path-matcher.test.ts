import { expect, test } from 'vitest'
import { PathMatcher } from '../../src/misc/PathMatcher'

test('path matcher', async () => {
  const m1 = new PathMatcher({
    include: ['**/*.js'],
    exclude: ['**/_*.js'],
  })

  expect(m1.test('index.js')).toBe(true)
  expect(m1.test('index.ts')).toBe(false)
  expect(m1.test('_index.js')).toBe(false)
  expect(m1.test('/foo/bar/index.js')).toBe(true)
  expect(m1.test('/foo/bar/_index.js')).toBe(false)

  const m2 = new PathMatcher({
    include: ['/api/**'],
    exclude: ['/api/_*', '/api/_*/**'],
  })

  expect(m2.test('/api')).toBe(true)
  expect(m2.test('/api/')).toBe(true)
  expect(m2.test('/api/foo')).toBe(true)
  expect(m2.test('/api/_')).toBe(false)
  expect(m2.test('/api/_foo')).toBe(false)
  expect(m2.test('/api/_foo/bar')).toBe(false)
  expect(m2.test('/api/_foo/bar/baz')).toBe(false)

  // Multiple include patterns are OR-ed: a path matching any one of them passes.
  const m3 = new PathMatcher({
    include: ['/blog/**', '/products/**'],
  })

  expect(m3.test('/blog/foo')).toBe(true)
  expect(m3.test('/products/bar')).toBe(true)
  expect(m3.test('/about')).toBe(false)

  // Empty include = match anything (only excludes apply).
  const m4 = new PathMatcher({
    exclude: ['/admin/**'],
  })

  expect(m4.test('/anything')).toBe(true)
  expect(m4.test('/admin/page')).toBe(false)
})
