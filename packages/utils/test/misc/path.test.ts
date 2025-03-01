import { expect, test } from 'vitest'
import {
  resolveRelativeDotNotation,
  withLeadingSlash,
  withoutLeadingSlash,
  withoutTrailingSlash,
  withTrailingSlash,
} from '../../src'

test('relative dot notation', async () => {
  expect(resolveRelativeDotNotation('foo', 'bar')).toBe('bar')
  expect(resolveRelativeDotNotation('foo', './bar')).toBe('bar')
  expect(resolveRelativeDotNotation('foo.baz', 'bar')).toBe('foo.bar')
  expect(resolveRelativeDotNotation('foo.baz', '/bar')).toBe('bar')
  expect(resolveRelativeDotNotation('foo.0.baz', '../1.bar')).toBe('foo.1.bar')
  expect(resolveRelativeDotNotation('foo', '../bar')).toBe('bar')
  expect(resolveRelativeDotNotation('foo', '../bar.baz')).toBe('bar.baz')
})

test('with leading slash', () => {
  expect(withLeadingSlash('foo')).toBe('/foo')
  expect(withLeadingSlash('/foo')).toBe('/foo')
  expect(withLeadingSlash('//foo')).toBe('/foo')
})

test('without leading slash', () => {
  expect(withoutLeadingSlash('foo')).toBe('foo')
  expect(withoutLeadingSlash('/foo')).toBe('foo')
  expect(withoutLeadingSlash('//foo')).toBe('foo')
})

test('with trailing slash', () => {
  expect(withTrailingSlash('foo')).toBe('foo/')
  expect(withTrailingSlash('foo/')).toBe('foo/')
  expect(withTrailingSlash('foo//')).toBe('foo/')
})

test('without trailing slash', () => {
  expect(withoutTrailingSlash('foo')).toBe('foo')
  expect(withoutTrailingSlash('foo/')).toBe('foo')
  expect(withoutTrailingSlash('foo//')).toBe('foo')
})
