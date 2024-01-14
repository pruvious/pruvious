import { isArray, uniqueArray } from './array'
import { isString } from './string'

export type Token = string | Token[]

/**
 * Encode
 */
export function encodeQueryString(value: any): string {
  return encodeURIComponent(value)
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%3E/g, '>')
    .replace(/%3C/g, '<')
    .replace(/%3D/g, '=')
    .replace(/%21/g, '!')
    .replace(/%2C/g, ',')
    .replace(/%3A/g, ':')
    .replace(/%26/g, '&')
}

/**
 * Parse an array-like query string parameter.
 */
export function parseQSArray(value: any): string[] | null {
  if (isString(value)) {
    return uniqueArray(
      value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    )
  } else if (isArray(value)) {
    return uniqueArray(value.map((v) => (isString(v) ? v.trim() : '')).filter(Boolean))
  }

  return null
}

/**
 * Parse `where` clause tokens into a nested array of tokens.
 */
export function parseWhereTokens(tokens: Token[]): Token[] {
  const result: Token[] = []

  let token: Token | undefined

  while ((token = tokens.shift())) {
    if (token === ']') {
      return result
    }

    result.push(token === '[' ? parseWhereTokens(tokens) : token)
  }

  return result
}

/**
 * Tokenize a query string value into an array of tokens.
 * This can be used to parse the `where` clause of a query string.
 */
export function* tokenize(characters: string[]) {
  let token = ''
  let c: string | undefined = ''
  let escape = false

  while ((c = characters.shift())) {
    if ((c === '[' || c === ']') && !escape) {
      if (token) {
        yield token
        token = ''
      }
      yield c
    } else if (c === '\\' && !escape) {
      escape = true
    } else {
      token += c
      escape = false
    }
  }

  if (token) {
    yield token
  }
}
