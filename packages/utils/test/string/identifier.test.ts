import { expect, test } from 'vitest'
import { randomIdentifier } from '../../src'

test('generate random identifier', () => {
  expect(randomIdentifier()).toHaveLength(23)
  expect(randomIdentifier(5)).toHaveLength(5)

  for (let i = 0; i < 1000; i++) {
    expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(randomIdentifier())).toBe(true)
  }
})
