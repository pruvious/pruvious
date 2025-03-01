import { expect, test } from 'vitest'
import { PathMatcher } from '../../src'

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
})
