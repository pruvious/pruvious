import { isString } from './is'

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011).
 *
 * @source https://github.com/unjs/ohash
 * @source https://github.com/unjs/ohash/blob/c280a0d6b4137722b63b4ed451fe82d633d5a6f4/src/crypto/js/murmur.ts
 */
export function murmurHash(key: Uint8Array | string, seed = 0): number {
  if (isString(key)) {
    key = new TextEncoder().encode(key)
  }

  let i = 0
  let h1 = seed
  let k1
  let h1b

  const remainder = key.length & 3 // key.length % 4
  const bytes = key.length - remainder
  const c1 = 0xcc_9e_2d_51
  const c2 = 0x1b_87_35_93

  while (i < bytes) {
    k1 = (key[i] & 0xff) | ((key[++i] & 0xff) << 8) | ((key[++i] & 0xff) << 16) | ((key[++i] & 0xff) << 24)
    ++i

    k1 = ((k1 & 0xff_ff) * c1 + ((((k1 >>> 16) * c1) & 0xff_ff) << 16)) & 0xff_ff_ff_ff
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = ((k1 & 0xff_ff) * c2 + ((((k1 >>> 16) * c2) & 0xff_ff) << 16)) & 0xff_ff_ff_ff

    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1b = ((h1 & 0xff_ff) * 5 + ((((h1 >>> 16) * 5) & 0xff_ff) << 16)) & 0xff_ff_ff_ff
    h1 = (h1b & 0xff_ff) + 0x6b_64 + ((((h1b >>> 16) + 0xe6_54) & 0xff_ff) << 16)
  }

  k1 = 0

  switch (remainder) {
    case 3: {
      k1 ^= (key[i + 2] & 0xff) << 16
      /* falls through */
    }
    case 2: {
      k1 ^= (key[i + 1] & 0xff) << 8
      /* falls through */
    }
    case 1: {
      k1 ^= key[i] & 0xff
      k1 = ((k1 & 0xff_ff) * c1 + ((((k1 >>> 16) * c1) & 0xff_ff) << 16)) & 0xff_ff_ff_ff
      k1 = (k1 << 15) | (k1 >>> 17)
      k1 = ((k1 & 0xff_ff) * c2 + ((((k1 >>> 16) * c2) & 0xff_ff) << 16)) & 0xff_ff_ff_ff
      h1 ^= k1
    }
  }

  h1 ^= key.length

  h1 ^= h1 >>> 16
  h1 = ((h1 & 0xff_ff) * 0x85_eb_ca_6b + ((((h1 >>> 16) * 0x85_eb_ca_6b) & 0xff_ff) << 16)) & 0xff_ff_ff_ff
  h1 ^= h1 >>> 13
  h1 = ((h1 & 0xff_ff) * 0xc2_b2_ae_35 + ((((h1 >>> 16) * 0xc2_b2_ae_35) & 0xff_ff) << 16)) & 0xff_ff_ff_ff
  h1 ^= h1 >>> 16

  return h1 >>> 0
}

/**
 * Truncates a `string` to a specified `length` and append a unique hash to ensure uniqueness.
 * If the `string` is shorter than the `length`, it will be returned as is.
 * The `separator` (default: `_`) is used to separate the truncated `string` and the hash.
 *
 * **Note:** The `length` should be at least 10 characters to ensure uniqueness.
 *
 * @example
 * ```ts
 * uniqueTrim('Hello World', 10) // Hello Wor_2708020327
 * ```
 */
export function uniqueTrim(string: string, length: number, separator = '_') {
  if (string.length <= length) {
    return string
  }

  const hash = String(murmurHash(string))
  const sliceEnd = Math.max(0, length - hash.length - separator.length)

  return (string.slice(0, sliceEnd) + (sliceEnd ? separator + hash : hash)).slice(0, length)
}
