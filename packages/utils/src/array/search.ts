import { getProperty } from '../object/props'
import { isString } from '../string/is'
import { extractKeywords } from '../string/op'
import { isArray } from './is'

/**
 * Searches for items in an array based on provided keywords.
 * The search is case-insensitive and supports partial matches.
 *
 * @param array    The array to search.
 * @param keywords The keywords to search for.
 *                 If a string is provided, it will be split into keywords.
 *                 If an array is provided, it will be used as is.
 * @param props    If provided, search will be performed on the specified properties of the items in the array, and items must be objects.
 *                 If not provided, items themselves are treated as strings.
 *
 * @returns an array of items sorted by relevance.
 *          Relevance is calculated based on the number of occurrences of the keywords in the item/property and the position of the first occurrence.
 *
 * @example
 * ```ts
 * searchByKeywords(['foo', 'bar'], 'FOO') // ['foo']
 * searchByKeywords([{ foo: 'foo' }, { foo: 'bar' }], 'FOO', 'foo') // [{ foo: 'foo' }]
 * ```
 */
export function searchByKeywords<T>(array: T[], keywords: string | string[], props?: string | string[]): T[] {
  const extractedKeywords = (isString(keywords) ? extractKeywords(keywords) : keywords).map((keyword) =>
    keyword.toLowerCase(),
  )

  return array
    .map((item) => {
      let value = ''
      let score = 0

      if (isString(props)) {
        value = getProperty<string>(item as any, props).toLowerCase()
      } else if (isArray(props)) {
        value = props
          .map((prop) => getProperty<string>(item as any, prop))
          .join(' ')
          .toLowerCase()
      } else {
        value = item as string
      }

      if (extractedKeywords.length) {
        for (const keyword of extractedKeywords) {
          const index = value.indexOf(keyword)

          if (index === -1) {
            score = 0
            break
          } else {
            score += keyword.length / (index + 1)
          }
        }
      } else {
        score = 0.1
      }

      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}
