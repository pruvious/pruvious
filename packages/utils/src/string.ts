import { plural } from 'pluralize'

/**
 * Convert a `text` to camelCase.
 *
 * @example
 * camelize('Foo Bar') // 'fooBar'
 */
export function camelize(text: string): string {
  return slugify(lowercaseFirstLetter(text), '-', false, false).replace(/-./g, (match) =>
    match[1].toUpperCase(),
  )
}

/**
 * Convert a camel-cased `text` to label format.
 *
 * @example
 * camelToLabel('fooBar') // 'Foo bar'
 */
export function camelToLabel(text: string): string {
  return uppercaseFirstLetter(camelToSnake(text.replace(/([0-9]+)/g, ' $1')).replace(/_/g, ' '))
}

/**
 * Convert a camel-cased `text` to snake format.
 *
 * @example
 * camelToSnake('fooBar') // 'foo_bar'
 */
export function camelToSnake(text: string): string {
  return lowercaseFirstLetter(text).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Convert `html` special characters to their entity equivalents.
 *
 * @example
 * escape('<div></div>') // '&lt;div&gt;&lt;/div&gt;'
 */
export function escape(html: string): string {
  return html.replace(
    /[<>'"]/g,
    (tag) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      }[tag] || tag),
  )
}

/**
 * Create a hash code from a string.
 *
 * @example
 * hash('foo') // 101574
 *
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
export function hash(text: string): number {
  let hash: number = 0

  if (text.length === 0) {
    return 0
  }

  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  return hash
}

/**
 * Check if a string is a valid number.
 *
 * @example
 * isNumeric('123') // true
 */
export function isNumeric(text: string): boolean {
  return typeof text === 'string' && !isNaN(text as any) && !isNaN(parseFloat(text))
}

/**
 * Lowercase the first letter of a given `text`.
 *
 * @example
 * lowercaseFirstLetter('Foo') // 'foo'
 */
export function lowercaseFirstLetter(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Make a `text` plural.
 *
 * @example
 * pluralize('foo') // 'foos'
 */
export function pluralize(text: string): string {
  return plural(text)
}

/**
 * Create a random string with a specified `length`.
 *
 * @example
 * randomString('2') // 'mC'
 */
export function randomString(length: number = 32) {
  let result: string = ''
  let counter: number = 0

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
    counter += 1
  }

  return result
}

/**
 * Convert a `text` to a SEO friendly string.
 *
 * @example
 * slugify('SEO Friendly String!') // 'seo-friendly-string'
 * slugify('123 foo bar', '_', true) // 'foo_bar'
 */
export function slugify(
  text: string,
  separator: string = '-',
  safe: boolean = false,
  lowercase: boolean = true,
): string {
  text = text.toString().trim()

  if (lowercase) {
    text = text.toLowerCase()
  }

  // Safe slug
  if (safe) {
    text = text.replace(/^\s*[0-9]+/, '')
  }

  // Add localization support
  const sets = [
    { to: 'a', from: '[ÀÁÂÃÅÆĀĂĄẠẢẤẦẨẪẬẮẰẲẴẶ]' },
    { to: 'ae', from: '[Ä]' },
    { to: 'c', from: '[ÇĆĈČ]' },
    { to: 'd', from: '[ÐĎĐÞ]' },
    { to: 'e', from: '[ÈÉÊËĒĔĖĘĚẸẺẼẾỀỂỄỆ]' },
    { to: 'g', from: '[ĜĞĢǴ]' },
    { to: 'h', from: '[ĤḦ]' },
    { to: 'i', from: '[ÌÍÎÏĨĪĮİỈỊ]' },
    { to: 'j', from: '[Ĵ]' },
    { to: 'ij', from: '[Ĳ]' },
    { to: 'k', from: '[Ķ]' },
    { to: 'l', from: '[ĹĻĽŁ]' },
    { to: 'm', from: '[Ḿ]' },
    { to: 'n', from: '[ÑŃŅŇ]' },
    { to: 'o', from: '[ÒÓÔÕØŌŎŐỌỎỐỒỔỖỘỚỜỞỠỢǪǬƠ]' },
    { to: 'oe', from: '[ŒÖ]' },
    { to: 'p', from: '[ṕ]' },
    { to: 'r', from: '[ŔŖŘ]' },
    { to: 's', from: '[ŚŜŞŠ]' },
    { to: 'ss', from: '[ß]' },
    { to: 't', from: '[ŢŤ]' },
    { to: 'u', from: '[ÙÚÛŨŪŬŮŰŲỤỦỨỪỬỮỰƯ]' },
    { to: 'ue', from: '[Ü]' },
    { to: 'w', from: '[ẂŴẀẄ]' },
    { to: 'x', from: '[ẍ]' },
    { to: 'y', from: '[ÝŶŸỲỴỶỸ]' },
    { to: 'z', from: '[ŹŻŽ]' },
    { to: '-', from: "[·/_,:;']" },
  ]

  sets.forEach((set) => {
    text = text.replace(new RegExp(set.from, 'gi'), set.to)
  })

  text = text
    .toString()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text

  // Replace separator if not standard
  if (separator !== '-') {
    text = text.replace(/-/g, separator)
  }

  return lowercase ? text.toLowerCase() : text
}

/**
 * Split a `text` with a specified `delimiter` into chunks with offset ranges.
 *
 * @example
 * split('a|b', '|') // [{ value: 'a', from: 0, to: 1 }, { value: 'b', from: 2, to: 3 }]
 */
export function split(
  text: string,
  delimiter: string = ',',
): { value: string; from: number; to: number }[] {
  let index = 0

  return text.split(delimiter).map((value) => {
    const from = index
    const to = index + value.length
    index = to + delimiter.length
    return { value, from, to }
  })
}

/**
 * Remove markup from an `html` string.
 *
 * @example
 * stripHTML('<p class="foo">bar</p>') // 'foo'
 */
export function stripHTML(html: string): string {
  return html
    .replace(/<\/?[^>]+(>|$)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Trim a `text` and remove its line breaks and double spaces.
 *
 * @example
 * trimAll('{\n  foo: "bar"\n}') // '{ foo: "bar" }'
 */
export function trimAll(text: string): string {
  return text.replace(/\n/g, ' ').replace(/  +/g, ' ').trim()
}

/**
 * Capitalize the first letter of a given `text`.
 *
 * @example
 * uppercaseFirstLetter('foo') // 'Foo'
 */
export function uppercaseFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
