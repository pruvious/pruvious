import type { TranslatableStringsDefinition } from '../translatable-strings/translatable-strings.definition'
import { isDefined } from './common'
import { isObject } from './object'
import { isAlphanumeric, isString } from './string'

export interface TranslatableStringPatternToken {
  value: string
  type: 'literal' | 'placeholder'
}

/**
 * Extracts alphanumeric placeholders following the dollar sign (`$`) from a translatable string pattern.
 *
 * To use a literal dollar sign, escape it with another dollar sign (e.g., `$$notPlaceholder`).
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * extractPlaceholders('foo $bar baz')  // ['bar']
 * extractPlaceholders('foo $$bar baz') // []
 * ```
 */
export function extractPlaceholders(pattern: string): string[] {
  const placeholders: string[] = []

  let i = 0

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
          placeholders.push(placeholder)
        }
      } else {
        i++
      }
    } else {
      i++
    }
  }

  return placeholders
}

/**
 * Replaces placeholders in a given `text` pattern with corresponding replacements or `input` values.
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * const strings: TranslatableStringsDefinition['strings'] = ...
 * replacePlaceholders('foo $bar', strings, { bar: 'baz' } }) // 'foo baz'
 * ```
 */
export function replacePlaceholders(
  text: string,
  strings: TranslatableStringsDefinition['strings'],
  input: Record<string, boolean | number | string> = {},
): string {
  const string = strings[String(text)]

  if (isString(string)) {
    return string
  } else if (string) {
    const tokens = tokenizePlaceholders(string.pattern)

    for (const token of tokens) {
      if (token.type === 'placeholder') {
        const replacements = string.replacements?.[token.value]

        if (isString(replacements)) {
          token.value = replacements
        } else if (replacements) {
          token.value = ''

          for (const replacement of replacements) {
            if (isString(replacement)) {
              token.value = replacement
              break
            } else {
              let pass = true

              for (const conditionObject of replacement.conditions) {
                if (!pass) break

                for (const [inputKey, condition] of Object.entries(conditionObject)) {
                  if (!pass) break

                  const inputValue =
                    input[inputKey] ??
                    (string.input?.[inputKey] === 'boolean' ? false : string.input?.[inputKey] === 'number' ? 0 : '')

                  if (isObject(condition)) {
                    for (const [operator, value] of Object.entries(condition)) {
                      if (
                        (operator === 'eq' && inputValue !== value) ||
                        (operator === 'ne' && inputValue === value) ||
                        (operator === 'gt' && inputValue <= value) ||
                        (operator === 'gte' && inputValue < value) ||
                        (operator === 'lt' && inputValue >= value) ||
                        (operator === 'lte' && inputValue > value) ||
                        (operator === 'regexp' && !new RegExp(value.toString()).test(inputValue.toString()))
                      ) {
                        pass = false
                        break
                      }
                    }
                  } else if (inputValue !== condition) {
                    pass = false
                    break
                  }
                }
              }

              if (pass) {
                token.value = replacement.output
                break
              }
            }
          }
        } else if (isDefined(input[token.value])) {
          token.value = input[token.value].toString()
        } else {
          token.value = ''
        }
      }
    }

    return tokens.map(({ value }) => value).join('')
  }

  return ''
}

/**
 * Tokenize placeholders from a translatable string pattern.
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * tokenizePlaceholders('foo $bar')
 * // [{ value: 'foo ', type: 'literal' }, { value: 'bar', type: 'placeholder' }]
 *
 * tokenizePlaceholders('foo $$bar')
 * // [{ value: 'foo $bar', type: 'literal' }]
 * ```
 */
export function tokenizePlaceholders(pattern: string): TranslatableStringPatternToken[] {
  const tokens: TranslatableStringPatternToken[] = []

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
