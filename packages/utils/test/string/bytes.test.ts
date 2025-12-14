import { expect, test } from 'vitest'
import { formatBytes, parseBytes } from '../../src'

test('format bytes', () => {
  expect(formatBytes(2097152)).toBe('2 MB')
  expect(formatBytes('1048576')).toBe('1 MB')
  expect(formatBytes(0)).toBe('0 B')
  expect(formatBytes(-1)).toBe(null)
})

test('parse bytes', () => {
  expect(parseBytes('2 MB')).toBe(2097152)
  expect(parseBytes('1  MB')).toBe(1048576)
  expect(parseBytes(1048576)).toBe(1048576)
})
