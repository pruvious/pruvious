import os from 'node:os'
import { join } from 'pathe'
import { expect, test } from 'vitest'
import { resolvePath } from '../src'
import { isValidPath, setCurrentWorkingDirectory } from '../src/path'

test('resolve path', async () => {
  const cwd = process.cwd()
  const home = os.homedir()

  expect(resolvePath('foo')).toBe(join(cwd, 'foo'))
  expect(resolvePath('./foo')).toBe(join(cwd, 'foo'))
  expect(resolvePath('..')).toBe(join(cwd, '..'))
  expect(resolvePath('/foo')).toBe('/foo')
  expect(resolvePath('~')).toBe(home)
  expect(resolvePath('~/foo')).toBe(join(home, 'foo'))
  expect(resolvePath('/')).toBe('/')
  expect(resolvePath('//')).toBe('/')

  expect(setCurrentWorkingDirectory(home)).toBeUndefined()
  expect(resolvePath('foo')).toBe(join(home, 'foo'))
})

test('path validation', () => {
  expect(isValidPath('')).toBe(false)
  expect(isValidPath('foo')).toBe(true)
  expect(isValidPath('./foo')).toBe(true)
  expect(isValidPath('..')).toBe(true)
  expect(isValidPath('/foo')).toBe(true)
  expect(isValidPath('/foo/bar')).toBe(true)
  expect(isValidPath('/foo//bar')).toBe(true)
  expect(isValidPath('C:\\foo')).toBe(true)
  expect(isValidPath('~')).toBe(true)
  expect(isValidPath('~/foo')).toBe(true)
})
