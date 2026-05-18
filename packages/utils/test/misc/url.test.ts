import { describe, expect, test } from 'vitest'
import { buildRelURL, isRelURL, parseRelURL } from '../../src'

describe('parseRelURL', () => {
  test('singleton route (route only)', () => {
    expect(parseRelURL('rel://Routes:1')).toEqual({ routeId: 1 })
  })

  test('singleton route with large ID', () => {
    expect(parseRelURL('rel://Routes:99999')).toEqual({ routeId: 99999 })
  })

  test('collection record route', () => {
    expect(parseRelURL('rel://Routes:1/Articles:5')).toEqual({
      routeId: 1,
      collection: 'Articles',
      recordId: 5,
    })
  })

  test('collection with PascalCase name', () => {
    expect(parseRelURL('rel://Routes:2/BlogPosts:10')).toEqual({
      routeId: 2,
      collection: 'BlogPosts',
      recordId: 10,
    })
  })

  test('with query string only', () => {
    expect(parseRelURL('rel://Routes:1?foo=bar')).toEqual({
      routeId: 1,
      query: 'foo=bar',
    })
  })

  test('with hash fragment only', () => {
    expect(parseRelURL('rel://Routes:1#section')).toEqual({
      routeId: 1,
      hash: 'section',
    })
  })

  test('with both query and hash', () => {
    expect(parseRelURL('rel://Routes:1/Articles:5?foo=bar#section')).toEqual({
      routeId: 1,
      collection: 'Articles',
      recordId: 5,
      query: 'foo=bar',
      hash: 'section',
    })
  })

  test('with complex query string', () => {
    expect(parseRelURL('rel://Routes:3?key=value&other=123')).toEqual({
      routeId: 3,
      query: 'key=value&other=123',
    })
  })

  test('with hash containing special characters', () => {
    expect(parseRelURL('rel://Routes:1#section-2.1')).toEqual({
      routeId: 1,
      hash: 'section-2.1',
    })
  })

  test('returns null for empty string', () => {
    expect(parseRelURL('')).toBeNull()
  })

  test('returns null for external URL', () => {
    expect(parseRelURL('https://example.com')).toBeNull()
  })

  test('returns null for relative path', () => {
    expect(parseRelURL('/blog/article')).toBeNull()
  })

  test('returns null for malformed rel URL (missing route ID)', () => {
    expect(parseRelURL('rel://Routes:')).toBeNull()
  })

  test('returns null for malformed rel URL (non-numeric route ID)', () => {
    expect(parseRelURL('rel://Routes:abc')).toBeNull()
  })

  test('returns null for malformed rel URL (missing record ID)', () => {
    expect(parseRelURL('rel://Routes:1/Articles:')).toBeNull()
  })

  test('returns null for malformed rel URL (collection starting with number)', () => {
    expect(parseRelURL('rel://Routes:1/123articles:5')).toBeNull()
  })

  test('returns null for malformed rel URL (lowercase routes)', () => {
    expect(parseRelURL('rel://routes:1')).toBeNull()
  })

  test('returns null for malformed rel URL (lowercase collection)', () => {
    expect(parseRelURL('rel://Routes:1/articles:5')).toBeNull()
  })

  test('returns null for malformed rel URL (wrong protocol)', () => {
    expect(parseRelURL('rel:/routes:1')).toBeNull()
  })

  test('empty hash is not included', () => {
    const result = parseRelURL('rel://Routes:1#')
    expect(result).toEqual({ routeId: 1 })
    expect(result).not.toHaveProperty('hash')
  })

  test('empty query is not included', () => {
    const result = parseRelURL('rel://Routes:1?')
    expect(result).toEqual({ routeId: 1 })
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

  test('roundtrip: parse then build', () => {
    const urls = [
      'rel://Routes:1',
      'rel://Routes:1/Articles:5',
      'rel://Routes:1/Articles:5?foo=bar#section',
      'rel://Routes:42?key=value',
      'rel://Routes:7#heading',
    ]

    for (const url of urls) {
      expect(buildRelURL(parseRelURL(url)!)).toBe(url)
    }
  })
})
