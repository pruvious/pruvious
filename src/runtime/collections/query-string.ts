import {
  primaryLanguage,
  supportedLanguages,
  type CollectionFieldName,
  type CollectionName,
  type CollectionSearchStructure,
  type MultiCollectionName,
  type SingleCollectionName,
  type Sortable,
  type SupportedLanguage,
} from '#pruvious'
import { collections, fields } from '#pruvious/server'
import { H3Event, getQuery } from 'h3'
import { Op } from 'sequelize'
import type { QueryObject } from 'ufo'
import { dbToJsType } from '../fields/field.definition'
import { booleanishSanitizer } from '../sanitizers/booleanish'
import { numericSanitizer } from '../sanitizers/numeric'
import { isArray, uniqueArray } from '../utils/array'
import { isBoolean, isDefined, isUndefined } from '../utils/common'
import { getDatabaseDialect } from '../utils/database'
import { isInteger, isPositiveInteger, isRealNumber } from '../utils/number'
import { deepClone } from '../utils/object'
import { parseQSArray, parseWhereTokens, tokenize, type Token } from '../utils/query-string'
import { __ } from '../utils/server/translate-string'
import { extractKeywords, isString } from '../utils/string'
import type { ResolvedCollectionDefinition } from './collection.definition'

export type QueryStringParams<T extends CollectionName> = MultiQueryStringParams<T & MultiCollectionName> &
  SingleQueryStringParams<T & SingleCollectionName>

interface BaseQueryStringParams<T extends CollectionName> {
  /**
   * Specifies whether the query results will be returned with casted or populated field values.
   * This parameter accepts a booleanish value.
   *
   * By default, the query builder returns the casted field values without populating related data.
   *
   * @default false
   *
   * @example
   * ```typescript
   * '?populate=true' // true
   * '?populate=1'    // true
   * '?populate=no'   // false
   * ```
   */
  populate: boolean

  /**
   * Specifies the `fields` to be selected and returned from the query.
   * Use a wildcard (`*`) to select all fields.
   *
   * By default, all collection fields are selected.
   *
   * @example
   * ```typescript
   * '?select=foo,bar'        // ['foo', 'bar']
   * '?select=foo&select=bar' // ['foo', 'bar']
   * '?select=*'              // ['foo', 'bar', 'baz', ...]
   * '?select='               // []
   * ```
   */
  select: CollectionFieldName[T][]
}

export interface MultiQueryStringParams<T extends MultiCollectionName> extends BaseQueryStringParams<T> {
  /**
   * Specifies how to group the query results based on a specific collection field.
   *
   * @default []
   */
  group: CollectionFieldName[T][]

  /**
   * Specifies the maximum number of records to be returned by the query.
   *
   * @default undefined
   */
  limit: number | undefined

  /**
   * Specifies the offset (starting position) for the query results.
   *
   * @default undefined
   */
  offset: number | undefined

  /**
   * Specifies the sorting order for the query results based on specific collection fields.
   *
   * By default, the sorting is done in ascending order (`asc`).
   *
   * @default []
   *
   * @example
   * ```typescript
   * '?order=foo'                // [['foo', 'ASC NULLS LAST']]
   * '?order=foo:desc'           // [['foo', 'DESC NULLS LAST']]
   * '?order=foo,bar:desc'       // [['foo', 'ASC NULLS LAST'], ['bar', 'DESC NULLS LAST']]
   * '?order=foo&order=bar:desc' // [['foo', 'ASC NULLS LAST'], ['bar', 'DESC NULLS LAST']]
   * ```
   */
  order: [Sortable[T], 'ASC NULLS LAST' | 'DESC NULLS LAST'][]

  /**
   * Specifies all filtering conditions in the query.
   *
   * @default { [Op.and]: [] }
   *
   * @example
   * ```typescript
   * '?where=foo[eq][bar]' // foo = 'bar'
   * '?where=foo[eq][bar],baz[gt][0]' // foo = 'bar' AND baz > 0
   * '?where=foo[eq][bar]&where=baz[gt][0]' // foo = 'bar' AND baz > 0
   * '?where=[foo[eq][bar],baz[gt][0]]' // foo = 'bar' AND baz > 0
   * '?where=every:[foo[eq][bar],baz[gt][0]]' // foo = 'bar' AND baz > 0
   * '?where=some:[baz[gt][0],baz[eq][null]]' // baz > 0 OR baz IS NULL
   * '?where=foo[=][bar],some:[baz[>][0],baz[=][null]]' // foo = 'bar' AND (baz > 0 OR baz IS NULL)
   * ```
   */
  where: Record<any, any>

  /**
   * A key-value object where the key represents the search structure key and the value the search keywords.
   *
   * @default {}
   *
   * @example
   * ```typescript
   * { default: 'foo bar' }
   * ```
   */
  search: Partial<Record<CollectionSearchStructure[T] & string, string[]>>
}

export interface SingleQueryStringParams<T extends SingleCollectionName> extends BaseQueryStringParams<T> {
  /**
   * The language code of a supported language in the CMS.
   *
   * Defaults to the language code of the primary language.
   */
  language: SupportedLanguage
}

export const defaultMultiQueryStringParams = Object.freeze<MultiQueryStringParams<MultiCollectionName>>({
  group: [],
  limit: undefined,
  offset: undefined,
  order: [],
  populate: false,
  select: [],
  where: { [Op.and]: [] },
  search: {},
})

export const defaultSingleQueryStringParams = Object.freeze<SingleQueryStringParams<SingleCollectionName>>({
  language: primaryLanguage,
  populate: false,
  select: [],
})

interface Options {
  /**
   * Custom error messages.
   */
  customErrorMessages?: {
    /**
     * A custom error message displayed when the `select` query parameter is empty.
     *
     * @default "At least one field must be included in the 'select' parameter"
     */
    emptySelect?: string

    /**
     * A custom error message displayed when an operator in the `where` query parameter is incompatible.
     *
     * @default "Cannot use operator '$operator' on field '$field'"
     */
    incompatibleWhereOperator?: string

    /**
     * A custom error message displayed when a value in the `where` query parameter is incompatible.
     *
     * @default "Cannot use value '$value' for operation '$operation' on field '$field'"
     */
    incompatibleWhereValue?: string

    /**
     * A custom error message displayed when the `language` query parameter contains an unsupported language code.
     *
     * @default "The language code '$language' is not supported"
     */
    invalidLanguage?: string

    /**
     * A custom error message displayed when the `order` direction cannot be resolved.
     *
     * @default "The order direction '$direction' is not valid"
     */
    invalidOrderDirection?: string

    /**
     * A custom error message displayed when the `where` query parameter cannot be resolved.
     *
     * @default "The 'where' parameter is not valid"
     */
    invalidWhere?: string

    /**
     * A custom error message displayed when an operator in the `where` query parameter is not valid.
     *
     * @default "The operator '$operator' is not valid"
     */
    invalidWhereOperator?: string

    /**
     * A custom error message displayed when the `limit` query parameter is not a non-negative integer.
     *
     * @default "The 'limit' parameter must be a non-negative integer"
     */
    limitNotNonNegativeInteger?: string

    /**
     * A custom error message displayed when a query parameter contains a nonexistent field.
     *
     * @default "The field '$field' does not exist"
     */
    nonExistentField?: string

    /**
     * A custom error message displayed when a nonexistent search structure key is provided.
     *
     * @default "The search structure '$structure' does not exist"
     */
    nonExistentSearchStructure?: string

    /**
     * A custom error message displayed when the collection is not searchable.
     *
     * @default 'This collection is not searchable'
     */
    notSearchable?: string

    /**
     * A custom error message displayed when the `offset` query parameter is not a non-negative integer.
     *
     * @default "The 'offset' parameter must be a non-negative integer"
     */
    offsetNotNonNegativeInteger?: string

    /**
     * A custom error message displayed when the `page` parameter is not a positive integer.
     *
     * @default "The 'page' parameter must be a positive integer"
     */
    pageNotPositiveInteger?: string

    /**
     * A custom error message displayed when the `page` and `offset` query parameters are used simultaneously.
     *
     * @default "Using both 'page' and 'offset' parameters simultaneously is not permitted"
     */
    pageUsedWithOffset?: string

    /**
     * A custom error message displayed when the `page` parameter is used without specifying `perPage` or `limit`.
     *
     * @default "The 'page' parameter requires either 'perPage' or 'limit' to be present"
     */
    pageWithoutPerPageOrLimit?: string

    /**
     * A custom error message displayed when the `perPage` query parameters is not a positive integer.
     *
     * @default "The 'perPage' parameter must be a positive integer"
     */
    perPageNotPositiveInteger?: string

    /**
     * A custom error message displayed when the `perPage` and `limit` query parameters are used simultaneously.
     *
     * @default "Using both 'perPage' and 'limit' parameters simultaneously is not permitted"
     */
    perPageUsedWithLimit?: string

    /**
     * A custom error message displayed when the `populate` query parameter is not a booleanish value.
     *
     * @default "The 'populate' parameter must be a booleanish value"
     */
    populateNotBooleanish?: string

    /**
     * A custom error message displayed when a query parameter contains a protected field.
     *
     * @default "The field '$field' cannot be queried"
     */
    protectedField?: string
  }

  /**
   * Specifies the current request `operation` that defines the parsing logic for the query string parameters.
   *
   * If the `operation` parameter is not provided, it will be resolved based on the current HTTP method:
   * - `POST` - Create operation
   * - `GET` - Read operation
   * - `PATCH` - Update operation
   * - `DELETE` - Delete operation
   */
  operation?: 'create' | 'read' | 'update' | 'delete'

  /**
   * Represents the current query object, parsed using the `getQuery` utility.
   *
   * If not specified, the `queryObject` will be automatically resolved from the current `event`.
   */
  queryObject?: QueryObject
}

/**
 * Parse the query string parameters and return an object with resolved and validated query string `params` for a specified `collection`.
 * Additionally, the returned object contains a list of `errors` found while validating the input query object.
 *
 * The function automatically reads the current query string parameters from the `event` argument.
 * You can override this behavior by customizing the `options` argument.
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const { params, errors } = getQueryStringParams(event, 'products')
 *
 *   // Example: GET http://localhost:3000/api/collections/products?select=id,name&populate=true
 *   console.log(params)
 *   // Output: { select: ['id', 'name'], ..., populate: true }
 * })
 * ```
 */
export function getQueryStringParams<T extends CollectionName>(
  event: H3Event,
  collection: T | ResolvedCollectionDefinition,
  options?: Options,
): {
  /**
   * Parsed query string parameters, ready for use with a collection's query builder.
   *
   * @example
   * ```typescript
   * export default defineEventHandler(async (event) => {
   *   const { params } = getQueryStringParams(event, 'products')
   *   return query('products').applyQueryStringParams(params).all()
   * })
   * ```
   */
  params: QueryStringParams<T>

  /**
   * Array of error messages generated during query string parameter parsing.
   *
   * @example
   * ```typescript
   * export default defineEventHandler(async (event) => {
   *   const { errors } = getQueryStringParams(event, 'products')
   *
   *   if (errors.length) {
   *     setResponseStatus(event, 400)
   *     return errors.join('\n')
   *   }
   * })
   * ```
   */
  errors: string[]
} {
  const qs = options?.queryObject ?? getQuery(event) ?? {}
  const collectionDef = isString(collection) ? collections[collection] : collection
  const isMultiCollection = collectionDef.mode === 'multi'
  const errors: string[] = []
  const params = deepClone(
    isMultiCollection ? defaultMultiQueryStringParams : defaultSingleQueryStringParams,
  ) as QueryStringParams<T>

  /*
  |--------------------------------------------------------------------------
  | Resolve operation
  |--------------------------------------------------------------------------
  |
  */
  let operation = options?.operation

  if (!operation) {
    switch (event.method) {
      case 'POST':
        operation = 'create'
        break
      case 'GET':
        operation = 'read'
        break
      case 'PATCH':
        operation = 'update'
        break
      case 'DELETE':
        operation = 'delete'
        break
      default:
        throw new Error(__(event, 'pruvious-server', 'Unable to determine the request operation'))
    }
  }

  /*
  |--------------------------------------------------------------------------
  | group
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.group) && isMultiCollection && operation === 'read') {
    params.group = parseQSArray(qs.group)?.filter((fieldName) => {
      if (collectionDef.fields[fieldName]) {
        if (collectionDef.fields[fieldName].additional?.protected) {
          errors.push(
            __(
              event,
              'pruvious-server',
              options?.customErrorMessages?.protectedField ?? ("The field '$field' cannot be queried" as any),
              { field: fieldName },
            ),
          )
          return false
        } else {
          return true
        }
      } else {
        errors.push(
          __(
            event,
            'pruvious-server',
            options?.customErrorMessages?.nonExistentField ?? ("The field '$field' does not exist" as any),
            { field: fieldName },
          ),
        )
        return false
      }
    }) as any
  }

  /*
  |--------------------------------------------------------------------------
  | language
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.language) && !isMultiCollection && (operation === 'read' || operation === 'update')) {
    const language = qs.language && isString(qs.language) ? qs.language : null

    if (language && supportedLanguages.includes(language as SupportedLanguage)) {
      params.language = language as any
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.invalidLanguage as any) ?? "The language code '$language' is not supported",
          { language },
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | limit
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.limit) && isMultiCollection && operation === 'read') {
    const limit = qs.limit && isString(qs.limit) ? +qs.limit : null

    if (isInteger(limit) && limit >= 0) {
      params.limit = limit
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.limitNotNonNegativeInteger as any) ??
            "The 'limit' parameter must be a non-negative integer",
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | offset
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.offset) && isMultiCollection && operation === 'read') {
    const offset = qs.offset && isString(qs.offset) ? +qs.offset : null

    if (isInteger(offset) && offset >= 0) {
      params.offset = offset
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.offsetNotNonNegativeInteger as any) ??
            "The 'offset' parameter must be a non-negative integer",
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | order
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.order) && isMultiCollection) {
    const order = parseQSArray(qs.order)

    if (order?.length) {
      params.order = order
        .map((value) => {
          if (value[0] === ':') {
            const splitted = value.slice(1).split(':')
            const structure = splitted[0]
            const direction = resolveOrderDirection(splitted[1] ?? 'asc')
            const search = collectionDef.search

            if (!search) {
              errors.push(
                __(
                  event,
                  'pruvious-server',
                  (options?.customErrorMessages?.notSearchable as any) ?? 'This collection is not searchable',
                ),
              )
              return false
            } else if (!search[structure]) {
              errors.push(
                __(
                  event,
                  'pruvious-server',
                  (options?.customErrorMessages?.nonExistentSearchStructure as any) ??
                    `The search structure '$structure' does not exist`,
                  { structure },
                ),
              )
              return false
            } else if (direction === false) {
              errors.push(
                __(
                  event,
                  'pruvious-server',
                  (options?.customErrorMessages?.invalidOrderDirection as any) ??
                    `The order direction '$direction' is not valid`,
                  { direction },
                ),
              )
              return false
            }

            return [`:${structure}`, direction === 'asc' ? 'ASC NULLS LAST' : 'DESC NULLS LAST']
          } else {
            const splitted = value.split(':')
            const fieldName = splitted[0]
            const direction = resolveOrderDirection(splitted[1] ?? 'asc')

            if (!collectionDef.fields[fieldName]) {
              errors.push(
                __(
                  event,
                  'pruvious-server',
                  (options?.customErrorMessages?.nonExistentField as any) ?? `The field '$field' does not exist`,
                  { field: fieldName },
                ),
              )
              return false
            } else if (direction === false) {
              errors.push(
                __(
                  event,
                  'pruvious-server',

                  (options?.customErrorMessages?.invalidOrderDirection as any) ??
                    `The order direction '${direction}' is not valid`,
                  { direction },
                ),
              )
              return false
            } else if (collectionDef.fields[fieldName].additional?.protected) {
              errors.push(
                __(
                  event,
                  'pruvious-server',
                  (options?.customErrorMessages?.protectedField as any) ?? `The field '$field' cannot be queried`,
                  { field: fieldName },
                ),
              )
              return false
            }

            return [fieldName, direction === 'asc' ? 'ASC NULLS LAST' : 'DESC NULLS LAST']
          }
        })
        .filter(Boolean) as any
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.emptySelect as any) ??
            "At least one field must be included in the 'select' parameter",
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | perPage
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.perPage) && isMultiCollection && operation === 'read') {
    const perPage = qs.perPage && isString(qs.perPage) ? +qs.perPage : null

    if (isPositiveInteger(perPage)) {
      if (isDefined(qs.limit)) {
        errors.push(
          __(
            event,
            'pruvious-server',
            (options?.customErrorMessages?.perPageUsedWithLimit as any) ??
              "Using both 'perPage' and 'limit' parameters simultaneously is not permitted",
          ),
        )
      } else {
        params.limit = perPage
      }
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.perPageNotPositiveInteger as any) ??
            "The 'perPage' parameter must be a positive integer",
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | page
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.page) && isMultiCollection && operation === 'read') {
    const page = qs.page && isString(qs.page) ? +qs.page : null

    if (isPositiveInteger(page)) {
      if (isUndefined(qs.perPage) && isUndefined(qs.limit)) {
        errors.push(
          __(
            event,
            'pruvious-server',
            (options?.customErrorMessages?.pageWithoutPerPageOrLimit as any) ??
              "The 'page' parameter requires either 'perPage' or 'limit' to be present",
          ),
        )
      } else if (isDefined(qs.offset)) {
        errors.push(
          __(
            event,
            'pruvious-server',
            (options?.customErrorMessages?.pageUsedWithOffset as any) ??
              "Using both 'page' and 'offset' parameters simultaneously is not permitted",
          ),
        )
      } else if (params.limit) {
        params.offset = (page - 1) * params.limit
      }
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.pageNotPositiveInteger as any) ??
            "The 'page' parameter must be a positive integer",
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | populate
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.populate)) {
    const populate = booleanishSanitizer({ value: qs.populate })

    if (isBoolean(populate)) {
      params.populate = populate
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.populateNotBooleanish as any) ??
            "The 'populate' parameter must be a booleanish value",
        ),
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | search
  |--------------------------------------------------------------------------
  |
  */
  if (isMultiCollection && operation === 'read') {
    const search: [string, any][] = Object.entries(qs)
      .filter(([key]) => key === 'search' || key.startsWith('search:'))
      .map(([key, value]) => [key === 'search' ? 'default' : key.replace('search:', ''), value])

    for (const [structure, value] of search) {
      const structures = collectionDef.search

      if (structures) {
        if (structures[structure]) {
          const keywordsInput = isArray(value)
            ? value.join(' ')
            : isString(value) || isRealNumber(value) || isBoolean(value)
            ? value.toString()
            : ''

          params.search[structure as keyof typeof params.search] = extractKeywords(keywordsInput)
        } else {
          errors.push(
            __(
              event,
              'pruvious-server',
              (options?.customErrorMessages?.nonExistentSearchStructure as any) ??
                "The search structure '$structure' does not exist",
              { structure },
            ),
          )
        }
      } else {
        errors.push(
          __(
            event,
            'pruvious-server',
            (options?.customErrorMessages?.notSearchable as any) ?? 'This collection is not searchable',
          ),
        )
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | select
  |--------------------------------------------------------------------------
  |
  */
  params.select = Object.keys(collectionDef.fields) as any

  if (isDefined(qs.select)) {
    const select = parseQSArray(qs.select)

    if (select?.length) {
      const filtered = select.filter((fieldName) => {
        if (fieldName === '*') {
          return true
        } else if (collectionDef.fields[fieldName]) {
          if (collectionDef.fields[fieldName].additional?.protected) {
            errors.push(
              __(
                event,
                'pruvious-server',
                (options?.customErrorMessages?.protectedField as any) ?? `The field '$field' cannot be queried`,
                { field: fieldName },
              ),
            )
            return false
          } else {
            return true
          }
        } else {
          errors.push(
            __(
              event,
              'pruvious-server',
              (options?.customErrorMessages?.nonExistentField as any) ?? `The field '$field' does not exist`,
              { field: fieldName },
            ),
          )
          return false
        }
      }) as any

      if (!filtered.includes('*')) {
        params.select = filtered
      }
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.emptySelect as any) ??
            "At least one field must be included in the 'select' parameter",
        ),
      )
    }

    if (!params.select.length) {
      params.select = ['id'] as any
    }
  }

  /*
  |--------------------------------------------------------------------------
  | where
  |--------------------------------------------------------------------------
  |
  */
  if (isDefined(qs.where) && isMultiCollection && operation !== 'create') {
    if (qs.where && (isString(qs.where) || isArray(qs.where))) {
      params.where = parseWhere(qs.where, collectionDef, errors, options, event.context.language)
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          (options?.customErrorMessages?.invalidWhere as any) ?? "The 'where' parameter is not valid",
        ),
      )
    }
  }

  return { params, errors: uniqueArray(errors) }
}

function resolveOrderDirection(value: string): 'asc' | 'desc' | false {
  const v = value.toLowerCase()
  const a = ['a', 'asc', 'ascending', 'u', 'up']
  const d = ['d', 'desc', 'descending', 'down']

  return a.includes(v) ? 'asc' : d.includes(v) ? 'desc' : false
}

function parseWhere(
  value: string | string[],
  collection: ResolvedCollectionDefinition,
  errors: string[],
  options: Options | undefined,
  contextLanguage: SupportedLanguage,
): Record<any, any> {
  const stringValue = isString(value) ? value : value.join(',')
  const tokens = parseWhereTokens([...tokenize(stringValue.split(''))])
  const where = parseWhereFilters(tokens, collection, errors, options, contextLanguage)

  return { [Op.and]: where }
}

function parseWhereFilters(
  tokens: Token[],
  collection: ResolvedCollectionDefinition,
  errors: string[],
  options: Options | undefined,
  contextLanguage: SupportedLanguage,
): Record<any, any> {
  const filters: Record<any, any>[] = []

  let token: Token | undefined
  let fieldName: string | undefined
  let operator: symbol | undefined
  let operatorString: string | undefined
  let expectedValueType: 'array' | 'numberOrString' | 'numberOrStringTuple' | 'string' | undefined
  let value: any

  while ((token = tokens.shift())) {
    let clear = false

    if (isString(token) && token[0] === ',' && !fieldName) {
      token = token.slice(1)
    }

    if ((isArray(token) && !fieldName) || token === 'some:' || token === 'every:') {
      const rel = token === 'some:' ? Op.or : Op.and

      if (isString(token)) {
        token = tokens.shift()
      }

      if (isArray(token)) {
        filters.push({ [rel]: parseWhereFilters(token, collection, errors, options, contextLanguage) })
      } else {
        errors.push(
          __(
            contextLanguage,
            'pruvious-server',
            (options?.customErrorMessages?.invalidWhere as any) ?? "The 'where' parameter is not valid",
          ),
        )
      }
    } else if (isString(token) && !fieldName && !operator && !value) {
      if (collection.fields[token]) {
        if (collection.fields[token].additional?.protected) {
          errors.push(
            __(
              contextLanguage,
              'pruvious-server',
              (options?.customErrorMessages?.protectedField as any) ?? "The field '$field' cannot be queried",
              { field: token },
            ),
          )
          tokens.splice(0, 2)
        } else {
          fieldName = token
        }
      } else {
        errors.push(
          __(
            contextLanguage,
            'pruvious-server',
            (options?.customErrorMessages?.nonExistentField as any) ?? `The field '$field' does not exist`,
            { field: token },
          ),
        )
        tokens.splice(0, 2)
      }
    } else if (isArray(token) && fieldName && !operator && !value) {
      if (isString(token[0])) {
        operatorString = token[0]

        const o = operatorString.toLowerCase()
        const type = dbToJsType(fields[collection.fields[fieldName].type]?.type.db)

        let incompatible = false

        if (o === '=' || o === 'eq') {
          operator = Op.eq
        } else if (o === '!=' || o === 'ne') {
          operator = Op.ne
        } else if (o === '>' || o === 'gt') {
          if (type === 'string' || type === 'number') {
            operator = Op.gt
            expectedValueType = 'numberOrString'
          } else {
            incompatible = true
          }
        } else if (o === '>=' || o === 'gte') {
          if (type === 'string' || type === 'number') {
            operator = Op.gte
            expectedValueType = 'numberOrString'
          } else {
            incompatible = true
          }
        } else if (o === '<' || o === 'lt') {
          if (type === 'string' || type === 'number') {
            operator = Op.lt
            expectedValueType = 'numberOrString'
          } else {
            incompatible = true
          }
        } else if (o === '<=' || o === 'lte') {
          if (type === 'string' || type === 'number') {
            operator = Op.lte
            expectedValueType = 'numberOrString'
          } else {
            incompatible = true
          }
        } else if (o === 'between') {
          if (type === 'string' || type === 'number') {
            operator = Op.between
            expectedValueType = 'numberOrStringTuple'
          } else {
            incompatible = true
          }
        } else if (o === 'notbetween') {
          if (type === 'string' || type === 'number') {
            operator = Op.notBetween
            expectedValueType = 'numberOrStringTuple'
          } else {
            incompatible = true
          }
        } else if (o === 'in') {
          operator = Op.in
          expectedValueType = 'array'
        } else if (o === 'notin') {
          operator = Op.notIn
          expectedValueType = 'array'
        } else if (o === 'like') {
          operator = Op.like
          expectedValueType = 'string'
        } else if (o === 'notlike') {
          operator = Op.notLike
          expectedValueType = 'string'
        } else if (o === 'ilike') {
          operator = getDatabaseDialect() === 'postgres' ? Op.iLike : Op.like
          expectedValueType = 'string'
        } else if (o === 'notilike') {
          operator = getDatabaseDialect() === 'postgres' ? Op.notILike : Op.notLike
          expectedValueType = 'string'
        } else {
          errors.push(
            __(
              contextLanguage,
              'pruvious-server',
              (options?.customErrorMessages?.invalidWhereOperator as any) ?? "The operator '$operator' is not valid",
              { operator: operatorString },
            ),
          )
          tokens.splice(0, 1)
          clear = true
        }

        if (incompatible) {
          errors.push(
            __(
              contextLanguage,
              'pruvious-server',
              (options?.customErrorMessages?.incompatibleWhereOperator as any) ??
                "Cannot use operator '$operator' on field $field",
              { operator: operatorString, field: fieldName },
            ),
          )
          tokens.splice(0, 1)
          clear = true
        }
      } else {
        errors.push(
          __(
            contextLanguage,
            'pruvious-server',
            (options?.customErrorMessages?.invalidWhere as any) ?? "The 'where' parameter is not valid",
          ),
        )
        tokens.splice(0, 1)
        clear = true
      }
    } else if (isArray(token) && fieldName && operator && !value) {
      const type = dbToJsType(fields[collection.fields[fieldName].type]?.type.db)
      const tokenValue = token[0] ?? ''

      let incompatible = !isString(tokenValue)

      if (!incompatible) {
        if (expectedValueType === 'array') {
          const array = parseQSArray(tokenValue)

          if (array) {
            if (type === 'boolean') {
              value = array.map((el) => {
                const casted = booleanishSanitizer({ value: el })
                if (!isBoolean(casted)) incompatible = true
                return casted
              })
            } else if (type === 'number') {
              value = array.map((el) => {
                const casted = numericSanitizer({ value: el })
                if (!isRealNumber(casted)) incompatible = true
                return casted
              })
            } else {
              value = array
            }
          } else {
            incompatible = true
          }
        } else if (expectedValueType === 'numberOrString') {
          if (type === 'number') {
            value = numericSanitizer({ value: tokenValue })
            incompatible = !isRealNumber(value)
          } else {
            value = tokenValue
          }
        } else if (expectedValueType === 'numberOrStringTuple') {
          const array = parseQSArray(tokenValue)

          if (array?.length === 2) {
            if (type === 'number') {
              value = array.map((el) => {
                const casted = numericSanitizer({ value: el })
                if (!isRealNumber(casted)) incompatible = true
                return casted
              })
            } else {
              value = array
            }
          } else {
            incompatible = true
          }
        } else if (expectedValueType === 'string') {
          if (type === 'string') {
            value = tokenValue
          } else {
            incompatible = true
          }
        } else if ((tokenValue as string).toLowerCase() === 'null') {
          value = null
        } else if (type === 'boolean') {
          value = booleanishSanitizer({ value: tokenValue })
          incompatible = !isBoolean(value)
        } else if (type === 'number') {
          value = numericSanitizer({ value: tokenValue })
          incompatible = !isRealNumber(value)
        } else {
          value = tokenValue
        }
      }

      if (incompatible) {
        errors.push(
          __(
            contextLanguage,
            'pruvious-server',
            (options?.customErrorMessages?.incompatibleWhereValue as any) ??
              "Cannot use value '$value' for operation '$operation' on field '$field'",
            { value: tokenValue, operation: operatorString, field: fieldName },
          ),
        )
      } else {
        filters.push({ [fieldName]: { [operator]: value } })
      }

      clear = true
    } else {
      errors.push(
        __(
          contextLanguage,
          'pruvious-server',
          (options?.customErrorMessages?.invalidWhere as any) ?? "The 'where' parameter is not valid",
        ),
      )
      clear = true
    }

    if (clear) {
      fieldName = undefined
      operator = undefined
      operatorString = undefined
      expectedValueType = undefined
      value = undefined
    }
  }

  if (fieldName) {
    errors.push(
      __(
        contextLanguage,
        'pruvious-server',
        (options?.customErrorMessages?.invalidWhere as any) ?? "The 'where' parameter is not valid",
      ),
    )
  }

  return filters
}
