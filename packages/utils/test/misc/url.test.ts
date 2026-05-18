import { describe, expect, test } from 'vitest'
import { buildRelURL, isRelURL, parseRelURL } from '../../src'

describe('parseRelURL', () => {
  test('singleton route (route only)', () => {
    expect(parseRelURL('rel://Routes:1', 'en')).toEqual({ routeId: 1, language: 'en' })
  })

  test('singleton route with large ID', () => {
    expect(parseRelURL('rel://Routes:99999', 'en')).toEqual({ routeId: 99999, language: 'en' })
  })

  test('collection record route', () => {
    expect(parseRelURL('rel://Routes:1/Articles:5', 'en')).toEqual({
      routeId: 1,
      collection: 'Articles',
      recordId: 5,
      language: 'en',
    })
  })

  test('collection with PascalCase name', () => {
    expect(parseRelURL('rel://Routes:2/BlogPosts:10', 'en')).toEqual({
      routeId: 2,
      collection: 'BlogPosts',
      recordId: 10,
      language: 'en',
    })
  })

  test('with query string only', () => {
    expect(parseRelURL('rel://Routes:1?foo=bar', 'en')).toEqual({
      routeId: 1,
      language: 'en',
      query: 'foo=bar',
    })
  })

  test('with hash fragment only', () => {
    expect(parseRelURL('rel://Routes:1#section', 'en')).toEqual({
      routeId: 1,
      language: 'en',
      hash: 'section',
    })
  })

  test('with both query and hash', () => {
    expect(parseRelURL('rel://Routes:1/Articles:5?foo=bar#section', 'en')).toEqual({
      routeId: 1,
      collection: 'Articles',
      recordId: 5,
      language: 'en',
      query: 'foo=bar',
      hash: 'section',
    })
  })

  test('with complex query string', () => {
    expect(parseRelURL('rel://Routes:3?key=value&other=123', 'en')).toEqual({
      routeId: 3,
      language: 'en',
      query: 'key=value&other=123',
    })
  })

  test('with hash containing special characters', () => {
    expect(parseRelURL('rel://Routes:1#section-2.1', 'en')).toEqual({
      routeId: 1,
      language: 'en',
      hash: 'section-2.1',
    })
  })

  test('returns null for empty string', () => {
    expect(parseRelURL('', 'en')).toBeNull()
  })

  test('returns null for external URL', () => {
    expect(parseRelURL('https://example.com', 'en')).toBeNull()
  })

  test('returns null for relative path', () => {
    expect(parseRelURL('/blog/article', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (missing route ID)', () => {
    expect(parseRelURL('rel://Routes:', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (non-numeric route ID)', () => {
    expect(parseRelURL('rel://Routes:abc', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (missing record ID)', () => {
    expect(parseRelURL('rel://Routes:1/Articles:', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (collection starting with number)', () => {
    expect(parseRelURL('rel://Routes:1/123articles:5', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (lowercase routes)', () => {
    expect(parseRelURL('rel://routes:1', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (lowercase collection)', () => {
    expect(parseRelURL('rel://Routes:1/articles:5', 'en')).toBeNull()
  })

  test('returns null for malformed rel URL (wrong protocol)', () => {
    expect(parseRelURL('rel:/routes:1', 'en')).toBeNull()
  })

  test('bare route with language pin', () => {
    expect(parseRelURL('rel://Routes:1@de', 'en')).toEqual({ routeId: 1, language: 'de' })
  })

  test('language pin with region subtag', () => {
    expect(parseRelURL('rel://Routes:1@en-US', 'en')).toEqual({ routeId: 1, language: 'en-US' })
  })

  test('collection rel URL with language pin', () => {
    expect(parseRelURL('rel://Routes:1/Articles:5@de', 'en')).toEqual({
      routeId: 1,
      collection: 'Articles',
      recordId: 5,
      language: 'de',
    })
  })

  test('language pin combined with collection, query and hash', () => {
    expect(parseRelURL('rel://Routes:1/Articles:5@de?foo=bar#section', 'en')).toEqual({
      routeId: 1,
      collection: 'Articles',
      recordId: 5,
      language: 'de',
      query: 'foo=bar',
      hash: 'section',
    })
  })

  test('language pin combined with query and hash (no collection)', () => {
    expect(parseRelURL('rel://Routes:1@de?foo=bar#section', 'en')).toEqual({
      routeId: 1,
      language: 'de',
      query: 'foo=bar',
      hash: 'section',
    })
  })

  test('returns null for malformed language pin (single character)', () => {
    expect(parseRelURL('rel://Routes:1@x', 'en')).toBeNull()
  })

  test('returns null for empty language pin', () => {
    expect(parseRelURL('rel://Routes:1@', 'en')).toBeNull()
  })

  test('falls back to primary language when no pin is present', () => {
    expect(parseRelURL('rel://Routes:1', 'de')).toEqual({ routeId: 1, language: 'de' })
  })

  test('pin takes precedence over primary language', () => {
    expect(parseRelURL('rel://Routes:1@fr', 'en')).toEqual({ routeId: 1, language: 'fr' })
  })

  test('empty hash is not included', () => {
    const result = parseRelURL('rel://Routes:1#', 'en')
    expect(result).toEqual({ routeId: 1, language: 'en' })
    expect(result).not.toHaveProperty('hash')
  })

  test('empty query is not included', () => {
    const result = parseRelURL('rel://Routes:1?', 'en')
    expect(result).toEqual({ routeId: 1, language: 'en' })
    expect(result).not.toHaveProperty('query')
  })
})

describe('isRelURL', () => {
  test('returns true for rel:// URLs', () => {
    expect(isRelURL('rel://Routes:1')).toBe(true)
    expect(isRelURL('rel://Routes:1/Articles:5')).toBe(true)
  })

  test('returns false for non-rel URLs', () => {
    expect(isRelURL('https://example.com')).toBe(false)
    expect(isRelURL('/blog/article')).toBe(false)
    expect(isRelURL('')).toBe(false)
  })
})

describe('buildRelURL', () => {
  test('singleton route', () => {
    expect(buildRelURL({ routeId: 1 })).toBe('rel://Routes:1')
  })

  test('collection record route', () => {
    expect(buildRelURL({ routeId: 1, collection: 'Articles', recordId: 5 })).toBe('rel://Routes:1/Articles:5')
  })

  test('with query and hash', () => {
    expect(buildRelURL({ routeId: 1, collection: 'Articles', recordId: 5, query: 'foo=bar', hash: 'section' })).toBe(
      'rel://Routes:1/Articles:5?foo=bar#section',
    )
  })

  test('with query only', () => {
    expect(buildRelURL({ routeId: 1, query: 'foo=bar' })).toBe('rel://Routes:1?foo=bar')
  })

  test('with hash only', () => {
    expect(buildRelURL({ routeId: 1, hash: 'section' })).toBe('rel://Routes:1#section')
  })

  test('with language pin on bare route', () => {
    expect(buildRelURL({ routeId: 1, language: 'de' })).toBe('rel://Routes:1@de')
  })

  test('with language pin on collection rel URL', () => {
    expect(buildRelURL({ routeId: 1, collection: 'Articles', recordId: 5, language: 'de' })).toBe(
      'rel://Routes:1/Articles:5@de',
    )
  })

  test('with language pin combined with collection, query and hash', () => {
    expect(
      buildRelURL({
        routeId: 1,
        collection: 'Articles',
        recordId: 5,
        language: 'de',
        query: 'foo=bar',
        hash: 'section',
      }),
    ).toBe('rel://Routes:1/Articles:5@de?foo=bar#section')
  })

  test('roundtrip: parse then build (URLs with explicit language pin)', () => {
    const urls = [
      'rel://Routes:1@en',
      'rel://Routes:1/Articles:5@en',
      'rel://Routes:1/Articles:5@en?foo=bar#section',
      'rel://Routes:42@en?key=value',
      'rel://Routes:7@en#heading',
      'rel://Routes:1@de',
      'rel://Routes:1@en-US?foo=bar#section',
      'rel://Routes:1/Articles:5@de',
      'rel://Routes:1/Articles:5@en-US?foo=bar#section',
    ]

    for (const url of urls) {
      expect(buildRelURL(parseRelURL(url, 'en')!)).toBe(url)
    }
  })

  test('parsing bare URL fills in primary language on build', () => {
    expect(buildRelURL(parseRelURL('rel://Routes:1', 'en')!)).toBe('rel://Routes:1@en')
  })
})
