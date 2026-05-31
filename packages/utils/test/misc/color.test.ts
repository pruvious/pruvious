import { describe, expect, test } from 'vitest'
import { hasAlphaChannel } from '../../src'

describe('hasAlphaChannel', () => {
  test('returns false for non-strings', () => {
    expect(hasAlphaChannel(null as any)).toBe(false)
    expect(hasAlphaChannel(undefined as any)).toBe(false)
    expect(hasAlphaChannel(123 as any)).toBe(false)
    expect(hasAlphaChannel({} as any)).toBe(false)
  })

  test('returns false for empty / whitespace strings', () => {
    expect(hasAlphaChannel('')).toBe(false)
    expect(hasAlphaChannel('   ')).toBe(false)
  })

  test('returns true for `transparent`', () => {
    expect(hasAlphaChannel('transparent')).toBe(true)
    expect(hasAlphaChannel('  Transparent  ')).toBe(true)
    expect(hasAlphaChannel('TRANSPARENT')).toBe(true)
  })

  test('returns true for 4 and 8 digit hex', () => {
    expect(hasAlphaChannel('#abcd')).toBe(true)
    expect(hasAlphaChannel('#FF000080')).toBe(true)
    expect(hasAlphaChannel('  #ff0000aa ')).toBe(true)
  })

  test('returns false for 3 and 6 digit hex', () => {
    expect(hasAlphaChannel('#abc')).toBe(false)
    expect(hasAlphaChannel('#ff0000')).toBe(false)
    expect(hasAlphaChannel('#FFFFFF')).toBe(false)
  })

  test('returns true for rgba() / hsla()', () => {
    expect(hasAlphaChannel('rgba(0, 0, 0, 0)')).toBe(true)
    expect(hasAlphaChannel('rgba(255, 255, 255, 0.5)')).toBe(true)
    expect(hasAlphaChannel('HSLA(0, 0%, 0%, 0.25)')).toBe(true)
  })

  test('returns false for plain rgb() / hsl()', () => {
    expect(hasAlphaChannel('rgb(0, 0, 0)')).toBe(false)
    expect(hasAlphaChannel('rgb(255 255 255)')).toBe(false)
    expect(hasAlphaChannel('hsl(0, 0%, 0%)')).toBe(false)
  })

  test('returns true for modern slash syntax in any color function', () => {
    expect(hasAlphaChannel('rgb(255 0 0 / 0.5)')).toBe(true)
    expect(hasAlphaChannel('hsl(240 100% 50% / 0.75)')).toBe(true)
    expect(hasAlphaChannel('hwb(0 0% 0% / 0.1)')).toBe(true)
    expect(hasAlphaChannel('lab(50% 40 30 / 0.5)')).toBe(true)
    expect(hasAlphaChannel('lch(50% 40 30 / 0.5)')).toBe(true)
    expect(hasAlphaChannel('oklab(0.5 0.1 0.1 / 0.5)')).toBe(true)
    expect(hasAlphaChannel('oklch(0.5 0.1 30 / 0.5)')).toBe(true)
    expect(hasAlphaChannel('color(display-p3 1 0 0 / 0.5)')).toBe(true)
  })

  test('returns false for named colors, currentColor, and other plain strings', () => {
    expect(hasAlphaChannel('red')).toBe(false)
    expect(hasAlphaChannel('tomato')).toBe(false)
    expect(hasAlphaChannel('currentColor')).toBe(false)
    expect(hasAlphaChannel('inherit')).toBe(false)
  })
})
