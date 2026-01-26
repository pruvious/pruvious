import { expect, test } from 'vitest'
import { murmurHash, uniqueTrim } from '../../src'

test('mmurmurHash', () => {
  expect(murmurHash('')).toMatchInlineSnapshot('0')
  expect(murmurHash('', 1)).toMatchInlineSnapshot('1364076727') // 0x514E28B7
  expect(murmurHash('Hello World')).toMatchInlineSnapshot('427197390')
  expect(murmurHash('a')).toMatchInlineSnapshot('1009084850')
  expect(murmurHash('aa')).toMatchInlineSnapshot('923832745')
  expect(murmurHash('aaa')).toMatchInlineSnapshot('3033554871')
  expect(murmurHash('aaaa')).toMatchInlineSnapshot('2129582471')
  expect(murmurHash('aaaaa')).toMatchInlineSnapshot('3922341931')
  expect(murmurHash('aaaaaa')).toMatchInlineSnapshot('1736445713')
  expect(murmurHash('aaaaaaa')).toMatchInlineSnapshot('1497565372')
  expect(murmurHash('aaaaaaaa')).toMatchInlineSnapshot('3662943087')
  expect(murmurHash('aaaaaaaaa')).toMatchInlineSnapshot('2724714153')
  expect(murmurHash(new Uint8Array([0x21, 0x43, 0x65, 0x87]))).toMatchInlineSnapshot('4116402539') // 0xF55B516B
  expect(murmurHash('ππππππππ', 0x97_47_b2_8c)).toMatchInlineSnapshot('3581961153')
  expect(murmurHash('a', 2_147_483_647)).toMatchInlineSnapshot('3574244913')
})

test('unique trim', () => {
  expect(uniqueTrim('Hello World', 20)).toBe('Hello World')
  expect(uniqueTrim('Hello World', 11)).toBe('Hello World')
  expect(uniqueTrim('Hello World', 10)).toMatch(/^[0-9]+$/)
  expect(uniqueTrim('Hello World'.repeat(20), 100)).toMatch(/^Hello World[a-z0-9_\s]{89}$/i)
})
