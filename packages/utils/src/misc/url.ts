export interface ParsedRelURL {
  /**
   * The route ID from the Routes collection.
   */
  routeId: number

  /**
   * The collection name (if linking to a collection record).
   */
  collection?: string

  /**
   * The record ID within the collection (if linking to a collection record).
   */
  recordId?: number

  /**
   * The language pin (e.g. `@en`, `@de`, etc.).
   */
  language: string

  /**
   * The query string (without the leading `?`).
   */
  query?: string

  /**
   * The hash fragment (without the leading `#`).
   */
  hash?: string
}

/**
 * Parses a `rel://` URL into its component parts.
 *
 * Supported formats:
 * - `rel://Routes:{routeId}`
 * - `rel://Routes:{routeId}/{Collection}:{recordId}`
 * - `rel://Routes:{routeId}@{language}`
 * - `rel://Routes:{routeId}/{Collection}:{recordId}@{language}`
 * - Any of the above with optional `?query` and/or `#hash`
 *
 * @param url - The `rel://` URL string to parse.
 * @param primaryLanguage - The primary language to use when the URL has no `@{language}` pin.
 *
 * @returns The parsed components, or `null` if the URL is not a valid `rel://` URL.
 *
 * @example
 * ```ts
 * parseRelURL('rel://Routes:1', 'en')
 * // { routeId: 1, language: 'en' }
 *
 * parseRelURL('rel://Routes:1/Articles:5', 'en')
 * // { routeId: 1, collection: 'Articles', recordId: 5, language: 'en' }
 *
 * parseRelURL('rel://Routes:1@de', 'en')
 * // { routeId: 1, language: 'de' }
 *
 * parseRelURL('rel://Routes:1/Articles:5@de?foo=bar#section', 'en')
 * // { routeId: 1, collection: 'Articles', recordId: 5, language: 'de', query: 'foo=bar', hash: 'section' }
 * ```
 */
export function parseRelURL(url: string, primaryLanguage: string): ParsedRelURL | null {
  const relURLRegex =
    /^rel:\/\/Routes:(\d+)(?:\/([A-Z][a-zA-Z0-9]*):(\d+))?(?:@([a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{2,8})*))?(?:\?([^#]*))?(?:#(.*))?$/
  const match = relURLRegex.exec(url)

  if (!match) {
    return null
  }

  const result: ParsedRelURL = {
    routeId: Number(match[1]),
    language: match[4] || primaryLanguage,
  }

  if (match[2] && match[3]) {
    result.collection = match[2]
    result.recordId = Number(match[3])
  }

  if (match[5]) {
    result.query = match[5]
  }

  if (match[6]) {
    result.hash = match[6]
  }

  return result
}

/**
 * Checks whether a URL string uses the `rel://` protocol.
 */
export function isRelURL(url: string): boolean {
  return url.startsWith('rel://')
}

/**
 * Builds a `rel://` URL string from its component parts.
 *
 * @example
 * ```ts
 * buildRelURL({ routeId: 1 })
 * // 'rel://Routes:1'
 *
 * buildRelURL({ routeId: 1, collection: 'Articles', recordId: 5, query: 'foo=bar', hash: 'section' })
 * // 'rel://Routes:1/Articles:5?foo=bar#section'
 *
 * buildRelURL({ routeId: 1, language: 'de' })
 * // 'rel://Routes:1@de'
 *
 * buildRelURL({ routeId: 1, collection: 'Articles', recordId: 5, language: 'de' })
 * // 'rel://Routes:1/Articles:5@de'
 * ```
 */
export function buildRelURL(parts: Omit<ParsedRelURL, 'language'> & Partial<Pick<ParsedRelURL, 'language'>>): string {
  let url = `rel://Routes:${parts.routeId}`

  if (parts.collection && parts.recordId !== undefined) {
    url += `/${parts.collection}:${parts.recordId}`
  }

  if (parts.language) {
    url += `@${parts.language}`
  }

  if (parts.query) {
    url += `?${parts.query}`
  }

  if (parts.hash) {
    url += `#${parts.hash}`
  }

  return url
}
