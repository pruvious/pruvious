import { expect, test } from 'vitest'
import { normalizePath, parsePath, tryNormalizePath } from '../src'

test('normalize path', () => {
  expect(normalizePath('foo', 'directory')).toBe('/foo')
  expect(normalizePath(' FOO ', 'directory')).toBe('/foo')
  expect(normalizePath('foo . txt', 'file')).toBe('/foo.txt')
  expect(normalizePath('foo . txt', 'directory')).toBe('/foo-txt')
  expect(normalizePath('foo.', 'file')).toBe('/foo')
  expect(normalizePath('foo/bar', 'directory')).toBe('/foo/bar')
  expect(normalizePath('//foo///bar//', 'directory')).toBe('/foo/bar')
  expect(normalizePath('[]/foo', 'directory')).toBe('/foo')
  expect(normalizePath('path/TO//MyImage.webp', 'file')).toBe('/path/to/my-image.webp')
  expect(normalizePath('/folder/SUB%20Folder/doc%20file.PDF', 'file')).toBe('/folder/sub-folder/doc-file.pdf')
  expect(normalizePath('foo_bar/foo_bar', 'file')).toBe('/foo-bar/foo-bar')
  expect(normalizePath('foo_bar/foo_bar', 'directory')).toBe('/foo-bar/foo-bar')
  expect(normalizePath('foo_bar/foo_bar.baz', 'file')).toBe('/foo-bar/foo-bar.baz')
  expect(normalizePath('/foo.bar/foo.bar.txt', 'file')).toBe('/foo-bar/foo.bar.txt')
  expect(normalizePath('/foo.bar/foo.bar.txt', 'directory')).toBe('/foo-bar/foo-bar-txt')
  expect(() => normalizePath('???', 'file')).toThrow()

  expect(tryNormalizePath('foo/BAR', 'file')).toBe('/foo/bar')
  expect(tryNormalizePath('???', 'file')).toBe('???')
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
