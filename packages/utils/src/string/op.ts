export type ExcerptOptions =
  | {
      /**
       * The maximum number of words to include in the excerpt.
       */
      words: number
    }
  | {
      /**
       * The maximum number of characters to include in the excerpt.
       */
      characters: number

      /**
       * Whether to include the last word if it exceeds the character limit.
       */
      includeLastWord?: boolean
    }

/**
 * Extracts keywords from the given `string` by splitting it into separate words and converting them to lowercase.
 *
 * @example
 * ```ts
 * extractKeywords('foo bar')    // ['foo', 'bar']
 * extractKeywords(' Foo  BAR ') // ['foo', 'bar']
 * ```
 */
export function extractKeywords(string: string): string[] {
  return string
    .toLowerCase()
    .split(' ')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

/**
 * Generates an excerpt from the given `string` based on the provided `options`.
 * By default, it will return the first 50 words.
 *
 * @example
 * ```ts
 * excerpt('Lorem ipsum dolor sit amet', { words: 3 }) // 'Lorem ipsum dolor'
 * excerpt('Lorem ipsum dolor sit amet', { characters: 10 }) // 'Lorem ipsu'
 * ```
 */
export function excerpt(string: string, options: ExcerptOptions = { words: 50 }): string {
  if (!string) {
    return ''
  }

  if ('words' in options) {
    const maxWords = options.words
    const words = string.split(/\s+/)
    if (words.length <= maxWords) {
      return string
    }
    return words.slice(0, maxWords).join(' ')
  }

  const { characters: maxChars, includeLastWord } = options

  if (string.length <= maxChars) {
    return string
  }

  if (includeLastWord) {
    let boundary = string.indexOf(' ', maxChars)

    if (string.charAt(maxChars) === ' ') {
      boundary = maxChars
    }

    if (boundary === -1) {
      return string
    }

    return string.slice(0, boundary)
  } else {
    return string.slice(0, maxChars)
  }
}
