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

/**
 * Removes extra whitespace from the `html` content.
 * Multiple spaces in a row become a single space.
 * Spaces at the start and end are removed.
 *
 * @default true
 *
 * @example
 * ```ts
 * ' <strong> Hello, </strong>World! '  //=> '<strong>Hello,</strong> World!'
 * ' <strong> Hello </strong>, World! ' //=> '<strong>Hello</strong> , World!'
 * ```
 */
export function normalizeWhitespace(html: string): string {
  const tokens: { value: string; isText: boolean; tag: 'open' | 'close' | false; spaceAfter: boolean }[] = []

  let word = ''
  let tag: 'open' | 'close' | false = false
  let inAttribute: '"' | "'" | false = false
  let hasContent = false

  function push(isText: boolean, spaceAfter = false) {
    if (word) {
      tokens.push({ value: word, isText, tag, spaceAfter })
      word = ''
      if (!hasContent && isText && !tag) {
        hasContent = true
      }
    }
  }

  for (let i = 0; i < html.length; i++) {
    const char = html[i]

    if (char === '<' && !tag && !inAttribute) {
      if (html.slice(i, i + 4) === '<br>') {
        push(true)
        word = '<br>'
        push(false)
        i += 3
      } else {
        push(true)
        if (html[i + 1] === '/') {
          word = '</'
          tag = 'close'
          push(false)
          i++
        } else {
          word = '<'
          tag = 'open'
          push(false)
        }
      }
    } else if (char === '/' && html[i + 1] === '>' && tag && !inAttribute) {
      push(true)
      word = '/>'
      push(false)
      tag = false
      i++
    } else if (char === '>' && tag && !inAttribute) {
      push(true)
      word = '>'
      push(false)
      tag = false
    } else if ((char === '"' || char === "'") && tag) {
      word += char
      if (inAttribute === char) {
        push(true)
        inAttribute = false
      } else {
        inAttribute = char
      }
    } else if (inAttribute) {
      word += char
    } else if (char === ' ') {
      if (word) {
        push(true, !tag)
      } else if (!tag && hasContent) {
        for (let j = tokens.length - 1; j >= 0; j--) {
          if (!tokens[j].tag || (tokens[j].tag === 'close' && tokens[j].value === '>')) {
            tokens[j].spaceAfter = true
            break
          }
        }
      }
    } else {
      word += char
    }
  }

  push(true)

  let normalized = ''
  let spaceBefore = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const prevToken = tokens[i - 1]

    if (token.tag) {
      if (spaceBefore && token.value === '<') {
        normalized += ' <'
        spaceBefore = false
      } else {
        normalized += (token.isText && prevToken?.isText ? ' ' : '') + token.value
      }

      if (token.spaceAfter && !token.isText) {
        spaceBefore = true
      }
    } else if (token.isText) {
      normalized += (spaceBefore ? ' ' : '') + token.value
      spaceBefore = token.spaceAfter
    } else {
      normalized += token.value
    }
  }

  return normalized
}

/**
 * Counts the number of common characters from the start of two strings.
 *
 * @example
 * ```ts
 * countCommonPrefix('foo', 'foobar') // 3
 * countCommonPrefix('foobar', 'foo') // 3
 * countCommonPrefix('foo', 'bar')    // 0
 * ```
 */
export function countCommonPrefix(str1: string, str2: string): number {
  let commonChars = 0

  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      commonChars++
    } else {
      break
    }
  }

  return commonChars
}

/**
 * Escapes special HTML characters in the given `html` string.
 *
 * @example
 * ```ts
 * escapeHTML('<div>Hello & "world"</div>') // '&lt;div&gt;Hello &amp; &quot;world&quot;&lt;/div&gt;'
 * ```
 */
export function escapeHTML(html: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return html.replace(/[&<>"']/g, (char) => map[char])
}
