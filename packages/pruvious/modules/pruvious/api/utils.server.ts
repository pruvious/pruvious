import { __, type Permission } from '#pruvious/server'
import type { QueryBuilderResult, ValidationResult } from '@pruvious/orm'
import { isArray, isFunction, isObject, isString } from '@pruvious/utils'
import type { H3Event } from 'h3'
import { isDevelopment } from 'std-env'

export type InputValidator =
  | ((value: any) => boolean | Promise<boolean>)
  | {
      /**
       * The validation function.
       * It should return `true` if the value is valid.
       * If the function returns `false` or throws an error, the value is considered invalid.
       */
      test: (value: any) => boolean | Promise<boolean>

      /**
       * A custom error message.
       */
      message: string
    }

export const httpStatusCodeMessages = {
  // 1xx Informational
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',

  // 2xx Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',

  // 3xx Redirection
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',

  // 4xx Client Errors
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',

  // 5xx Server Errors
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  509: 'Bandwidth Limit Exceeded',
  510: 'Not Extended',
  511: 'Network Authentication Required',
} as const

export const crudToDatabaseOperation = {
  create: 'insert',
  read: 'select',
  update: 'update',
  delete: 'delete',
} as const

export const databaseOperationToCrud = {
  insert: 'create',
  select: 'read',
  update: 'update',
  delete: 'delete',
} as const

/**
 * Creates a new error object with customizable HTTP status code and message.
 *
 * When a status code already exists in the `event` (between 400-599), it will be kept unless `options.force` is `true`.
 * You can also pass `null` as the `event` parameter to achieve the same result.
 *
 * The status message is automatically set based on the status code.
 *
 * @example
 * ```ts
 * import { pruviousError } from '#pruvious/server'
 *
 * export default defineEventHandler((event) => {
 *   throw pruviousError(event, {
 *     statusCode: 404,
 *   })
 *
 *   // Code execution stops here
 * })
 * ```
 */
export function pruviousError(
  event: H3Event | null,
  options: {
    /**
     * The HTTP status code to set.
     *
     * @default 400
     */
    statusCode?: keyof typeof httpStatusCodeMessages

    /**
     * A custom error message.
     * By default, the status message is used.
     */
    message?: string

    /**
     * Force the `statusCode` to be set, even if the current status is an error code.
     *
     * @default false
     */
    force?: boolean

    /**
     * Additional data to include in the error response (e.g. validation errors).
     *
     * @default undefined
     */
    data?: Record<string, any> | undefined
  },
) {
  const currentStatus = event ? getResponseStatus(event) : 200
  const isErrorStatus = currentStatus >= 400 && currentStatus < 600
  const statusCode = (
    options.force || !isErrorStatus ? (options.statusCode ?? 400) : currentStatus
  ) as keyof typeof httpStatusCodeMessages

  return createError({
    statusCode,
    statusMessage: httpStatusCodeMessages[statusCode],
    message: options.message ?? httpStatusCodeMessages[statusCode],
    data: options.data,
  })
}

/**
 * Reads and parses the request body from an H3 `event` object.
 *
 * Automatically handles multiple content types:
 *
 * - JSON data - via `readBody()`
 * - Multipart form data - via `readMultipartFormData()`
 * - URL-encoded forms - via `readFormData()`
 * - Raw body content - via `readRawBody()`
 *
 * The parsing method is determined by the request's `Content-Type` header.
 *
 * The function returns an object with two properties:
 *
 * - `input` - The parsed request body content.
 *   - It's either a single key-value object or an array of key-value objects.
 *   - If the request body is empty or malformed, it resolves to an empty object or array.
 *   - The parsed object or array is stored in `event.context.pruvious.input` for later use.
 * - `files` - A key-value object containing file uploads.
 *   - The object keys are the file paths, and the values are the file contents as `Buffer` objects.
 *   - The file paths are formatted as `name/filename` for nested files, and `filename` for top-level files.
 *   - If no files were uploaded, the object is empty.
 *   - The parsed files are stored in `event.context.pruvious.files` for later use.
 *
 * Use the `inputType` parameter to specify the expected input format:
 *
 * - `object` - Forces return of a a single key-value object.
 *   - Returns an empty `input` object if body is an array or invalid.
 * - `array` - Forces return of an array of key-value objects.
 *   - Returns an empty `input` array if body is an object or invalid.
 * - `mixed` - Returns either an object or array based on input (default).
 *   - Returns an empty `input` object if body is invalid.
 *
 * @example
 * ```ts
 * // server/api/auth/login.post.ts
 * import { parseBody } from '#pruvious/server'
 * import { isObject } from '@pruvious/utils'
 *
 * export default defineEventHandler(async (event) => {
 *   const { email, password, remember } = await parseBody(event, 'object').then(({ input }) => input)
 *
 *   // ...
 * })
 * ```
 */
export async function parseBody<T extends 'object' | 'array' | 'mixed' = 'mixed'>(
  event: H3Event,
  inputType?: T,
): Promise<
  (T extends 'object'
    ? { input: Record<string, any> }
    : T extends 'array'
      ? { input: Record<string, any>[] }
      : { input: Record<string, any> | Record<string, any>[] }) & { files: Record<string, Buffer> }
> {
  if (!event.context.pruvious.input || !event.context.pruvious.files) {
    const contentType = getRequestHeader(event, 'Content-Type')?.toLowerCase() ?? ''

    let input: Record<string, any> | Record<string, any>[] = {}
    let files: Record<string, Buffer> = {}

    try {
      if (contentType.includes('application/json')) {
        const body = await readBody(event)

        if (isObject(body) || isArray(body)) {
          input = body
        }
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await readMultipartFormData(event)

        if (formData) {
          Object.assign(
            input,
            formData.reduce(
              (acc, item) => {
                if (item.filename) {
                  files[item.name ? `${item.name}/${item.filename}` : item.filename] = item.data
                } else if (item.name) {
                  acc[item.name] = item.data.toString()
                }

                return acc
              },
              {} as Record<string, any>,
            ),
          )
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await readFormData(event)

        formData.forEach((value, key) => {
          ;(input as Record<string, any>)[key] = value
        })
      } else {
        const rawBody = await readRawBody(event)

        if (isString(rawBody)) {
          const json = JSON.parse(rawBody)

          if (isObject(json) || isArray(json)) {
            input = json
          }
        }
      }
    } catch {}

    event.context.pruvious.input = input
    event.context.pruvious.files = files
  }

  let input = event.context.pruvious.input

  if ((inputType === 'object' && !isObject(input)) || (inputType === 'array' && !isArray(input))) {
    input = {}
  }

  return { input, files: event.context.pruvious.files } as any
}

/**
 * Validates the request body input using specified validation rules.
 *
 * Takes a `validators` object where:
 *
 * - Keys match the input names in the request body.
 * - Values are arrays of validators, where each validator can be either:
 *   - A function that accepts a input `value` and returns `true` if the value is valid.
 *     - If the function returns `false` or throws an error, the value is considered invalid.
 *     - The default error message is `'Invalid input'`.
 *   - An object with `test` and `message` properties, where:
 *     - `test` is the validation function.
 *     - `message` is a custom error returned if the value is invalid.
 *
 * Inputs are extracted from the `event` object's body using `parseBody()` with `type: 'object'`.
 *
 * @throws a `422` H3 error if any input is invalid, halting any subsequent code execution in the current event handler.
 *
 * @example
 * ```ts
 * // server/api/auth/login.post.ts
 * import { __, assertInput } from '#pruvious/server'
 * import { emailRegex } from '@pruvious/orm'
 *
 * export default defineEventHandler(async (event) => {
 *   await assertInput(event, {
 *     email: [
 *       { test: Boolean, message: __('pruvious-orm', 'This field is required') },
 *       { test: isString, message: __('pruvious-orm', 'The value must be a string') },
 *       { test: (value) => emailRegex.test(value), message: __('pruvious-orm', 'Invalid email address') },
 *     ],
 *     password: [
 *       { test: Boolean, message: __('pruvious-orm', 'This field is required') },
 *       { test: isString, message: __('pruvious-orm', 'The value must be a string') },
 *     ],
 *   })
 *
 *   // ...
 * })
 * ```
 */
export async function assertInput(event: H3Event, validators: Record<string, InputValidator[]>): Promise<void> {
  const { input } = await parseBody(event, 'object')
  return assertParams(input, validators)
}

/**
 * Validates an object of parameters against specified validation rules.
 *
 * Takes:
 *
 * - `params` - Key-value object containing parameter values to validate.
 * - `validators` - Key-value object mapping parameter names to validation function arrays.
 *
 * The `validators` object has the following structure:
 *
 * - Keys match the parameter names in the request body.
 * - Values are arrays of validators, where each validator can be either:
 *   - A function that accepts a parameter `value` and returns `true` if the value is valid.
 *     - If the function returns `false` or throws an error, the value is considered invalid.
 *     - The default error message is `'Invalid input'`.
 *   - An object with `test` and `message` properties, where:
 *     - `test` is the validation function.
 *     - `message` is a custom error returned if the value is invalid.
 *
 * @throws a `422` H3 error if any parameter is invalid, halting any subsequent code execution in the current event handler.
 *
 * @example
 * ```ts
 * // server/api/auth/login.post.ts
 * import { __, assertParams, parseBody } from '#pruvious/server'
 * import { emailRegex } from '@pruvious/orm'
 *
 * export default defineEventHandler(async (event) => {
 *   const params = await parseBody(event, 'object')
 *
 *   await assertParams(params, {
 *     email: [
 *       { test: Boolean, message: __('pruvious-orm', 'This field is required') },
 *       { test: isString, message: __('pruvious-orm', 'The value must be a string') },
 *       { test: (value) => emailRegex.test(value), message: __('pruvious-orm', 'Invalid email address') },
 *     ],
 *     password: [
 *       { test: Boolean, message: __('pruvious-orm', 'This field is required') },
 *       { test: isString, message: __('pruvious-orm', 'The value must be a string') },
 *     ],
 *   })
 *
 *   // ...
 * })
 * ```
 */
export async function assertParams(params: any, validators: Record<string, InputValidator[]>): Promise<void> {
  const errors: Record<string, string> = {}

  for (const [key, InputValidators] of Object.entries(validators)) {
    for (const validator of InputValidators) {
      try {
        if (isFunction(validator)) {
          if (!(await validator(params[key]))) {
            errors[key] = __('pruvious-orm', 'Invalid input')
            break
          }
        } else {
          if (!(await validator.test(params[key]))) {
            errors[key] = validator.message
            break
          }
        }
      } catch {
        errors[key] = __('pruvious-orm', 'Invalid input')
        break
      }
    }
  }

  if (Object.keys(errors).length) {
    throw pruviousError(null, {
      statusCode: 422,
      message: __('pruvious-orm', 'Invalid input'),
      data: errors,
    })
  }
}

/**
 * Validates a `queryBuilderResult` and throws appropriate errors if unsuccessful.
 *
 * - If the query was successful, the function does nothing.
 * - If the query failed due to input errors, a `422` H3 error is thrown with the input errors.
 * - If the query failed due to a runtime error, a `400` H3 error is thrown with the runtime error message.
 *   - Guarded query builders may return status codes `401` or `403` if the `authGuard` is enabled for the collection.
 *
 * @example
 * ```ts
 * import { guardedInsertInto, pruviousQueryError, parseBody } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const input = await parseBody(event)
 *   const query = await guardedInsertInto('MyCollection').values(input).run()
 *
 *   assertQuery(query)
 *   // Code continues only if query succeeded
 *
 *   return query.success // true
 * })
 * ```
 */
export function assertQuery<
  T extends
    | QueryBuilderResult<any, Record<string, string> | Record<string, string>[]>
    | ValidationResult<Record<string, string> | Record<string, string>[]>,
>(queryBuilderResult: T): asserts queryBuilderResult is T & { success: true } {
  if (!queryBuilderResult.success) {
    const event = useEvent()

    if (queryBuilderResult.inputErrors) {
      throw pruviousError(event, {
        statusCode: 422,
        message: __('pruvious-orm', 'Invalid input'),
        data: queryBuilderResult.inputErrors,
      })
    } else {
      throw pruviousError(event, {
        message: queryBuilderResult.runtimeError || __('pruvious-orm', 'An unknown error occurred'),
      })
    }
  }
}

/**
 * Validates if a user is authenticated.
 * Returns a `401` H3 error when authentication fails.
 *
 * @example
 * ```ts
 * import { assertUser } from '#pruvious/server'
 *
 * export default defineEventHandler((event) => {
 *   assertUser(event)
 *
 *   // Execution continues only when the user is authenticated
 * })
 * ```
 */
export function assertUser(
  event: H3Event,
): asserts event is H3Event & { context: { pruvious: { auth: { isLoggedIn: true } } } } {
  if (!event.context.pruvious.auth.isLoggedIn) {
    throw pruviousError(event, {
      statusCode: 401,
      message: isDevelopment ? 'You must be logged in to access this resource' : '',
    })
  }
}

/**
 * Validates user authentication and permission requirements.
 * Pass an empty `permissions` array to verify only user authentication (default).
 *
 * - Throws `401` H3 error if user is not authenticated.
 * - Throws `403` H3 error if user lacks required `permissions`.
 *
 * @example
 * ```ts
 * import { assertUserPermissions } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   assertUserPermissions(['access-dashboard'])
 *
 *   // Execution continues only when the user is authenticated and has 'access-dashboard' permission
 * })
 * ```
 */
export function assertUserPermissions(
  event: H3Event,
  permissions: Permission[] = [],
): asserts event is H3Event & { context: { pruvious: { auth: { isLoggedIn: true } } } } {
  assertUser(event)

  for (const permission of permissions) {
    if (!event.context.pruvious.auth.permissions.includes(permission)) {
      throw pruviousError(event, {
        statusCode: 403,
        message: isDevelopment ? `You must have the \`${permission}\` permission to perform this operation` : '',
      })
    }
  }
}

/**
 * Parses the `Range` header from the `event`.
 *
 * @example
 * ```ts
 * import { getHeader } from '#pruvious/server'
 *
 * export default defineEventHandler((event) => {
 *   const range = parseRangeHeader(event)
 *   console.log(range) // [0, undefined]
 * })
 * ```
 */
export function parseRangeHeader(event: H3Event): [number | undefined, number | undefined] | null {
  const range = getHeader(event, 'Range')
  const match = range?.match(/^bytes=(\d*)-(\d*)$/)

  if (!match) {
    return null
  }

  return [match[1] ? parseInt(match[1]) : undefined, match[2] ? parseInt(match[2]) : undefined]
}
