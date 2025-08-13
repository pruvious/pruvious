import {
  castToBoolean,
  castToNumber,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isPositiveInteger,
  isRealNumber,
  isString,
  isUndefined,
  last,
  uniqueArray,
} from '@pruvious/utils'
import type {
  ConditionalQueryBuilderParams,
  ConditionalQueryBuilderParamsOptions,
  DeleteQueryBuilderParams,
  DeleteQueryBuilderParamsOptions,
  ExplicitWhereOrGroup,
  GenericWhereValue,
  InsertQueryBuilderParams,
  InsertQueryBuilderParamsOptions,
  Operator,
  SelectQueryBuilderParams,
  SelectQueryBuilderParamsOptions,
  UpdateQueryBuilderParams,
  UpdateQueryBuilderParamsOptions,
  WhereField,
} from './types'

type Token = string | Token[]

/**
 * Converts a URL query string into a structured `InsertQueryBuilderParams` object.
 *
 * Supported query parameters:
 *
 * - `returning` - Comma-separated list of fields to return after the INSERT operation.
 * - `populate` - Whether to populate the inserted record after the INSERT operation.
 *
 * @example
 * ```ts
 * queryStringToInsertQueryBuilderParams('returning=id,name,founder&populate')
 * // {
 * //   returning: ['id', 'name', 'founder'],
 * //   populate: true,
 * // }
 * ```
 */
export function queryStringToInsertQueryBuilderParams(
  queryString: string | URLSearchParams | Record<string, string | string[]>,
  options?: InsertQueryBuilderParamsOptions,
): InsertQueryBuilderParams {
  const params: InsertQueryBuilderParams = {}
  const normalizedQS = normalizeQueryString(queryString)

  if (options?.returning !== false && isDefined(normalizedQS.returning)) {
    params.returning = normalizedQS.returning
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)

    if (isObject(options?.returning)) {
      const { allow, deny } = options.returning

      if (allow) {
        params.returning = params.returning.filter((field) => allow.includes(field))
      } else {
        params.returning = params.returning.filter((field) => !deny.includes(field))
      }
    }
  }

  if (options?.populate !== false && isDefined(normalizedQS.populate)) {
    params.populate = normalizedQS.populate.trim() === '' || castToBoolean(normalizedQS.populate) === true
  }

  return params
}

/**
 * Converts a structured `InsertQueryBuilderParams` object into a URL query string.
 *
 * Supported query parameters:
 *
 * - `returning` - Comma-separated list of fields to return after the INSERT operation.
 * - `populate` - Whether to populate the inserted record after the INSERT operation.
 *
 * @example
 * ```ts
 * insertQueryBuilderParamsToQueryString({ returning: ['id', 'name', 'founder'] })
 * // 'returning=id,name,founder'
 * ```
 */
export function insertQueryBuilderParamsToQueryString(
  params: InsertQueryBuilderParams,
  options?: InsertQueryBuilderParamsOptions,
) {
  const queryString: string[] = []

  if (options?.returning !== false && isDefined(params.returning)) {
    let returning = [...params.returning]

    if (isObject(options?.returning)) {
      const { allow, deny } = options.returning

      if (allow) {
        returning = returning.filter((field) => allow.includes(field))
      } else {
        returning = returning.filter((field) => !deny.includes(field))
      }
    }

    queryString.push(`returning=${returning.join(',')}`)
  }

  if (options?.populate !== false && isDefined(params.populate)) {
    queryString.push(params.populate ? 'populate=1' : 'populate=0')
  }

  return queryString.filter(Boolean).map(encodeQueryString).join('&')
}

/**
 * Converts a URL query string into a structured `SelectQueryBuilderParams` object.
 *
 * Supported query parameters:
 *
 * - `select` - Comma-separated list of fields to retrieve.
 * - `where` - Filtering condition for the results (excluding raw queries).
 * - `search` - Search condition for the results.
 * - `groupBy` - Comma-separated list of fields to group the results by.
 * - `orderBy` - Comma-separated list of fields to order the results by.
 * - `orderByRelevance` - Controls search result ordering based on relevance.
 * - `limit` - Maximum number of results to return.
 * - `offset` - Number of results to skip.
 * - `page` - Page number to retrieve.
 * - `perPage` - Number of results per page.
 * - `populate` - Whether to populate related fields.
 *
 * @example
 * ```ts
 * queryStringToSelectQueryBuilderParams('select=lastName&where=firstName[=][Harry]')
 * // {
 * //   select: ['lastName'],
 * //   where: [
 * //     { field: 'firstName', operator: '=', value: 'Harry' },
 * //   ],
 * // }
 * ```
 */
export function queryStringToSelectQueryBuilderParams(
  queryString: string | URLSearchParams | Record<string, string | string[]>,
  options?: SelectQueryBuilderParamsOptions,
): SelectQueryBuilderParams {
  const params: SelectQueryBuilderParams = {}
  const normalizedQS = normalizeQueryString(queryString)

  if (options?.select !== false && isDefined(normalizedQS.select)) {
    params.select = normalizedQS.select
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)

    if (isObject(options?.select)) {
      const { allow, deny } = options.select

      if (allow) {
        params.select = params.select.filter((field) => allow.includes(field))
      } else {
        params.select = params.select.filter((field) => !deny.includes(field))
      }
    }
  }

  if (options?.where !== false && isDefined(normalizedQS.where)) {
    params.where = queryStringToConditionalQueryBuilderParams(normalizedQS, options).where!
  }

  if (options?.search !== false && isDefined(normalizedQS.search)) {
    const tokens = parseSearchTokens([...tokenizeSearchQueryStringValue(normalizedQS.search)])
    params.search = buildSearchCondition(tokens, options)
  }

  if (options?.groupBy !== false && isDefined(normalizedQS.groupBy)) {
    params.groupBy = normalizedQS.groupBy
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)

    if (isObject(options?.groupBy)) {
      const { allow, deny } = options.groupBy

      if (allow) {
        params.groupBy = params.groupBy.filter((field) => allow.includes(field))
      } else {
        params.groupBy = params.groupBy.filter((field) => !deny.includes(field))
      }
    }
  }

  if (options?.orderBy !== false && isDefined(normalizedQS.orderBy)) {
    params.orderBy = normalizedQS.orderBy
      .split(',')
      .filter(Boolean)
      .map((field) => {
        const parts = field.split(':').map((part, i) => (i === 0 ? part.trim() : part.trim().toLowerCase()))
        const columns = parts[0]
        const direction = parts[1] === 'desc' ? 'desc' : 'asc'
        const nullsTrimmed = parts[2] ?? parts[1] ?? ''
        const nulls =
          nullsTrimmed === 'nullsfirst' ? 'nullsFirst' : nullsTrimmed === 'nullslast' ? 'nullsLast' : 'nullsAuto'
        return { field: columns, direction, nulls } as const
      })

    if (isObject(options?.orderBy)) {
      const { allow, deny } = options.orderBy

      if (allow) {
        params.orderBy = params.orderBy.filter(({ field }) => allow.includes(field))
      } else {
        params.orderBy = params.orderBy.filter(({ field }) => !deny.includes(field))
      }
    }
  }

  if (options?.orderByRelevance !== false && isDefined(normalizedQS.orderByRelevance)) {
    const value = normalizedQS.orderByRelevance.trim().toLowerCase()

    if (value === 'high' || value === 'low') {
      params.orderByRelevance = value
    } else if (castToBoolean(normalizedQS.orderByRelevance) === false) {
      params.orderByRelevance = false
    }
  }

  let hasValidPerPage = false

  if (options?.limit !== false) {
    if (isDefined(normalizedQS.limit)) {
      const limit = castToNumber(normalizedQS.limit)

      if (isPositiveInteger(limit)) {
        params.limit = limit
      }
    } else if (isDefined(normalizedQS.perPage) && options?.offset !== false) {
      const perPage = castToNumber(normalizedQS.perPage)

      if (isPositiveInteger(perPage)) {
        params.limit = perPage
        hasValidPerPage = true
      }
    }
  }

  if (isNumber(options?.limit)) {
    params.limit = isDefined(params.limit) ? Math.min(params.limit, options.limit) : options.limit
  }

  if (options?.offset !== false) {
    if (isDefined(normalizedQS.offset)) {
      const offset = castToNumber(normalizedQS.offset)

      if (isPositiveInteger(offset)) {
        params.offset = offset

        if (hasValidPerPage) {
          delete params.limit
        }
      }
    } else if (isDefined(normalizedQS.page) && hasValidPerPage) {
      const page = castToNumber(normalizedQS.page)

      if (isPositiveInteger(page)) {
        params.offset = (page - 1) * params.limit!
      }
    }
  }

  if (options?.populate !== false && isDefined(normalizedQS.populate)) {
    params.populate = normalizedQS.populate.trim() === '' || castToBoolean(normalizedQS.populate) === true
  }

  return params
}

/**
 * Converts a structured `SelectQueryBuilderParams` object into a URL query string.
 *
 * Supported query parameters:
 *
 * - `select` - Comma-separated list of fields to retrieve.
 * - `where` - Filtering condition for the results (excluding raw queries).
 * - `search` - Search condition for the results.
 * - `groupBy` - Comma-separated list of fields to group the results by.
 * - `orderBy` - Comma-separated list of fields to order the results by.
 * - `orderByRelevance` - Controls search result ordering based on relevance.
 * - `limit` - Maximum number of results to return.
 * - `offset` - Number of results to skip.
 * - `page` - Page number to retrieve.
 * - `perPage` - Number of results per page.
 * - `populate` - Whether to populate related fields.
 *
 * @example
 * ```ts
 * selectQueryBuilderParamsToQueryString({
 *   select: ['lastName'],
 *   where: [
 *     { field: 'firstName', operator: '=', value: 'Harry' },
 *   ],
 * })
 * // 'select=lastName&where=firstName[=][Harry]'
 * ```
 */
export function selectQueryBuilderParamsToQueryString(
  params: SelectQueryBuilderParams,
  options?: SelectQueryBuilderParamsOptions,
) {
  const queryString: string[] = []

  if (options?.select !== false && isDefined(params.select)) {
    let select = [...params.select]

    if (isObject(options?.select)) {
      const { allow, deny } = options.select

      if (allow) {
        select = select.filter((field) => allow.includes(field))
      } else {
        select = select.filter((field) => !deny.includes(field))
      }
    }

    queryString.push(`select=${select.join(',')}`)
  }

  if (options?.where !== false && isDefined(params.where)) {
    queryString.push(conditionalQueryBuilderParamsToQueryString({ where: params.where }, options))
  }

  if (options?.search !== false && isDefined(params.search)) {
    queryString.push(buildSearchQueryString(params.search, options))
  }

  if (options?.groupBy !== false && isDefined(params.groupBy)) {
    let groupBy = [...params.groupBy]

    if (isObject(options?.groupBy)) {
      const { allow, deny } = options.groupBy

      if (allow) {
        groupBy = groupBy.filter((field) => allow.includes(field))
      } else {
        groupBy = groupBy.filter((field) => !deny.includes(field))
      }
    }

    queryString.push(`groupBy=${groupBy.join(',')}`)
  }

  if (options?.orderBy !== false && isDefined(params.orderBy)) {
    let orderBy = [...params.orderBy]

    if (isObject(options?.orderBy)) {
      const { allow, deny } = options.orderBy

      if (allow) {
        orderBy = orderBy.filter(({ field }) => allow.includes(field))
      } else {
        orderBy = orderBy.filter(({ field }) => !deny.includes(field))
      }
    }

    queryString.push(
      `orderBy=${orderBy
        .map(
          ({ field, direction, nulls }) =>
            field +
            (direction === 'desc' ? ':desc' : '') +
            (nulls === 'nullsFirst' || nulls === 'nullsLast' ? `:${nulls}` : ''),
        )
        .join(',')}`,
    )
  }

  if (options?.orderByRelevance !== false && isDefined(params.orderByRelevance)) {
    if (params.orderByRelevance === 'high' || params.orderByRelevance === 'low') {
      queryString.push(`orderByRelevance=${params.orderByRelevance}`)
    } else if (castToBoolean(params.orderByRelevance) === false) {
      queryString.push('orderByRelevance=0')
    }
  }

  let limit: number | undefined
  let hasPerPage = false

  if (options?.limit !== false) {
    if (isDefined(params.limit)) {
      limit = params.limit
    } else if (isDefined(params.perPage)) {
      limit = params.perPage
      hasPerPage = true
    }
  }

  if (isNumber(options?.limit)) {
    limit = isDefined(limit) ? Math.min(limit, options.limit) : options.limit
  }

  if (isDefined(limit) && !hasPerPage) {
    queryString.push(`limit=${limit}`)
  }

  if (options?.offset !== false) {
    if (isDefined(params.offset)) {
      queryString.push(`offset=${params.offset}`)
    } else if (isDefined(params.page) && hasPerPage) {
      queryString.push(`page=${params.page}`, `perPage=${limit}`)
    } else if (hasPerPage) {
      queryString.push(`page=1`, `perPage=${limit}`)
    }
  }

  if (options?.populate !== false && isDefined(params.populate)) {
    queryString.push(params.populate ? 'populate=1' : 'populate=0')
  }

  return queryString.filter(Boolean).map(encodeQueryString).join('&')
}

/**
 * Converts a URL query string into a structured `UpdateQueryBuilderParams` object.
 *
 * Supported query parameters:
 *
 * - `where` - Filtering condition for the results (excluding raw queries).
 * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
 * - `populate` - Whether to populate the updated record after the UPDATE operation.
 *
 * @example
 * ```ts
 * queryStringToUpdateQueryBuilderParams('where=firstName[=][Harry]&returning=lastName')
 * // {
 * //   where: [
 * //     { field: 'firstName', operator: '=', value: 'Harry' },
 * //   ],
 * //   returning: ['lastName'],
 * // }
 * ```
 */
export function queryStringToUpdateQueryBuilderParams(
  queryString: string | URLSearchParams | Record<string, string | string[]>,
  options?: UpdateQueryBuilderParamsOptions,
): UpdateQueryBuilderParams {
  const params: UpdateQueryBuilderParams = {}
  const normalizedQS = normalizeQueryString(queryString)

  if (options?.returning !== false && isDefined(normalizedQS.returning)) {
    params.returning = normalizedQS.returning
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)

    if (isObject(options?.returning)) {
      const { allow, deny } = options.returning

      if (allow) {
        params.returning = params.returning.filter((field) => allow.includes(field))
      } else {
        params.returning = params.returning.filter((field) => !deny.includes(field))
      }
    }
  }

  if (options?.where !== false && isDefined(normalizedQS.where)) {
    params.where = queryStringToConditionalQueryBuilderParams(normalizedQS, options).where!
  }

  if (options?.populate !== false && isDefined(normalizedQS.populate)) {
    params.populate = normalizedQS.populate.trim() === '' || castToBoolean(normalizedQS.populate) === true
  }

  return params
}

/**
 * Converts a structured `UpdateQueryBuilderParams` object into a URL query string.
 *
 * Supported query parameters:
 *
 * - `where` - Filtering condition for the results (excluding raw queries).
 * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
 * - `populate` - Whether to populate the updated record after the UPDATE operation.
 *
 * @example
 * ```ts
 * updateQueryBuilderParamsToQueryString({
 *   where: [
 *     { field: 'firstName', operator: '=', value: 'Harry' },
 *   ],
 *   returning: ['lastName'],
 * })
 * // 'where=firstName[=][Harry]&returning=lastName'
 * ```
 */
export function updateQueryBuilderParamsToQueryString(
  params: UpdateQueryBuilderParams,
  options?: UpdateQueryBuilderParamsOptions,
) {
  const queryString: string[] = []

  if (options?.returning !== false && isDefined(params.returning)) {
    let returning = [...params.returning]

    if (isObject(options?.returning)) {
      const { allow, deny } = options.returning

      if (allow) {
        returning = returning.filter((field) => allow.includes(field))
      } else {
        returning = returning.filter((field) => !deny.includes(field))
      }
    }

    queryString.push(`returning=${returning.join(',')}`)
  }

  if (options?.where !== false && isDefined(params.where)) {
    queryString.push(conditionalQueryBuilderParamsToQueryString({ where: params.where }, options))
  }

  if (options?.populate !== false && isDefined(params.populate)) {
    queryString.push(params.populate ? 'populate=1' : 'populate=0')
  }

  return queryString.filter(Boolean).map(encodeQueryString).join('&')
}

/**
 * Converts a URL query string into a structured `DeleteQueryBuilderParams` object.
 *
 * Supported query parameters:
 *
 * - `where` - Filtering condition for the results (excluding raw queries).
 * - `returning` - Comma-separated list of fields to return after the DELETE operation.
 * - `populate` - Whether to populate the deleted record after the DELETE operation.
 *
 * @example
 * ```ts
 * queryStringToDeleteQueryBuilderParams('where=firstName[=][Harry]&returning=lastName')
 * // {
 * //   where: [
 * //     { field: 'firstName', operator: '=', value: 'Harry' },
 * //   ],
 * //   returning: ['lastName'],
 * // }
 * ```
 */
export function queryStringToDeleteQueryBuilderParams(
  queryString: string | URLSearchParams | Record<string, string | string[]>,
  options?: DeleteQueryBuilderParamsOptions,
): DeleteQueryBuilderParams {
  const params: DeleteQueryBuilderParams = {}
  const normalizedQS = normalizeQueryString(queryString)

  if (options?.returning !== false && isDefined(normalizedQS.returning)) {
    params.returning = normalizedQS.returning
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)

    if (isObject(options?.returning)) {
      const { allow, deny } = options.returning

      if (allow) {
        params.returning = params.returning.filter((field) => allow.includes(field))
      } else {
        params.returning = params.returning.filter((field) => !deny.includes(field))
      }
    }
  }

  if (options?.where !== false && isDefined(normalizedQS.where)) {
    params.where = queryStringToConditionalQueryBuilderParams(normalizedQS, options).where!
  }

  if (options?.populate !== false && isDefined(normalizedQS.populate)) {
    params.populate = normalizedQS.populate.trim() === '' || castToBoolean(normalizedQS.populate) === true
  }

  return params
}

/**
 * Converts a structured `DeleteQueryBuilderParams` object into a URL query string.
 *
 * Supported query parameters:
 *
 * - `where` - Filtering condition for the results (excluding raw queries).
 * - `returning` - Comma-separated list of fields to return after the DELETE operation.
 * - `populate` - Whether to populate the deleted record after the DELETE operation.
 *
 * @example
 * ```ts
 * deleteQueryBuilderParamsToQueryString({
 *   where: [
 *     { field: 'firstName', operator: '=', value: 'Harry' },
 *   ],
 *   returning: ['lastName'],
 * })
 * // 'where=firstName[=][Harry]&returning=lastName'
 * ```
 */
export function deleteQueryBuilderParamsToQueryString(
  params: DeleteQueryBuilderParams,
  options?: DeleteQueryBuilderParamsOptions,
) {
  const queryString: string[] = []

  if (options?.returning !== false && isDefined(params.returning)) {
    let returning = [...params.returning]

    if (isObject(options?.returning)) {
      const { allow, deny } = options.returning

      if (allow) {
        returning = returning.filter((field) => allow.includes(field))
      } else {
        returning = returning.filter((field) => !deny.includes(field))
      }
    }

    queryString.push(`returning=${returning.join(',')}`)
  }

  if (options?.where !== false && isDefined(params.where)) {
    queryString.push(conditionalQueryBuilderParamsToQueryString({ where: params.where }, options))
  }

  if (options?.populate !== false && isDefined(params.populate)) {
    queryString.push(params.populate ? 'populate=1' : 'populate=0')
  }

  return queryString.filter(Boolean).map(encodeQueryString).join('&')
}

/**
 * Converts a URL query string into a structured `queryStringToConditionalQueryBuilderParams` object.
 *
 * Supported query parameters:
 *
 * - `where` - Filtering condition for the results (excluding raw queries).
 *
 * @example
 * ```ts
 * queryStringToConditionalQueryBuilderParams('where=firstName[=][Harry]')
 * // {
 * //   where: [
 * //     { field: 'firstName', operator: '=', value: 'Harry' },
 * //   ],
 * // }
 *
 * queryStringToConditionalQueryBuilderParams('where=orGroup[firstName[=][Harry],firstName[=][Hermione]]')
 * // {
 * //   where: [
 * //     {
 * //       or: [
 * //         [{ field: 'firstName', operator: '=', value: 'Harry' }],
 * //         [{ field: 'firstName', operator: '=', value: 'Hermione' }],
 * //       ],
 * //     },
 * //   ],
 * // }
 *
 * queryStringToConditionalQueryBuilderParams(`where=
 *   orGroup[
 *     [
 *       firstName[=][Harry],
 *       orGroup[
 *         lastName[=][Otter],
 *         lastName[=][Potter]
 *       ],
 *     ],
 *     [
 *       firstName[=][Hermione],
 *       lastName[ilike][%NG%],
 *     ]
 *   ]`)
 * // {
 * //   where: [
 * //     {
 * //       or: [
 * //         [
 * //           { field: 'firstName', operator: '=', value: 'Harry' },
 * //           {
 * //             or: [
 * //               [{ field: 'lastName', operator: '=', value: 'Otter' }],
 * //               [{ field: 'lastName', operator: '=', value: 'Potter' }],
 * //             ],
 * //           },
 * //         ],
 * //         [
 * //           { field: 'firstName', operator: '=', value: 'Hermione' },
 * //           { field: 'lastName', operator: 'ilike', value: '%NG%' },
 * //         ],
 * //       ],
 * //     },
 * //   ],
 * // }
 * ```
 */
export function queryStringToConditionalQueryBuilderParams(
  queryString: string | URLSearchParams | Record<string, string | string[]>,
  options?: ConditionalQueryBuilderParamsOptions,
): ConditionalQueryBuilderParams {
  const params: ConditionalQueryBuilderParams = {}
  const normalizedQS = normalizeQueryString(queryString)

  if (options?.where !== false && isDefined(normalizedQS.where)) {
    const tokens = parseWhereTokens([...tokenizeWhereQueryStringValue(normalizedQS.where)])
    params.where = buildWhereCondition(tokens, options)
  }

  return params
}

function parseWhereTokens(tokens: Token[]): Token[] {
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

function* tokenizeWhereQueryStringValue(value: string) {
  let token = ''
  let c: string | undefined = ''
  let escape = false

  const characters = value.split('')

  while ((c = characters.shift())) {
    if ((c === '[' || c === ']') && !escape) {
      if (token) {
        yield token
        token = ''
      }
      yield c
    } else if ((c === '\\' || c === '$') && !escape) {
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

function buildWhereCondition(
  tokens: Token[],
  options?: ConditionalQueryBuilderParamsOptions,
): (WhereField | ExplicitWhereOrGroup)[] {
  if (options?.where === false) {
    return []
  }

  const whereCondition: (WhereField | ExplicitWhereOrGroup)[] = []

  let token: Token | undefined
  let current: { field: string; operator?: Operator; value?: GenericWhereValue } | undefined

  while ((token = tokens.shift())) {
    if (isString(token)) {
      let trimmedToken = token.trim()

      if (!current) {
        const startsWithComma = trimmedToken.startsWith(',')

        if (whereCondition.length && !startsWithComma) {
          continue
        }

        if (startsWithComma) {
          trimmedToken = trimmedToken.replace(/^,\s*/, '')
        }

        if (
          trimmedToken === 'orGroup' &&
          isArray(tokens[0]) &&
          (tokens[0].length !== 1 || !parseOperator(tokens[0][0]))
        ) {
          const nextToken = tokens.shift() as Token[]
          const or: (WhereField | ExplicitWhereOrGroup)[][] = []
          const tokenGroups: Token[][] = [[]]

          for (const t of nextToken) {
            if (isString(t) && t.trim().startsWith(',')) {
              tokenGroups.push([])
            }

            last(tokenGroups)!.push(t)
          }

          for (const group of tokenGroups) {
            const condition = buildWhereCondition(group, options)

            if (condition.length) {
              or.push(condition)
            }
          }

          if (or.length) {
            whereCondition.push({ or })
          }
        } else if (trimmedToken) {
          if (
            isObject(options?.where) &&
            (('allow' in options.where && !options.where.allow.some(({ field }) => field === trimmedToken)) ||
              ('deny' in options.where &&
                options.where.deny.some(({ field, operators }) => field === trimmedToken && !operators)))
          ) {
            continue
          }

          current = { field: trimmedToken }
        }
      }
    } else if (isArray(token)) {
      if (current) {
        if (token.length === 1 && isString(token[0])) {
          const trimmedToken = token[0].trim()

          if (isUndefined(current.operator)) {
            const operator = parseOperator(trimmedToken)

            if (operator) {
              if (
                isObject(options?.where) &&
                (('allow' in options.where &&
                  options.where.allow.some(
                    ({ field, operators }) => field === current!.field && operators && !operators.includes(operator),
                  )) ||
                  ('deny' in options.where &&
                    options.where.deny.some(
                      ({ field, operators }) => field === current!.field && operators?.includes(operator),
                    )))
              ) {
                current = undefined
                continue
              }

              current.operator = operator
            } else {
              current = undefined
            }
          } else if (isUndefined(current.value)) {
            const field = current.field
            const operator = current.operator

            let value: GenericWhereValue = trimmedToken

            current = undefined

            if ((operator === '=' || operator === '!=') && (value === 'null' || value === 'NULL')) {
              value = null
            } else if (operator === '<' || operator === '<=' || operator === '>' || operator === '>=') {
              value = castToNumber(value)

              if (!isRealNumber(value)) {
                continue
              }
            } else if (
              operator === 'includes' ||
              operator === 'includesAny' ||
              operator === 'excludes' ||
              operator === 'excludesAny'
            ) {
              value = value.split(',').map(castToNumber)

              if (!value.length) {
                continue
              }
            } else if (operator === 'in' || operator === 'notIn') {
              value = value.split(',').map((v) => {
                const tv = v.trim()
                return tv === 'null' || tv === 'NULL' ? null : tv
              })

              if (!value.length) {
                continue
              }
            } else if (operator === 'between' || operator === 'notBetween') {
              value = value.split(',').map((v) => castToNumber(v.trim())) as [number, number]

              if (value.length !== 2 || !value.every(isRealNumber)) {
                continue
              }
            }

            whereCondition.push({ field, operator, value })
          }
        } else if (
          token.length === 0 &&
          isDefined(current.operator) &&
          isUndefined(current.value) &&
          ['=', '!='].includes(current.operator)
        ) {
          whereCondition.push({ field: current.field, operator: current.operator, value: '' })
          current = undefined
        } else if (
          token.length === 1 &&
          isDefined(current.operator) &&
          isUndefined(current.value) &&
          ['=', '!=', 'like', 'notLike', 'ilike', 'notIlike'].includes(current.operator)
        ) {
          whereCondition.push({
            field: current.field,
            operator: current.operator,
            value: isArray(token[0]) ? `[${String(token[0])}]` : String(token[0]),
          })
          current = undefined
        } else {
          current = undefined
        }
      } else {
        whereCondition.push(...buildWhereCondition(token, options))
      }
    }
  }

  return whereCondition
}

/**
 * Converts a structured `queryStringToConditionalQueryBuilderParams` object into a URL query string.
 *
 * Supported query parameters:
 *
 * - `where` - Filtering condition for the results (excluding raw queries).
 *
 * @example
 * ```ts
 * conditionalQueryBuilderParamsToQueryString({
 *   where: [
 *     { field: 'firstName', operator: '=', value: 'Harry' },
 *   ],
 * })
 * // 'where=firstName[=][Harry]'
 *
 * conditionalQueryBuilderParamsToQueryString({
 *   where: [
 *     {
 *       or: [
 *         [{ field: 'firstName', operator: '=', value: 'Harry' }],
 *         [{ field: 'firstName', operator: '=', value: 'Hermione' }],
 *       ],
 *     },
 *   ],
 * })
 * // 'where=orGroup[firstName[=][Harry],firstName[=][Hermione]]'
 *
 * conditionalQueryBuilderParamsToQueryString({
 *   where: [
 *     {
 *       or: [
 *         [
 *           { field: 'firstName', operator: '=', value: 'Harry' },
 *           {
 *             or: [
 *               [{ field: 'lastName', operator: '=', value: 'Otter' }],
 *               [{ field: 'lastName', operator: '=', value: 'Potter' }],
 *             ],
 *           },
 *         ],
 *         [
 *           { field: 'firstName', operator: '=', value: 'Hermione' },
 *           { field: 'lastName', operator: 'ilike', value: '%NG%' },
 *         ],
 *       ],
 *     },
 *   ],
 * })
 * // 'where=orGroup[[firstName[=][Harry],orGroup[lastName[=][Otter],lastName[=][Potter]]],[firstName[=][Hermione],lastName[ilike][%NG%]]]'
 * ```
 */
export function conditionalQueryBuilderParamsToQueryString(
  params: ConditionalQueryBuilderParams,
  options?: ConditionalQueryBuilderParamsOptions,
) {
  if (options?.where !== false && isDefined(params.where)) {
    const where = buildWhereQueryString(params.where, options)
    return `where=${where}`
  }

  return ''
}

function buildWhereQueryString(
  where: (WhereField | ExplicitWhereOrGroup)[],
  options?: ConditionalQueryBuilderParamsOptions,
): string {
  let queryString = ''

  for (const condition of where) {
    if ('field' in condition) {
      const { field, operator, value } = condition
      let escapedValue = value

      if (isString(escapedValue)) {
        const isInBrackets = escapedValue.startsWith('[') && escapedValue.endsWith(']')
        escapedValue = (isInBrackets ? escapedValue.slice(1, -1) : escapedValue).replace(/(\[|\]|\$)/g, (m) => `$${m}`)
        if (isInBrackets) {
          escapedValue = `[${escapedValue}]`
        }
      }

      if (
        isObject(options?.where) &&
        (('allow' in options.where &&
          !options.where.allow.some(
            ({ field: f, operators }) => f === field && (!operators || operators.includes(operator)),
          )) ||
          ('deny' in options.where &&
            options.where.deny.some(
              ({ field: f, operators }) => f === field && (!operators || operators.includes(operator)),
            )))
      ) {
        continue
      }

      queryString += `${field}[${operator}][${escapedValue}]`
    } else if ('or' in condition) {
      const orGroup = condition.or.map((group) => buildWhereQueryString(group, options)).join(',')
      queryString += `orGroup[${orGroup}]`
    }

    queryString += ','
  }

  return queryString.endsWith(',') ? queryString.slice(0, -1) : queryString
}

function parseSearchTokens(tokens: Token[]): Token[] {
  const result: Token[] = []

  let token: Token | undefined

  while ((token = tokens.shift())) {
    if (token === ']') {
      return result
    }

    result.push(token === '[' ? parseSearchTokens(tokens) : token)
  }

  return result
}

function* tokenizeSearchQueryStringValue(value: string) {
  let token = ''
  let c: string | undefined = ''
  let escape = false

  const characters = value.split('')

  while ((c = characters.shift())) {
    if ((c === '[' || c === ']') && !escape) {
      if (token) {
        yield token
        token = ''
      }
      yield c
    } else if ((c === '\\' || c === '$') && !escape) {
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

function buildSearchCondition(
  tokens: Token[],
  options?: SelectQueryBuilderParamsOptions,
): { fields: string[]; keywords: string[] }[] {
  if (options?.search === false) {
    return []
  }

  const searchCondition: { fields: string[]; keywords: string[] }[] = []

  let token: Token | undefined
  let current: { fields: string[]; keywords: string[] } | undefined
  let inUsed: boolean = false

  while ((token = tokens.shift())) {
    if (isString(token)) {
      let trimmedToken = token.trim()

      if (!current) {
        const startsWithComma = trimmedToken.startsWith(',')

        if (searchCondition.length && !startsWithComma) {
          continue
        }

        if (startsWithComma) {
          trimmedToken = trimmedToken.replace(/^,\s*/, '')
        }

        current = {
          fields: [],
          keywords: uniqueArray(
            trimmedToken
              .split(' ')
              .map((keyword) => keyword.trim())
              .filter(Boolean),
          ),
        }
      }
    } else if (isArray(token) && current) {
      if (token.length === 1 && isString(token[0])) {
        if (!inUsed && token[0].toLowerCase() === 'in') {
          inUsed = true
          continue
        } else if (inUsed) {
          const fields = token[0]
            .split(',')
            .map((field) => field.trim())
            .filter(Boolean)
          const filteredFields: string[] = []

          if (isObject(options?.search)) {
            const allow = options.search.allow || fields
            const deny = options.search.deny || []

            for (const field of fields) {
              if (allow.includes(field) && !deny.includes(field)) {
                filteredFields.push(field)
              }
            }
          } else {
            filteredFields.push(...fields)
          }

          current.fields.push(...uniqueArray(filteredFields))

          if (current.fields.length && current.keywords.length) {
            searchCondition.push(current)
            current = undefined
            inUsed = false
            continue
          }
        } else {
          current = undefined
          inUsed = false
          continue
        }
      } else {
        current = undefined
        inUsed = false
        continue
      }
    }
  }

  return searchCondition
}

function buildSearchQueryString(
  search: { fields: string[]; keywords: string[] }[],
  options?: SelectQueryBuilderParamsOptions,
): string {
  if (options?.search === false) {
    return ''
  }

  const queryStringParts: string[] = []

  for (const { fields, keywords } of search) {
    const filteredFields: string[] = []

    if (isObject(options?.search)) {
      const allow = options.search.allow || fields
      const deny = options.search.deny || []

      for (const field of fields) {
        if (allow.includes(field) && !deny.includes(field)) {
          filteredFields.push(field)
        }
      }
    } else {
      filteredFields.push(...fields)
    }

    if (filteredFields.length && keywords.length) {
      queryStringParts.push(`${keywords.join(' ')}[in][${filteredFields.join(',')}]`)
    }
  }

  return queryStringParts.length ? 'search=' + queryStringParts.join(',') : ''
}

/**
 * Normalizes a query string into a consistent format.
 *
 * @example
 * ```ts
 * // String input
 * normalizeQueryString('key1=value1&key2=value2')
 * // { key1: 'value1', key2: 'value2' }
 *
 * // URLSearchParams input
 * normalizeQueryString(new URLSearchParams('key1=value1&key2=value2'))
 * // { key1: 'value1', key2: 'value2' }
 *
 * // Object input
 * normalizeQueryString({ key1: 'value1', key2: ['value2', 'value3'] })
 * // { key1: 'value1', key2: 'value2,value3' }
 * ```
 */
export function normalizeQueryString(
  queryString: string | URLSearchParams | Record<string, string | string[]>,
): Record<string, string> {
  const normalized: Record<string, string> = {}

  if (isString(queryString)) {
    const delimiterIndex = queryString.indexOf('?')

    if (delimiterIndex > -1) {
      const firstBracketIndex = queryString.indexOf('[')

      if (firstBracketIndex === -1 || delimiterIndex < firstBracketIndex) {
        queryString = queryString.slice(delimiterIndex + 1)
      }
    }

    try {
      new URLSearchParams(queryString.trim()).forEach((value, key) => {
        if (isDefined(normalized[key])) {
          normalized[key] += `,${value}`
        } else {
          normalized[key] = value
        }
      })
    } catch {}
  } else if (queryString instanceof URLSearchParams) {
    queryString.forEach((value, key) => {
      if (isDefined(normalized[key])) {
        normalized[key] += `,${value}`
      } else {
        normalized[key] = String(value)
      }
    })
  } else if (isObject(queryString)) {
    for (const [key, value] of Object.entries(queryString)) {
      normalized[key] = isArray(value) ? value.join(',').toString() : String(value)
    }
  }

  return normalized
}

/**
 * Encodes a `value` for use in a URL query string while preserving certain characters.
 * This function applies URL encoding but keeps some special characters unencoded for better readability.
 */
export function encodeQueryString(value: string): string {
  return value
    .replaceAll('#', '%23')
    .replaceAll('&', '%26')
    .replace(/%(?![0-9A-Fa-f]{2})/gi, '%25')
}

/**
 * Decodes a `value` encoded with the `encodeQueryString` function.
 */
export function decodeQueryString(value: string): string {
  return value.replace(/%25/gi, '%').replaceAll('%23', '#').replaceAll('%26', '&')
}

function parseOperator(value: any): Operator | null {
  if (isString(value)) {
    if (
      value === '=' ||
      value === '!=' ||
      value === '<' ||
      value === '<=' ||
      value === '>' ||
      value === '>=' ||
      value === 'includes' ||
      value === 'includesAny' ||
      value === 'excludes' ||
      value === 'excludesAny'
    ) {
      return value
    }

    const lowerValue = value.toLowerCase()

    if (lowerValue === 'in' || lowerValue === 'like' || lowerValue === 'ilike' || lowerValue === 'between') {
      return lowerValue
    } else if (lowerValue === 'notin') {
      return 'notIn'
    } else if (lowerValue === 'notlike') {
      return 'notLike'
    } else if (lowerValue === 'notilike') {
      return 'notIlike'
    } else if (lowerValue === 'notbetween') {
      return 'notBetween'
    }
  }

  return null
}
