import { describe, expect, it } from 'vitest'
import {
  addMediaDirectories,
  deleteMediaDirectories,
  listMediaDirectory,
  listMediaDirectoryWithPath,
  moveMediaDirectory,
  renameMediaDirectory,
} from '../src/runtime/utils/dashboard/media-directory'

describe('media directory utilities', () => {
  const tree = {}

  it('adds directories', () => {
    expect(addMediaDirectories('foo/', tree)).toEqual({
      foo: { children: {} },
    })
    expect(addMediaDirectories('foo', tree)).toEqual({
      foo: { children: {} },
    })
    expect(addMediaDirectories('/bar', tree)).toEqual({
      foo: { children: {} },
      bar: { children: {} },
    })
    expect(addMediaDirectories('foo/bar', tree)).toEqual({
      foo: { children: { bar: { children: {} } } },
      bar: { children: {} },
    })
    expect(addMediaDirectories('baz/qux', tree)).toEqual({
      foo: { children: { bar: { children: {} } } },
      bar: { children: {} },
      baz: { children: { qux: { children: {} } } },
    })
    expect(addMediaDirectories('qux/1/2', tree)).toEqual({
      foo: { children: { bar: { children: {} } } },
      bar: { children: {} },
      baz: { children: { qux: { children: {} } } },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
    })
  })

  it('deletes directories', () => {
    expect(deleteMediaDirectories('foo/', tree)).toEqual({
      bar: { children: {} },
      baz: { children: { qux: { children: {} } } },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
    })
    expect(deleteMediaDirectories('foo/', tree)).toEqual({
      bar: { children: {} },
      baz: { children: { qux: { children: {} } } },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
    })
    expect(deleteMediaDirectories('bar/baz', tree)).toEqual({
      bar: { children: {} },
      baz: { children: { qux: { children: {} } } },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
    })
    expect(deleteMediaDirectories('baz/qux', tree)).toEqual({
      bar: { children: {} },
      baz: { children: {} },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
    })
  })

  it('list directories', () => {
    expect(listMediaDirectory('foo/', tree)).toBeNull()
    expect(listMediaDirectory('bar/', tree)).toEqual({})
    expect(listMediaDirectory('bar/baz', tree)).toBeNull()
    expect(listMediaDirectory('qux/1', tree)).toEqual({ 2: { children: {} } })
    expect(listMediaDirectory('', tree)).toEqual({
      bar: { children: {} },
      baz: { children: {} },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
    })
  })

  it('list directories with path', () => {
    expect(listMediaDirectoryWithPath('foo/', tree)).toBeNull()
    expect(listMediaDirectoryWithPath('bar/', tree)).toEqual([])
    expect(listMediaDirectoryWithPath('bar/baz', tree)).toBeNull()
    expect(listMediaDirectoryWithPath('qux/1', tree)).toEqual([{ name: '2', path: 'qux/1/2/' }])
    expect(listMediaDirectoryWithPath('', tree)).toEqual([
      { name: 'bar', path: 'bar/' },
      { name: 'baz', path: 'baz/' },
      { name: 'qux', path: 'qux/' },
    ])
  })

  it('moves directories', () => {
    expect(moveMediaDirectory('bar', 'quux', tree)).toEqual({
      baz: { children: {} },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
      quux: { children: { bar: { children: {} } } },
    })
    expect(moveMediaDirectory('baz', '/baz/', tree)).toEqual({
      baz: { children: {} },
      qux: { children: { 1: { children: { 2: { children: {} } } } } },
      quux: { children: { bar: { children: {} } } },
    })
    expect(moveMediaDirectory('quux/', 'qux/1', tree)).toEqual({
      baz: { children: {} },
      qux: {
        children: {
          1: {
            children: {
              2: { children: {} },
              quux: { children: { bar: { children: {} } } },
            },
          },
        },
      },
    })
    expect(moveMediaDirectory('qux/1/quux', 'qux', tree)).toEqual({
      baz: { children: {} },
      qux: {
        children: {
          1: { children: { 2: { children: {} } } },
          quux: { children: { bar: { children: {} } } },
        },
      },
    })
    expect(moveMediaDirectory('qux/1/2', '', tree)).toEqual({
      2: { children: {} },
      baz: { children: {} },
      qux: {
        children: {
          1: { children: {} },
          quux: { children: { bar: { children: {} } } },
        },
      },
    })
  })

  it('renames directories', () => {
    expect(renameMediaDirectory('qux/1', 'qux/one', tree)).toEqual({
      2: { children: {} },
      baz: { children: {} },
      qux: {
        children: {
          one: { children: {} },
          quux: { children: { bar: { children: {} } } },
        },
      },
    })
    expect(renameMediaDirectory('2', 'two', tree)).toEqual({
      two: { children: {} },
      baz: { children: {} },
      qux: {
        children: {
          one: { children: {} },
          quux: { children: { bar: { children: {} } } },
        },
      },
    })
    expect(renameMediaDirectory('two', 'foo/three', tree)).toEqual({
      two: { children: {} },
      baz: { children: {} },
      qux: {
        children: {
          one: { children: {} },
          quux: { children: { bar: { children: {} } } },
        },
      },
    })
  })
})
