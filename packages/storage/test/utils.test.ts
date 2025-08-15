import { expect, test } from 'vitest'
import { normalizePath, parsePath } from '../src'

test('normalize path', () => {
  expect(normalizePath('foo')).toBe('/foo')
  expect(normalizePath(' FOO ')).toBe('/foo')
  expect(normalizePath('foo . txt')).toBe('/foo.txt')
  expect(normalizePath('foo.')).toBe('/foo')
  expect(normalizePath('foo/bar')).toBe('/foo/bar')
  expect(normalizePath('//foo///bar//')).toBe('/foo/bar')
  expect(normalizePath('[]/foo')).toBe('/foo')
  expect(normalizePath('path/TO//MyImage.webp')).toBe('/path/to/my-image.webp')
  expect(normalizePath('/folder/SUB%20Folder/doc%20file.PDF')).toBe('/folder/sub-folder/doc-file.pdf')
  expect(normalizePath('foo_bar/foo_bar')).toBe('/foo-bar/foo_bar')
  expect(normalizePath('foo_bar/foo_bar.baz')).toBe('/foo-bar/foo_bar.baz')
})

test('parse path', () => {
  expect(parsePath('foo')).toEqual({ path: '/foo', dir: '/', name: 'foo', ext: '' })
  expect(parsePath('path/TO//MyImage.webp')).toEqual({
    path: '/path/to/my-image.webp',
    dir: '/path/to',
    name: 'my-image.webp',
    ext: 'webp',
  })
  expect(parsePath('/folder/SUB%20Folder/doc%20file.PDF')).toEqual({
    path: '/folder/sub-folder/doc-file.pdf',
    dir: '/folder/sub-folder',
    name: 'doc-file.pdf',
    ext: 'pdf',
  })
})
