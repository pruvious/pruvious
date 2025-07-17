import {
  deepCompare,
  isArray,
  isDefined,
  isNull,
  isObject,
  isPrimitive,
  isString,
  isUndefined,
  pick,
} from '@pruvious/utils'
import type { GenericCollection, GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

/**
 * Creates a validator to ensure that the field (or subfield) value is unique within a collection (or subfields array).
 *
 * - Works with a single (sub)field, where this validator is applied, or multiple `fields`, which are passed as an array of (sub)field names.
 * - String comparison is done using the `=` operator for exact matches or `ilike` for case-insensitive matches (see `caseSensitive` option).
 * - Throws an error if the validation fails.
 * - The default error message is: 'The value must be unique'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function uniqueValidator<
  TDatabase extends GenericDatabase = GenericDatabase,
  TCollection extends GenericCollection = GenericCollection,
  TField extends string = TCollection['TColumnNames'],
>(options?: UniqueValidatorOptions<TField, TDatabase>): GenericValidator {
  return async (_, { context, path, isSubfield }) => {
    if (
      isUndefined(context.collectionName) ||
      ((!options?.fields || options.fields.length === 1) && isNull(context.getSanitizedInputValue(path)))
    ) {
      return
    }

    const customErrorMessage = options?.errorMessage
    const defaultErrorMessage = context.__('pruvious-orm', 'The value must be unique')
    const resolvedErrorMessage = resolveCustomErrorMessage(
      customErrorMessage,
      defaultErrorMessage,
      pick(context, ['_', '__']),
    )
    const caseSensitive = options?.caseSensitive ?? true
    const fields = options?.fields ?? [path]

    if (isSubfield || context.operation === 'insert') {
      for (const field of fields) {
        if (isUndefined(context.getSanitizedInputValue(field))) {
          throw new Error(
            context.__('pruvious-orm', 'This field requires `$field` to be present in the input data', { field }),
          )
        }
      }
    }

    if (isSubfield) {
      const subfieldPathParts = path.split('.')
      const subfieldName = subfieldPathParts.pop()!
      const parentObject = context.getSanitizedInputValue(subfieldPathParts.join('.'))
      const parentArray = context.getSanitizedInputValue(subfieldPathParts.slice(0, -1).join('.')) as Record<
        string,
        any
      >[]
      const uniqueSubfieldNames = options?.fields ?? [subfieldName]

      if (isObject(parentObject) && isArray(parentArray)) {
        for (const item of parentArray) {
          if (
            item !== parentObject &&
            uniqueSubfieldNames.every((field) => {
              if (!caseSensitive && isString(item[field]) && isString(parentObject[field])) {
                return item[field].toLowerCase() === parentObject[field].toLowerCase()
              } else if (isPrimitive(item[field])) {
                return item[field] === parentObject[field]
              } else {
                return JSON.stringify(item[field]) === JSON.stringify(parentObject[field])
              }
            })
          ) {
            throw new Error(resolvedErrorMessage)
          }
        }
      }
    } else if (context.operation === 'insert') {
      for (const [i, item] of context.sanitizedInput.entries()) {
        if (i !== context.inputIndex) {
          if (fields.every((field) => deepCompare((item as any)[field], context.getSanitizedInputValue(field)))) {
            throw new Error(resolvedErrorMessage)
          }
        }
      }

      const qb = context.database.queryBuilder().selectFrom(context.collectionName as never)

      for (const field of fields) {
        const value = context.getSanitizedInputValue(field)
        const operator = caseSensitive ? '=' : 'ilike'
        qb.where(field as any, operator, isPrimitive(value) ? (value as any) : JSON.stringify(value))
      }

      const count = await qb.useCache(context.cache).count()

      if (!count.success) {
        if (count.runtimeError) {
          throw new Error(count.runtimeError)
        } else {
          throw new Error(context.__('pruvious-orm', 'Unique validation failed'))
        }
      }

      if (count.data !== 0) {
        throw new Error(resolvedErrorMessage)
      }
    } else if (context.operation === 'update') {
      const qr1 = await context.database
        .queryBuilder()
        .selectFrom(context.collectionName as never)
        .select('id')
        .setWhereCondition(context.whereCondition)
        .limit(2)
        .useCache(context.cache)
        .all()

      if (!qr1.success) {
        if (qr1.runtimeError) {
          throw new Error(qr1.runtimeError)
        } else {
          throw new Error(context.__('pruvious-orm', 'Unique validation failed'))
        }
      }

      if (qr1.data.length === 2) {
        throw new Error(resolvedErrorMessage)
      } else if (qr1.data.length === 1) {
        const qb2 = context.database
          .queryBuilder()
          .selectFrom(context.collectionName as never)
          .select('id')
          .limit(2)
          .useCache(context.cache)

        for (const field of fields) {
          const value = context.getSanitizedInputValue(field)

          if (isDefined(value)) {
            const operator = caseSensitive ? '=' : 'ilike'
            qb2.where(field as any, operator, isPrimitive(value) ? (value as any) : JSON.stringify(value))
          }
        }

        const qr2 = await qb2.all()

        if (!qr2.success) {
          if (qr2.runtimeError) {
            throw new Error(qr2.runtimeError)
          } else {
            throw new Error(context.__('pruvious-orm', 'Unique validation failed'))
          }
        }

        if (qr2.data.length === 2 || (qr2.data.length === 1 && qr2.data[0].id !== qr1.data[0].id)) {
          throw new Error(resolvedErrorMessage)
        }
      }
    }
  }
}

export interface UniqueValidatorOptions<
  TField extends string = string,
  TDatabase extends GenericDatabase = GenericDatabase,
> {
  /**
   * Optional array of field names to check for uniqueness.
   * If not provided, the validator will check the field where this validator is applied.
   *
   * @default undefined
   */
  fields?: TField[]

  /**
   * The error message to be thrown if the validation fails.
   * Can be a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * @default
   * __('pruvious-orm', 'The value must be unique')
   */
  errorMessage?: CustomErrorMessage<TDatabase>

  /**
   * Controls whether the uniqueness check for strings is case-sensitive.
   *
   * - When `true` (default), `abc` and `ABC` are considered different values.
   * - When `false`, `abc` and `ABC` are considered the same value.
   *
   * Warning: Only use this option with string fields.
   *
   * @default true
   */
  caseSensitive?: boolean
}
