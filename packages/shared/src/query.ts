import { isObject } from '@pruvious-test/utils'
import qs from 'qs'
import { AndFilter, Filter, OrFilter, QueryStringParameters } from './types'

/**
 * Parse and validate a URL query string for making queries.
 *
 * @example
 * ```js
 * parseQueryString('sort=title:asc') // { sort: [ { field: 'title', direction: 'asc' } ] }
 * ```
 */
export function parseQueryString(input: string): {
  params: QueryStringParameters
  diagnostics: string[]
} {
  const diagnostics: string[] = []
  const params: QueryStringParameters = {}

  try {
    const obj: Record<string, any> = qs.parse(input.replace(/^\?/, ''), { depth: 6 }) ?? {}

    // Sort
    if (Array.isArray(obj.sort)) {
      params.sort = []

      for (const item of obj.sort) {
        if (typeof item === 'string') {
          const parts = item.split(':')
          params.sort.push({ field: parts[0], direction: parts[1] === 'asc' ? 'asc' : 'desc' })
        } else {
          diagnostics.push(`Invalid item in 'sort' parameter: ${JSON.stringify(item)}`)
        }
      }
    } else if (typeof obj.sort === 'string') {
      const parts = obj.sort.split(':')
      params.sort = [{ field: parts[0], direction: parts[1] === 'asc' ? 'asc' : 'desc' }]
    } else if (obj.sort !== undefined) {
      diagnostics.push(`Invalid parameter type 'sort': ${JSON.stringify(obj.sort)}`)
    }

    // Filters
    if (obj.filters && validateFilters(obj.filters)) {
      params.filters = obj.filters
    } else if (obj.sort !== undefined) {
      diagnostics.push(`Invalid parameter type 'filters': ${JSON.stringify(obj.filters)}`)
    }

    // Search
    if (typeof obj.search === 'string') {
      params.search = obj.search
    } else if (obj.search !== undefined) {
      diagnostics.push(`Invalid parameter type 'search': ${JSON.stringify(obj.search)}`)
    }

    // Fields
    if (Array.isArray(obj.fields)) {
      params.fields = []

      for (const field of obj.fields) {
        if (typeof field === 'string') {
          params.fields.push(field)
        } else {
          diagnostics.push(`Invalid field in 'fields' parameter: ${JSON.stringify(field)}`)
        }
      }
    } else if (obj.fields !== undefined) {
      diagnostics.push(`Invalid parameter type 'fields': ${JSON.stringify(obj.fields)}`)
    }

    // Language
    if (typeof obj.language === 'string') {
      params.language = obj.language
    } else if (obj.language !== undefined) {
      diagnostics.push(`Invalid parameter type 'language': ${JSON.stringify(obj.language)}`)
    }

    // Pagination
    if (typeof obj.perPage === 'string') {
      params.perPage = +obj.perPage
    } else if (obj.perPage !== undefined) {
      diagnostics.push(`Invalid parameter type 'perPage': ${JSON.stringify(obj.perPage)}`)
    }

    if (typeof obj.page === 'string') {
      params.page = +obj.page
    } else if (obj.page !== undefined) {
      diagnostics.push(`Invalid parameter type 'page': ${JSON.stringify(obj.page)}`)
    }
  } catch (_) {
    diagnostics.push('Cannot parse input query string')
  }

  return { params, diagnostics }
}

/**
 * Convert query string parameters to a URL query string.
 *
 * @example
 * ```js
 * stringifyQueryParameters({ sort: [ { field: 'title', direction: 'asc' } ] }) // 'sort=title:asc'
 * ```
 */
export function stringifyQueryParameters(params: QueryStringParameters): string {
  const obj: Record<string, any> = JSON.parse(JSON.stringify(params))

  if (params.sort) {
    obj.sort = params.sort.map((item) => `${item.field}:${item.direction}`)

    if (obj.sort.length === 1) {
      obj.sort = obj.sort[0]
    }
  }

  return qs
    .stringify(obj, { encodeValuesOnly: true })
    .replace(/([$a-z0-9_]+)%3A(asc|desc|[1-9][0-9]*)/gi, '$1:$2')
}

export function validateFilters(
  filters: Record<string, Filter> | OrFilter | AndFilter | undefined,
): boolean {
  if (filters === undefined) {
    return true
  } else if (isObject(filters)) {
    if (
      filters['$and'] &&
      Array.isArray(filters['$and']) &&
      filters['$and'].every((filter) => validateFilters(filter))
    ) {
      return true
    } else if (
      filters['$or'] &&
      Array.isArray(filters['$or']) &&
      filters['$or'].every((filter) => validateFilters(filter))
    ) {
      return true
    } else {
      return Object.entries(filters).every(([_, filter]) => isObject(filter))
    }
  }

  return false
}
