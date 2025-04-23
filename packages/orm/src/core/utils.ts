import { isArray, isFunction, isObject, isString, type ExtractSQLParams } from '@pruvious/utils'
import { ExecError } from './ExecError'
import type { GenericField, GenericInputFilter, GenericSanitizedInputFilter, OrderedInputFilter } from './Field'
import type { ConditionalLogic, DataType } from './types'

/**
 * Determines if a column's data type can be safely converted to another type.
 *
 * @example
 * ```ts
 * canChangeColumnType('bigint', 'numeric') // true
 * canChangeColumnType('text', 'bigint')    // false
 * ```
 */
export function canChangeColumnType(from: DataType, to: DataType): boolean {
  return to === 'text' || from === to || (from === 'bigint' && to === 'numeric')
}

/**
 * Prepares a query for execution by replacing named parameters with positional parameters,
 * or vice versa, based on the `dialect`.
 *
 * @example
 * ```ts
 * prepareQuery('select * from "foo" where "id" = $id', { id: 1337 }, 'postgres')
 * // { sql: 'select * from "foo" where "id" = $1', params: [1337] }
 *
 * prepareQuery('select * from "foo" where "id" = $id', { id: 1337 }, 'sqlite')
 * // { sql: 'select * from "foo" where "id" = $p1', params: { p1: 1337 } }
 *
 * prepareQuery('select * from "foo" where "id" = $id', { id: 1337 }, 'd1')
 * // { sql: 'select * from "foo" where "id" = ?1', params: [1337] }
 * ```
 */
export function prepareQuery<S extends string, D extends 'sqlite' | 'postgres' | 'd1'>(
  sql: S,
  params: ExtractSQLParams<S>,
  dialect: D,
): D extends 'sqlite'
  ? { sql: string; params: Record<string, any>; error?: ExecError }
  : { sql: string; params: any[]; error?: ExecError } {
  const prepared: { sql: string; params: any; error?: ExecError } = { sql: '', params: {} }
  const prefix = { postgres: '$', sqlite: '$p', d1: '?' }
  const map: Record<string, number> = {}
  const paramsArray: any[] = []

  let i = 0

  prepared.sql = sql.replace(/\$([a-z0-9_]+)/gi, (_, name) => {
    if (!map[name]) {
      map[name] = ++i
      paramsArray.push(params[name as keyof typeof params])
    }

    return prefix[dialect] + map[name]
  })

  prepared.params = dialect === 'sqlite' ? Object.fromEntries(paramsArray.map((v, i) => [`p${i + 1}`, v])) : paramsArray

  if (Object.keys(params).length !== paramsArray.length) {
    const missingParams = Object.keys(map).find((name) => !(name in params))

    if (missingParams) {
      prepared.error = new ExecError(
        new Error(`Missing named parameter "${missingParams}"`),
        prepared.sql,
        prepared.params,
      )
    } else {
      prepared.error = new ExecError(new Error('Too many named parameters'), prepared.sql, prepared.params)
    }
  }

  return prepared
}

/**
 * Parses conditional logic for a list of `fields` and their `input` data.
 *
 * Returns an object where:
 *
 * - Keys are field paths (using dot notation for nested fields).
 * - Values are the corresponding conditional logic objects to evaluate (if present).
 */
export function parseConditionalLogic(
  fields: Record<string, Pick<GenericField, 'conditionalLogic' | 'model' | 'options'>>,
  input: Record<string, any>,
): Record<string, ConditionalLogic | undefined> {
  const parsedConditionalLogic: Record<string, ConditionalLogic | undefined> = {}

  for (const [fieldName, field] of Object.entries(fields)) {
    const item = input[fieldName]
    parsedConditionalLogic[fieldName] = field.conditionalLogic

    if (field.model.subfields) {
      if (isObject(item)) {
        for (const [sfp, sfpcl] of Object.entries(parseConditionalLogic(field.model.subfields, item))) {
          parsedConditionalLogic[`${fieldName}.${sfp}`] = sfpcl
        }
      } else if (isArray(item)) {
        for (const [index, arrayItem] of item.entries()) {
          if (isObject(arrayItem)) {
            for (const [sfp, sfpcl] of Object.entries(parseConditionalLogic(field.model.subfields, arrayItem))) {
              parsedConditionalLogic[`${fieldName}.${index}.${sfp}`] = sfpcl
            }
          }
        }
      }
    } else if (field.model.structure) {
      if (isArray(item)) {
        for (const [index, arrayItem] of item.entries()) {
          if (isObject(arrayItem)) {
            const subfields = isString(arrayItem.$key) ? field.model.structure[arrayItem.$key] : undefined
            if (subfields) {
              for (const [sfp, sfpcl] of Object.entries(parseConditionalLogic(subfields, arrayItem))) {
                parsedConditionalLogic[`${fieldName}.${index}.${sfp}`] = sfpcl
              }
            }
          }
        }
      }
    }
  }

  return parsedConditionalLogic
}

/**
 * Extracts input filters from the specified collection `fields` and their models based on a `filterType`.
 *
 * @returns an array of input filters, sorted by their execution `order`.
 */
export function extractInputFilters<
  TFilterType extends 'beforeInputSanitization' | 'beforeInputValidation' | 'beforeQueryExecution',
>(
  fields: Record<string, GenericField>,
  filterType: TFilterType,
): (Required<
  OrderedInputFilter<TFilterType extends 'beforeInputSanitization' ? GenericInputFilter : GenericSanitizedInputFilter>
> & {
  fieldName: string
  field: GenericField
})[] {
  const filters: (Required<OrderedInputFilter<GenericInputFilter | GenericSanitizedInputFilter>> & {
    fieldName: string
    field: GenericField
  })[] = []

  for (const [fieldName, field] of Object.entries(fields)) {
    if (field.model.inputFilters[filterType]) {
      if (isFunction(field.model.inputFilters[filterType])) {
        filters.push({
          order: 10,
          callback: field.model.inputFilters[filterType],
          fieldName,
          field,
        })
      } else {
        filters.push({
          order: field.model.inputFilters[filterType].order ?? 10,
          callback: field.model.inputFilters[filterType].callback,
          fieldName,
          field,
        })
      }
    }

    if (field.inputFilters[filterType]) {
      if (isFunction(field.inputFilters[filterType])) {
        filters.push({
          order: 10,
          callback: field.inputFilters[filterType],
          fieldName,
          field,
        })
      } else {
        filters.push({
          order: field.inputFilters[filterType].order ?? 10,
          callback: field.inputFilters[filterType].callback,
          fieldName,
          field,
        })
      }
    }
  }

  return filters.sort((a, b) => a.order - b.order) as any
}
