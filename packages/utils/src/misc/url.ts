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
 * - Either format with optional `?query` and/or `#hash`
 *
 * @returns The parsed components, or `null` if the URL is not a valid `rel://` URL.
 *
 * @example
 * ```ts
 * parseRelURL('rel://Routes:1')
 * // { routeId: 1 }
 *
 * parseRelURL('rel://Routes:1/Articles:5')
 * // { routeId: 1, collection: 'Articles', recordId: 5 }
 *
 * parseRelURL('rel://Routes:1/Articles:5?foo=bar#section')
 * // { routeId: 1, collection: 'Articles', recordId: 5, query: 'foo=bar', hash: 'section' }
 * ```
 */
export function parseRelURL(url: string): ParsedRelURL | null {
  const relURLRegex = /^rel:\/\/Routes:(\d+)(?:\/([A-Z][a-zA-Z0-9]*):(\d+))?(?:\?([^#]*))?(?:#(.*))?$/
  const match = relURLRegex.exec(url)

  if (!match) {
    return null
  }

  const result: ParsedRelURL = {
    routeId: Number(match[1]),
  }

  if (match[2] && match[3]) {
    result.collection = match[2]
    result.recordId = Number(match[3])
  }

  if (match[4]) {
    result.query = match[4]
  }

  if (match[5] !== undefined && match[5] !== '') {
    result.hash = match[5]
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
 * ```
 */
export function buildRelURL(parts: ParsedRelURL): string {
  let url = `rel://Routes:${parts.routeId}`

  if (parts.collection && parts.recordId !== undefined) {
    url += `/${parts.collection}:${parts.recordId}`
  }

  if (parts.query) {
    url += `?${parts.query}`
  }

  if (parts.hash) {
    url += `#${parts.hash}`
  }

  return url
}
