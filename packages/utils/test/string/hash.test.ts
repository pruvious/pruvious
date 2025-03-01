import { expect, test } from 'vitest'
import { uniqueTrim } from '../../src'

test('unique trim', () => {
  expect(uniqueTrim('Hello World', 20)).toBe('Hello World')
  expect(uniqueTrim('Hello World', 11)).toBe('Hello World')
  expect(uniqueTrim('Hello World', 10)).toMatch(/^[0-9]+$/)
  expect(uniqueTrim('Hello World'.repeat(20), 100)).toMatch(/^Hello World[a-z0-9_\s]{89}$/i)
})
