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
