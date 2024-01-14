import type { CollectionFieldName, CollectionName } from '#pruvious'
import { collections } from '#pruvious/server'
import { H3Event, readBody as _readBody, getHeader, readFormData } from 'h3'
import { getModuleOption } from '../instances/state'
import { isArray, toArray, uniqueArray } from '../utils/array'
import { isObject } from '../utils/object'
import { __ } from '../utils/server/translate-string'

interface Options {
  /**
   * Custom error messages.
   */
  customErrorMessages?: {
    /**
     * A custom error message displayed when the request body contains a nonexistent field.
     *
     * @default "The field '$field' does not exist"
     */
    nonExistentField?: string

    /**
     * A custom error message displayed when the request body format is not a regular object.
     *
     * @default 'The request body must be an object with key-value pairs'
     */
    notObject?: string

    /**
     * A custom error message displayed when the request body format is not a regular object nor an array.
     *
     * @default 'The request body must be either an object with key-value pairs or an array containing key-value objects'
     */
    notObjectOrArray?: string
  }

  /**
   * Specifies the current request `operation` that defines the parsing logic for the request body.
   *
   * If the `operation` parameter is not provided, it will be resolved based on the current HTTP method:
   * - `POST` - Create operation
   * - `PATCH` - Update operation
   */
  operation?: 'create' | 'update'

  /**
   * Represents the current request body.
   *
   * If not specified, the `body` will be automatically resolved from the current `event`.
   */
  body?: Record<string, any> | Record<string, any>[]
}

/**
 * Parse the request body and retrieve an object with resolved (but not validated) input `data` for a specified `collection`.
 * Additionally, the returned object contains a list of `errors` found while resolving the input, such as when nonexistent
 * fields are provided.
 *
 * The function automatically extracts the current request body from the `event` argument.
 * You can modify this behavior by customizing the `options` argument.
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const { data, errors } = await readInputData(event, 'products')
 *
 *   // Example: POST http://localhost:3000/api/collections/products
 *   console.log(data)
 *   // Output: { name: 'Product name', price: 10 }
 * })
 * ```
 */
export async function readInputData<T extends CollectionName>(
  event: H3Event,
  collection: T,
  options?: Options,
): Promise<{
  /**
   * Key-value pairs or an array of key-value pairs where keys represent existing field names in the associated collection,
   * and values represent corresponding input field values.
   *
   * @example
   * ```typescript
   * export default defineEventHandler(async (event) => {
   *   const { data } = await readInputData(event, 'products')
   *   return query('products').create(data)
   * })
   * ```
   */
  data: T extends 'uploads'
    ?
        | Partial<Record<CollectionFieldName[T], any> & { $file: File }>
        | Partial<Record<CollectionFieldName[T], any> & { $file: File }>[]
    : Partial<Record<CollectionFieldName[T], any>> | Partial<Record<CollectionFieldName[T], any>>[]

  /**
   * Array of error messages generated during input data reading.
   *
   * @example
   * ```typescript
   * export default defineEventHandler(async (event) => {
   *   const { errors } = await readInputData(event, 'products')
   *
   *   if (errors.length) {
   *     setResponseStatus(event, 400)
   *     return errors.join('\n')
   *   }
   * })
   * ```
   */
  errors: string[]
}> {
  let operation = options?.operation

  if (!operation) {
    switch (event.method) {
      case 'POST':
        operation = 'create'
        break
      case 'PATCH':
        operation = 'update'
        break
      default:
        throw new Error(__(event, 'pruvious-server', 'Unable to determine the request operation'))
    }
  }

  const body = options?.body ?? (await pruviousReadBody(event))
  const data = isArray(body) ? [...body] : isObject(body) ? { ...body } : body
  const errors: string[] = []

  if (operation === 'create') {
    if ((isArray(data) && data.every(isObject)) || isObject(data)) {
      for (const entry of toArray(data)) {
        for (const fieldName of Object.keys(entry)) {
          if (
            !collections[collection].fields[fieldName] &&
            (fieldName !== '$file' || !getModuleOption('uploads') || collection !== 'uploads')
          ) {
            delete entry[fieldName]
            errors.push(
              __(
                event,
                'pruvious-server',
                options?.customErrorMessages?.nonExistentField ?? ("The field '$field' does not exist" as any),
                { field: fieldName },
              ),
            )
          }
        }
      }
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          options?.customErrorMessages?.notObjectOrArray ??
            ('The request body must be either an object with key-value pairs or an array containing key-value objects' as any),
        ),
      )
    }
  } else if (operation === 'update') {
    if (isObject(data)) {
      for (const fieldName of Object.keys(data)) {
        if (!collections[collection].fields[fieldName]) {
          delete (data as any)[fieldName]
          errors.push(
            __(
              event,
              'pruvious-server',
              options?.customErrorMessages?.nonExistentField ?? ("The field '$field' does not exist" as any),
              { field: fieldName },
            ),
          )
        }
      }
    } else {
      errors.push(
        __(
          event,
          'pruvious-server',
          options?.customErrorMessages?.notObject ?? ('The request body must be an object with key-value pairs' as any),
        ),
      )
    }
  }

  return { data: data as any, errors: uniqueArray(errors) }
}

/**
 * Read the request body from a given `event`.
 */
export async function pruviousReadBody(event: H3Event): Promise<Record<string, any> | Record<string, any>[]> {
  const contentType = getHeader(event, 'Content-Type') || ''

  if (
    contentType === 'application/json' ||
    contentType.startsWith('application/x-www-form-urlencoded') ||
    contentType.startsWith('text/')
  ) {
    const body = await _readBody(event)
    return isObject(body) || isArray(body) ? body : {}
  }

  try {
    const formData = await readFormData(event)
    const body: Record<string, any> = {}

    formData.forEach((value, key) => {
      if (!Reflect.has(body, key)) {
        body[key] = value
        return
      }

      if (!Array.isArray(body[key])) {
        body[key] = [body[key]]
      }

      body[key].push(value)
    })

    return body
  } catch {}

  return {}
}
