import { isAlphanumeric, isDefined, isObject, isString } from '@pruvious/utils'
import { tokenizePattern } from './tokens'
import type { TranslatableStrings } from './types'

/**
 * Extracts alphanumeric placeholders following the dollar sign (`$`) from a translatable string pattern.
 *
 * To use a literal dollar sign, escape it with another dollar sign (e.g., `$$notPlaceholder`).
 *
 * @example
 * ```ts
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
 * Substitutes placeholders in a text `handle` using the provided translatable `strings` and `input` values.
 *
 * @example
 * ```ts
 * // Translatable strings
 * const strings = {
 *   // Plain text
 *   'Welcome': 'Willkommen',
 *
 *   // Pattern with placeholders
 *   'Displayed: $count entries': {
 *     translation: 'Angezeigt: $count $entries',
 *     // Required user inputs
 *     input: {
 *       count: 'number',
 *     },
 *     // Conditional replacements
 *     replacements: {
 *       entries: [
 *         { conditions: [{ count: 1 }], output: 'Eintrag' },
 *         'Einträge',
 *       ],
 *     },
 *   },
 * }
 *
 * // Plain text
 * replacePlaceholders('Welcome', { Welcome: 'Willkommen' }) // 'Willkommen'
 *
 * // Pattern with placeholders
 * replacePlaceholders('Displayed: $count entries', strings, { count: 10 }) // 'Angezeigt: 10 Einträge'
 * ```
 */
export function replacePlaceholders(
  handle: string,
  strings: TranslatableStrings,
  input: Record<string, boolean | number | string> = {},
): string {
  const item = strings[handle] ?? handle

  if (isString(item)) {
    return item
  } else if (item) {
    const tokens = tokenizePattern(item.translation).map(({ type, value }) => {
      if (type === 'placeholder' && !item.input?.[value] && !item.replacements?.[value]) {
        return { type: 'literal', value: `$${value}` }
      }
      return { type, value }
    })

    for (const token of tokens) {
      if (token.type === 'placeholder') {
        const replacements = item.replacements?.[token.value]

        if (replacements) {
          if (isString(replacements)) {
            token.value = replacements
          } else {
            token.value = ''

            for (const replacement of replacements) {
              if (isString(replacement)) {
                token.value = replacement
                break
              } else {
                let match = true

                for (const conditionObject of replacement.conditions) {
                  if (!match) {
                    break
                  }

                  for (const [inputKey, condition] of Object.entries(conditionObject)) {
                    if (!match) {
                      break
                    }

                    const inputValue = input[inputKey] ?? ''

                    if (isObject(condition)) {
                      for (const [operator, value] of Object.entries(condition)) {
                        if (
                          (operator === '=' && String(inputValue) !== String(value)) ||
                          (operator === '!=' && String(inputValue) === String(value)) ||
                          (operator === '>' && Number(inputValue) <= Number(value)) ||
                          (operator === '>=' && Number(inputValue) < Number(value)) ||
                          (operator === '<' && Number(inputValue) >= Number(value)) ||
                          (operator === '<=' && Number(inputValue) > Number(value)) ||
                          (operator === 'regexp' &&
                            !(
                              isObject(value) ? new RegExp(value.pattern, value.flags) : new RegExp(String(value))
                            ).test(String(inputValue)))
                        ) {
                          match = false
                          break
                        }
                      }
                    } else if (String(inputValue) !== String(condition)) {
                      match = false
                      break
                    }
                  }
                }

                if (match) {
                  token.value = replacement.output
                  break
                }
              }
            }
          }

          const rTokens = tokenizePattern(token.value)

          for (const rToken of rTokens) {
            if (rToken.type === 'placeholder') {
              rToken.value = isDefined(input[rToken.value]) ? String(input[rToken.value]) : `$${rToken.value}`
            }
          }

          token.value = rTokens.map(({ value }) => value).join('')
        } else if (isDefined(input[token.value])) {
          token.value = String(input[token.value])
        } else {
          token.value = `$${token.value}`
        }
      }
    }

    return tokens.map(({ value }) => value).join('')
  }

  return ''
}
