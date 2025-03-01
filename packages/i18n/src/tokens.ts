import { isAlphanumeric } from '@pruvious/utils'
import type { Token } from './types'

/**
 * Tokenizes a translation `pattern` into `literal` and `placeholder` tokens.
 *
 * @example
 * ```ts
 * tokenizePattern('foo $bar')
 * // [
 * //   { value: 'foo ', type: 'literal' },
 * //   { value: 'bar', type: 'placeholder' },
 * // ]
 *
 * tokenizePattern('foo $$bar')
 * // [{ value: 'foo $bar', type: 'literal' }]
 * ```
 */
export function tokenizePattern(pattern: string): Token[] {
  const tokens: Token[] = []

  let i = 0
  let literal = ''

  while (i < pattern.length) {
    if (pattern[i] === '$') {
      i++

      if (pattern[i] !== '$') {
        let placeholder = ''

        while (i < pattern.length && isAlphanumeric(pattern[i])) {
          placeholder += pattern[i]
          i++
        }

        if (placeholder) {
          if (literal) {
            tokens.push({ value: literal, type: 'literal' })
            literal = ''
          }

          tokens.push({ value: placeholder, type: 'placeholder' })
        }
      } else {
        literal += '$'
        i++
      }
    } else {
      literal += pattern[i]
      i++
    }
  }

  if (literal) {
    tokens.push({ value: literal, type: 'literal' })
  }

  return tokens
}
