import type { GenericDatabase, i18n } from '#pruvious/server'
import {
  isPaginatedQueryBuilderResultData,
  type Database,
  type DeleteContext,
  type GenericCollection,
  type QueryDetails,
  type SanitizedInsertContext,
  type SanitizedUpdateContext,
  type SelectContext,
} from '@pruvious/orm'
import { deepClone, isArray, isBoolean, isDefined, isNumber, isObject, isString, toArray } from '@pruvious/utils'
import { httpStatusCodeMessages } from '../api/utils.server'

/**
 * A collection hook that removes specified `fields` from the WHERE clause of the query builder before preparing the query.
 * This hook is useful for excluding sensitive fields from query filtering.
 *
 * This hook will not be applied if the `__ignoreRemoveWhereHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, removeWhere, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({}),
 *     // ...
 *   },
 *   hooks: {
 *     beforeQueryPreparation: [removeWhere(['secret'])],
 *     // secret will be excluded from query filtering
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function removeWhere(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<GenericDatabase>
    | SelectContext<GenericDatabase>
    | SanitizedUpdateContext<GenericDatabase>
    | DeleteContext<GenericDatabase>,
) => any {
  const fieldsArray = toArray(fields)

  return ({ operation, queryBuilder, customData }) => {
    if (!queryBuilder || customData.__ignoreRemoveWhereHook === true || operation === 'insert') {
      return
    }

    const toRemove: { parent: any; index: number }[] = []

    queryBuilder.traverseWhereCondition((condition, parent, index) => {
      if ('field' in condition && fieldsArray.includes(condition.field)) {
        toRemove.unshift({ parent, index })
      }
    })

    for (const { parent, index } of toRemove) {
      parent.splice(index, 1)
    }
  }
}

/**
 * A collection hook that throws an error if specified `fields` are present in the WHERE clause of the query builder before preparing the query.
 * This hook is useful for preventing sensitive fields from query filtering.
 *
 * This hook will not be applied if the `__ignoreDenyWhereHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, denyWhere, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({}),
 *     // ...
 *   },
 *   hooks: {
 *     beforeQueryPreparation: [denyWhere(['secret'])],
 *     // throws an error if secret is present in the WHERE clause
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function denyWhere(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | SelectContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | SanitizedUpdateContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | DeleteContext<Database<Record<string, GenericCollection>, typeof i18n>>,
) => any {
  const fieldsArray = toArray(fields)

  return ({ __, operation, queryBuilder, customData }) => {
    if (!queryBuilder || customData.__ignoreDenyWhereHook === true || operation === 'insert') {
      return
    }

    queryBuilder.traverseWhereCondition((condition) => {
      if ('field' in condition && fieldsArray.includes(condition.field)) {
        setResponseStatus(useEvent(), 403, httpStatusCodeMessages[403])
        throw new Error(
          __('pruvious-api', 'The field `$field` cannot be used for filtering', { field: condition.field }),
        )
      }
    })
  }
}

/**
 * A collection hook that removes specified `fields` from the ORDER BY clause of the query builder before preparing the query.
 * This hook is useful for excluding sensitive fields from query ordering.
 *
 * This hook will not be applied if the `__ignoreRemoveOrderByHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, removeOrderBy, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({}),
 *     // ...
 *   },
 *   hooks: {
 *     beforeQueryPreparation: [removeOrderBy(['secret'])],
 *     // secret will be excluded from query ordering
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function removeOrderBy(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<GenericDatabase>
    | SelectContext<GenericDatabase>
    | SanitizedUpdateContext<GenericDatabase>
    | DeleteContext<GenericDatabase>,
) => any {
  const fieldsArray = toArray(fields)

  return ({ operation, queryBuilder, customData }) => {
    if (!queryBuilder || customData.__ignoreRemoveOrderByHook === true || operation !== 'select') {
      return
    }

    const orderBy = (queryBuilder as any).orderByClauses

    for (let i = orderBy.length - 1; i >= 0; i--) {
      if (fieldsArray.includes(orderBy[i].field)) {
        orderBy.splice(i, 1)
      }
    }
  }
}

/**
 * A collection hook that throws an error if specified `fields` are present in the ORDER BY clause of the query builder before preparing the query.
 * This hook is useful for preventing sensitive fields from query ordering.
 *
 * This hook will not be applied if the `__ignoreDenyOrderByHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, denyOrderBy, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({}),
 *     // ...
 *   },
 *   hooks: {
 *     beforeQueryPreparation: [denyOrderBy(['secret'])],
 *     // throws an error if secret is present in the ORDER BY clause
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function denyOrderBy(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | SelectContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | SanitizedUpdateContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | DeleteContext<Database<Record<string, GenericCollection>, typeof i18n>>,
) => any {
  const fieldsArray = toArray(fields)

  return ({ __, operation, queryBuilder, customData }) => {
    if (!queryBuilder || customData.__ignoreDenyOrderByHook === true || operation !== 'select') {
      return
    }

    const orderBy = (queryBuilder as any).orderByClauses

    for (const clause of orderBy) {
      if (fieldsArray.includes(clause.field)) {
        setResponseStatus(useEvent(), 403, httpStatusCodeMessages[403])
        throw new Error(__('pruvious-api', 'The field `$field` cannot be used for sorting', { field: clause.field }))
      }
    }
  }
}

/**
 * A collection hook that removes specified `fields` from the GROUP BY clause of the query builder before preparing the query.
 * This hook is useful for excluding sensitive fields from query grouping.
 *
 * This hook will not be applied if the `__ignoreRemoveGroupByHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, removeGroupBy, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({}),
 *     // ...
 *   },
 *   hooks: {
 *     beforeQueryPreparation: [removeGroupBy(['secret'])],
 *     // secret will be excluded from query grouping
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function removeGroupBy(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<GenericDatabase>
    | SelectContext<GenericDatabase>
    | SanitizedUpdateContext<GenericDatabase>
    | DeleteContext<GenericDatabase>,
) => any {
  const fieldsArray = toArray(fields)

  return ({ operation, queryBuilder, customData }) => {
    if (!queryBuilder || customData.__ignoreRemoveGroupByHook === true || operation !== 'select') {
      return
    }

    const groupBy = (queryBuilder as any).groupByFields

    for (let i = groupBy.length - 1; i >= 0; i--) {
      if (fieldsArray.includes(groupBy[i])) {
        groupBy.splice(i, 1)
      }
    }
  }
}

/**
 * A collection hook that throws an error if specified `fields` are present in the GROUP BY clause of the query builder before preparing the query.
 * This hook is useful for preventing sensitive fields from query grouping.
 *
 * This hook will not be applied if the `__ignoreDenyGroupByHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, denyGroupBy, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({}),
 *     // ...
 *   },
 *   hooks: {
 *     beforeQueryPreparation: [denyGroupBy(['secret'])],
 *     // throws an error if secret is present in the GROUP BY clause
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function denyGroupBy(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | SelectContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | SanitizedUpdateContext<Database<Record<string, GenericCollection>, typeof i18n>>
    | DeleteContext<Database<Record<string, GenericCollection>, typeof i18n>>,
) => any {
  const fieldsArray = toArray(fields)

  return ({ __, operation, queryBuilder, customData }) => {
    if (!queryBuilder || customData.__ignoreDenyGroupByHook === true || operation !== 'select') {
      return
    }

    const groupBy = (queryBuilder as any).groupByFields

    for (const field of groupBy) {
      if (fieldsArray.includes(field)) {
        setResponseStatus(useEvent(), 403, httpStatusCodeMessages[403])
        throw new Error(__('pruvious-api', 'The field `$field` cannot be used for grouping', { field }))
      }
    }
  }
}

/**
 * A collection hook that removes specified `fields` from the query builder results after executing the query.
 * This hook is useful for excluding sensitive fields from HTTP responses.
 *
 * This hook will not be applied if the `__ignoreExcludeFieldsHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `maskFields` - Replaces field values with default empty values based on type.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, excludeFields, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({ default: '***' }),
 *     // ...
 *   },
 *   hooks: {
 *     afterQueryExecution: [excludeFields(['secret'])],
 *     // secret will be undefined
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function excludeFields(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<GenericDatabase>
    | SelectContext<GenericDatabase>
    | SanitizedUpdateContext<GenericDatabase>
    | DeleteContext<GenericDatabase>,
  queryDetails: QueryDetails,
) => any {
  const fieldsArray = toArray(fields)

  return ({ customData }, { result }) => {
    if (customData.__ignoreExcludeFieldsHook === true) {
      return
    }

    if (isPaginatedQueryBuilderResultData(result)) {
      for (const item of result.data.records) {
        for (const field of fieldsArray) {
          if (isObject(item) && isDefined(item[field])) {
            delete item[field]
          }
        }
      }
    } else if (isObject(result.data)) {
      for (const field of fieldsArray) {
        if (isDefined(result.data[field])) {
          delete result.data[field]
        }
      }
    } else if (isArray(result.data)) {
      for (const item of result.data) {
        for (const field of fieldsArray) {
          if (isObject(item) && isDefined(item[field])) {
            delete item[field]
          }
        }
      }
    }
  }
}

/**
 * A collection hook that masks specified `fields` from the query builder results after executing the query.
 * This hook is useful for hiding sensitive fields from HTTP responses.
 *
 * It replaces field values with default empty values based on type:
 *
 * - `string` - `''` (empty string)
 * - `number` - `0`
 * - `boolean` - `false`
 * - `object` - `{}`
 * - `array` - `[]`
 *
 * This hook will not be applied if the `__ignoreMaskFieldsHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `resetFields` - Replaces field values with its defined default value.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, maskFields, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({ default: '***' }),
 *     // ...
 *   },
 *   hooks: {
 *     afterQueryExecution: [maskFields(['secret'])],
 *     // secret will be ''
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function maskFields(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<GenericDatabase>
    | SelectContext<GenericDatabase>
    | SanitizedUpdateContext<GenericDatabase>
    | DeleteContext<GenericDatabase>,
  queryDetails: QueryDetails,
) => any {
  const fieldsArray = toArray(fields)

  return ({ customData }, { result }) => {
    if (customData.__ignoreMaskFieldsHook === true) {
      return
    }

    if (isPaginatedQueryBuilderResultData(result)) {
      for (const item of result.data.records) {
        for (const field of fieldsArray) {
          if (isObject(item) && isDefined(item[field])) {
            item[field] = maskField(item[field])
          }
        }
      }
    } else if (isObject(result.data)) {
      for (const field of fieldsArray) {
        if (isDefined(result.data[field])) {
          result.data[field] = maskField(result.data[field])
        }
      }
    } else if (isArray(result.data)) {
      for (const item of result.data) {
        for (const field of fieldsArray) {
          if (isObject(item) && isDefined(item[field])) {
            item[field] = maskField(item[field])
          }
        }
      }
    }
  }
}

/**
 * A collection hook that resets specified `fields` from the query builder results after executing the query.
 * This hook is useful for hiding sensitive fields from HTTP responses.
 * It replaces field values with its defined default value.
 *
 * This hook will not be applied if the `__ignoreResetFieldsHook` flag is set to `true` in the `customData` object of the context.
 *
 * Related hooks:
 *
 * - `removeWhere` - Removes fields from the WHERE clause of the query builder.
 * - `denyWhere` - Throws an error if specified fields are present in the WHERE clause of the query builder.
 * - `removeOrderBy` - Removes fields from the ORDER BY clause of the query builder.
 * - `denyOrderBy` - Throws an error if specified fields are present in the ORDER BY clause of the query builder.
 * - `removeGroupBy` - Removes fields from the GROUP BY clause of the query builder.
 * - `denyGroupBy` - Throws an error if specified fields are present in the GROUP BY clause of the query builder.
 * - `excludeFields` - Removes fields from the query builder results.
 * - `maskFields` - Replaces field values with default empty values based on type.
 *
 * @example
 * ```ts
 * // server/collections/MyCollection.ts
 * import { defineCollection, resetFields, textField } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     secret: textField({ default: '***' }),
 *     // ...
 *   },
 *   hooks: {
 *     afterQueryExecution: [resetFields(['secret'])],
 *     // secret will be '***'
 *   },
 * })
 * ```
 *
 * @todo test
 */
export function resetFields(
  fields: string[] | string,
): (
  context:
    | SanitizedInsertContext<GenericDatabase>
    | SelectContext<GenericDatabase>
    | SanitizedUpdateContext<GenericDatabase>
    | DeleteContext<GenericDatabase>,
  queryDetails: QueryDetails,
) => any {
  const fieldsArray = toArray(fields)

  return ({ collection, customData }, { result }) => {
    if (!collection || customData.__ignoreResetFieldsHook === true) {
      return
    }

    if (isPaginatedQueryBuilderResultData(result)) {
      for (const item of result.data.records) {
        for (const field of fieldsArray) {
          if (isObject(item) && isDefined(item[field]) && collection.fields[field]) {
            item[field] = deepClone(collection.fields[field].default)
          }
        }
      }
    } else if (isObject(result.data)) {
      for (const field of fieldsArray) {
        if (isDefined(result.data[field]) && collection.fields[field]) {
          result.data[field] = deepClone(collection.fields[field].default)
        }
      }
    } else if (isArray(result.data)) {
      for (const item of result.data) {
        for (const field of fieldsArray) {
          if (isObject(item) && isDefined(item[field]) && collection.fields[field]) {
            item[field] = deepClone(collection.fields[field].default)
          }
        }
      }
    }
  }
}

/**
 * Replaces the `value` of a field with a default value based on its type.
 */
function maskField(value: any) {
  if (isString(value)) {
    return ''
  } else if (isNumber(value)) {
    return 0
  } else if (isBoolean(value)) {
    return false
  } else if (isArray(value)) {
    return []
  } else if (isObject(value)) {
    return {}
  }

  return value
}
