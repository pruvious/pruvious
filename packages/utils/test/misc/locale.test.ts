import { expect, test } from 'vitest'
import { formatLanguageCode, isBCP47LanguageCode, toOgLocale } from '../../src'

test('isBCP47LanguageCode accepts valid BCP-47 subset', () => {
  expect(isBCP47LanguageCode('en')).toBe(true)
  expect(isBCP47LanguageCode('de')).toBe(true)
  expect(isBCP47LanguageCode('fil')).toBe(true)
  expect(isBCP47LanguageCode('de-AT')).toBe(true)
  expect(isBCP47LanguageCode('pt-BR')).toBe(true)
  expect(isBCP47LanguageCode('zh-Hant')).toBe(true)
  expect(isBCP47LanguageCode('sr-Latn-RS')).toBe(true)
  expect(isBCP47LanguageCode('es-419')).toBe(true)
})

test('isBCP47LanguageCode rejects malformed codes', () => {
  expect(isBCP47LanguageCode('')).toBe(false)
  expect(isBCP47LanguageCode('EN')).toBe(false)
  expect(isBCP47LanguageCode('de_AT')).toBe(false)
  expect(isBCP47LanguageCode('de-at')).toBe(false)
  expect(isBCP47LanguageCode('de-ATX')).toBe(false)
  expect(isBCP47LanguageCode('123')).toBe(false)
  expect(isBCP47LanguageCode('en-')).toBe(false)
  expect(isBCP47LanguageCode('-en')).toBe(false)
  expect(isBCP47LanguageCode('a')).toBe(false)
  expect(isBCP47LanguageCode('abcd')).toBe(false)
})

test('toOgLocale rewrites hyphens to underscores for Open Graph', () => {
  expect(toOgLocale('en')).toBe('en')
  expect(toOgLocale('de')).toBe('de')
  expect(toOgLocale('de-AT')).toBe('de_AT')
  expect(toOgLocale('pt-BR')).toBe('pt_BR')
  expect(toOgLocale('sr-Latn-RS')).toBe('sr_Latn_RS')
})

test('formatLanguageCode renders compact dashboard labels', () => {
  expect(formatLanguageCode('en')).toBe('EN')
  expect(formatLanguageCode('de')).toBe('DE')
  expect(formatLanguageCode('de-AT')).toBe('DE (AT)')
  expect(formatLanguageCode('pt-BR')).toBe('PT (BR)')
  expect(formatLanguageCode('zh-Hant')).toBe('ZH (HANT)')
  expect(formatLanguageCode('sr-Latn-RS')).toBe('SR (LATN-RS)')
  expect(formatLanguageCode('es-419')).toBe('ES (419)')
})
