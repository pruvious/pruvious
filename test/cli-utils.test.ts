import { describe, expect, it } from 'vitest'
import { isHostname } from '../bin/shared'

describe('cli utils', () => {
  it('validates hostname', async () => {
    expect(isHostname('localhost')).toBe(true)
    expect(isHostname('example.com')).toBe(true)
    expect(isHostname('example.com:3000')).toBe(false)
    expect(isHostname('example.com:3000/path')).toBe(false)
    expect(isHostname('example.com/path')).toBe(false)
    expect(isHostname('example.com?query')).toBe(false)
    expect(isHostname('example.com#hash')).toBe(false)
    expect(isHostname('foo.example.com')).toBe(true)
    expect(isHostname('foo.bar.example.com')).toBe(true)
    expect(isHostname('127.0.0.1')).toBe(true)
    expect(isHostname('http://example.com')).toBe(false)
    expect(isHostname('foo bar')).toBe(false)
  })
})
