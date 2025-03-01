import {
  booleanFieldModel,
  Collection,
  createdAtField,
  Field,
  numberFieldModel,
  objectFieldModel,
  textFieldModel,
  type DatabaseOperation,
  type QueryBuilderResult,
} from '@pruvious/orm'
import { anonymizeObject, isArray, isBoolean, isNumber, isObject, isString, PathMatcher } from '@pruvious/utils'
import type { H3Event } from 'h3'
import type { PruviousModuleOptions, ResolvedDebugConfig } from '../PruviousModuleOptions'
import { privateCollectionMeta } from '../collections/meta'

type QueuedJobStatus = 'pending' | 'success' | 'error'

let matcher: PathMatcher

export const logsCollections = {
  Requests: new Collection({
    fields: {
      requestDebugId: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      method: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      path: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      headers: new Field({
        model: objectFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      queryString: new Field({
        model: textFieldModel(),
        nullable: false,
        options: { allowEmptyString: true },
      }),
      body: new Field({
        model: textFieldModel(),
        options: {},
      }),
      user: new Field({
        model: numberFieldModel(),
        default: null,
        options: { min: 1 },
      }),
      createdAt: createdAtField(),
    },
    indexes: [{ fields: ['requestDebugId'] }, { fields: ['method'] }, { fields: ['path'] }, { fields: ['createdAt'] }],
    meta: privateCollectionMeta,
  }),
  Responses: new Collection({
    fields: {
      requestDebugId: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      method: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      path: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      queryString: new Field({
        model: textFieldModel(),
        nullable: false,
        options: { allowEmptyString: true },
      }),
      statusCode: new Field({
        model: numberFieldModel(),
        required: true,
        nullable: false,
        options: { min: 100, max: 599 },
      }),
      statusMessage: new Field({
        model: textFieldModel(),
        nullable: false,
        options: {},
      }),
      headers: new Field({
        model: objectFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      body: new Field({
        model: textFieldModel(),
        nullable: false,
        options: {},
      }),
      errorMessage: new Field({
        model: textFieldModel(),
        nullable: false,
        options: {},
      }),
      user: new Field({
        model: numberFieldModel(),
        default: null,
        options: { min: 1 },
      }),
      createdAt: createdAtField(),
    },
    indexes: [
      { fields: ['requestDebugId'] },
      { fields: ['method'] },
      { fields: ['path'] },
      { fields: ['statusCode'] },
      { fields: ['createdAt'] },
    ],
    meta: privateCollectionMeta,
  }),
  Queries: new Collection({
    fields: {
      queryDebugId: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      requestDebugId: new Field({
        model: textFieldModel(),
        options: {},
      }),
      method: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      path: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      queryString: new Field({
        model: textFieldModel(),
        nullable: false,
        options: { allowEmptyString: true },
      }),
      sql: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      params: new Field({
        model: objectFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      executionTime: new Field({
        model: numberFieldModel(),
        required: true,
        nullable: false,
        options: { min: 0, decimalPlaces: 2 },
        inputFilters: { beforeInputValidation: (value) => (isNumber(value) ? Math.round(value * 100) / 100 : value) },
      }),
      rawResult: new Field({
        model: textFieldModel(),
        options: {},
      }),
      result: new Field({
        model: objectFieldModel<QueryBuilderResult<any, Record<string, string> | Record<string, string>[]>>(),
        required: true,
        nullable: false,
        options: {},
        inputFilters: {
          beforeInputValidation: (value) => (isObject(value) ? JSON.parse(JSON.stringify(value)) : value),
        },
      }),
      operation: new Field({
        model: textFieldModel<DatabaseOperation, DatabaseOperation, DatabaseOperation>(),
        required: true,
        nullable: false,
        options: {},
        validators: [
          async (value) => {
            if (!['insert', 'select', 'update', 'delete'].includes(value)) {
              throw new Error('Operation must be one of: `insert`, `select`, `update`, `delete`')
            }
          },
        ],
      }),
      success: new Field({
        model: booleanFieldModel(),
        nullable: false,
        options: {},
      }),
      user: new Field({
        model: numberFieldModel(),
        default: null,
        options: { min: 1 },
      }),
      createdAt: createdAtField(),
    },
    indexes: [
      { fields: ['queryDebugId'] },
      { fields: ['requestDebugId'] },
      { fields: ['executionTime'] },
      { fields: ['operation'] },
      { fields: ['success'] },
      { fields: ['createdAt'] },
    ],
    meta: privateCollectionMeta,
  }),
  Queue: new Collection({
    fields: {
      jobDebugId: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      requestDebugId: new Field({
        model: textFieldModel(),
        options: {},
      }),
      method: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      path: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      queryString: new Field({
        model: textFieldModel(),
        nullable: false,
        options: { allowEmptyString: true },
      }),
      name: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      payload: new Field({
        model: objectFieldModel(),
        default: null,
        options: {},
      }),
      priority: new Field({
        model: numberFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      key: new Field({
        model: textFieldModel(),
        default: null,
        options: {},
      }),
      attempt: new Field({
        model: numberFieldModel(),
        default: 1,
        nullable: false,
        options: {},
      }),
      scheduledAt: new Field({
        model: numberFieldModel(),
        default: null,
        options: {},
      }),
      completedAt: new Field({
        model: numberFieldModel(),
        default: null,
        options: {},
      }),
      status: new Field({
        model: textFieldModel<QueuedJobStatus, QueuedJobStatus, QueuedJobStatus>(),
        nullable: false,
        default: 'pending',
        options: {},
        validators: [
          async (value) => {
            if (!['pending', 'success', 'error'].includes(value)) {
              throw new Error('Status must be one of: `pending`, `success`, `error`')
            }
          },
        ],
      }),
      result: new Field({
        model: textFieldModel(),
        default: null,
        options: {},
      }),
      user: new Field({
        model: numberFieldModel(),
        default: null,
        options: { min: 1 },
      }),
      createdAt: createdAtField(),
    },
    indexes: [
      { fields: ['jobDebugId'] },
      { fields: ['requestDebugId'] },
      { fields: ['name'] },
      { fields: ['priority'] },
      { fields: ['scheduledAt'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
    meta: privateCollectionMeta,
  }),
  Custom: new Collection({
    fields: {
      requestDebugId: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      method: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      path: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      queryString: new Field({
        model: textFieldModel(),
        nullable: false,
        options: { allowEmptyString: true },
      }),
      type: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      severity: new Field({
        model: numberFieldModel(),
        required: true,
        nullable: false,
        options: { min: 0 },
      }),
      message: new Field({
        model: textFieldModel(),
        required: true,
        nullable: false,
        options: {},
      }),
      payload: new Field({
        model: objectFieldModel(),
        options: {},
      }),
      user: new Field({
        model: numberFieldModel(),
        default: null,
        options: { min: 1 },
      }),
      createdAt: createdAtField(),
    },
    indexes: [
      { fields: ['requestDebugId'] },
      { fields: ['method'] },
      { fields: ['path'] },
      { fields: ['type'] },
      { fields: ['severity'] },
      { fields: ['message'] },
      { fields: ['createdAt'] },
    ],
    meta: privateCollectionMeta,
  }),
}

/**
 * Resolves the `debug.logs` option from the `PruviousModuleOptions` to a `ResolvedDebugConfig['logs']` object.
 */
export function resolveDebugLogsConfig(logs: PruviousModuleOptions['debug']['logs']): ResolvedDebugConfig['logs'] {
  const config: ResolvedDebugConfig['logs'] = {
    enabled: false,
    driver: 'sqlite://logs.sqlite',
    api: {
      enabled: false,
      include: ['/api/**'],
      exclude: ['/api/_*', '/api/_*/**', '/api/logs/**'],
      exposeRequestData: false,
      exposeResponseData: false,
    },
    queries: {
      enabled: false,
      include: ['**'],
      exclude: ['/api/logs/**'],
    },
    queue: false,
    custom: false,
  }

  if (isBoolean(logs)) {
    config.enabled = !!logs
    config.api.enabled = config.enabled
    config.queries.enabled = config.enabled
    config.queue = config.enabled
    config.custom = config.enabled
  } else if (isObject(logs)) {
    config.enabled = true
    config.driver = logs.driver ?? config.driver
    config.api.enabled = logs.api !== false
    config.queries.enabled = logs.queries !== false
    config.queue = logs.queue !== false
    config.custom = logs.custom !== false

    if (isObject(logs.api)) {
      config.api.include = logs.api.include ?? config.api.include
      config.api.exclude = logs.api.exclude ?? config.api.exclude
      config.api.exposeRequestData = !!logs.api.exposeRequestData
      config.api.exposeResponseData = !!logs.api.exposeResponseData
    }

    if (isObject(logs.queries)) {
      config.queries.include = logs.queries.include ?? config.queries.include
      config.queries.exclude = logs.queries.exclude ?? config.queries.exclude
    }
  }

  return config
}

/**
 * Logs a HTTP request to the database.
 */
export async function logRequest() {
  const runtimeConfig = useRuntimeConfig()
  const { enabled, api } = runtimeConfig.pruvious.debug.logs

  if (enabled) {
    const event = useEvent()
    const path = event.path.split('?')[0]!

    if (matchRoute(path)) {
      const { getLogsDatabase } = await import('#pruvious/server')
      const db = getLogsDatabase()

      if (db?.isConnected()) {
        await db
          .queryBuilder()
          .insertInto('Requests')
          .values({
            requestDebugId: event.context.pruvious.requestDebugId,
            method: event.method,
            path,
            headers: Object.fromEntries(
              [...event.headers.entries()].map(([key, value]) => {
                if (!api.exposeRequestData) {
                  const keyLower = key.toLowerCase()

                  if (keyLower === 'authorization') {
                    if (value.startsWith('Bearer ')) {
                      value = 'Bearer ***'
                    } else {
                      value = '***'
                    }
                  }

                  if (keyLower === 'cookie') {
                    value = value.split(';').map(anonymizeCookie).join(';')
                  }
                }

                return [key, value]
              }),
            ),
            queryString: event.path.split('?')[1],
            body: ['patch', 'post', 'put'].includes(event.method.toLowerCase())
              ? JSON.stringify({
                  input: api.exposeRequestData
                    ? event.context.pruvious.input
                    : anonymizeObject(event.context.pruvious.input),
                  files: Object.fromEntries(
                    Object.entries(event.context.pruvious.files).map(([key, value]) => {
                      return [key, value.byteLength]
                    }),
                  ),
                })
              : null,
            user: event.context.pruvious.auth.user?.id,
          })
          .run()
      }
    }
  }
}

/**
 * Logs the server response to the database.
 */
export function logResponseHandler(event?: H3Event, response?: { body?: any; errorMessage?: string }) {
  const runtimeConfig = useRuntimeConfig()
  const { enabled, api } = runtimeConfig.pruvious.debug.logs

  if (enabled && event && event.context.pruvious?.requestDebugId) {
    const path = event.path.split('?')[0]!

    if (matchRoute(path)) {
      event.waitUntil(
        new Promise<void>(async (resolve) => {
          const { getLogsDatabase } = await import('#pruvious/server')
          const db = getLogsDatabase()

          if (db?.isConnected()) {
            await db
              .queryBuilder()
              .insertInto('Responses')
              .values({
                requestDebugId: event.context.pruvious.requestDebugId,
                method: event.method,
                path,
                queryString: event.path.split('?')[1],
                headers: Object.fromEntries(
                  Object.entries(event.node.res.getHeaders()).map(([key, value]) => {
                    if (!api.exposeResponseData) {
                      const keyLower = key.toLowerCase()

                      if (keyLower === 'set-cookie') {
                        value = anonymizeCookie(
                          isArray(value)
                            ? value.map(anonymizeCookie).join('; ')
                            : isString(value)
                              ? anonymizeCookie(value)
                              : '***',
                        )
                      }
                    }

                    return [key, value]
                  }),
                ),
                statusCode: event.node.res.statusCode,
                statusMessage: event.node.res.statusMessage,
                body: isObject(response?.body)
                  ? JSON.stringify(api.exposeResponseData ? response.body : anonymizeObject(response.body))
                  : isString(response?.body)
                    ? api.exposeResponseData
                      ? response.body
                      : response.body
                        ? 'string'
                        : ''
                    : undefined,
                errorMessage: response?.errorMessage,
                user: event.context.pruvious.auth.user?.id,
              })
              .run()
          }

          resolve()
        }),
      )
    }
  }
}

/**
 * Evaluates if a given `path` matches the glob patterns defined in `debug.logs.api.include` and `debug.logs.api.exclude`.
 * Uses caching to store previously matched results for better performance.
 */
function matchRoute(path: string) {
  const runtimeConfig = useRuntimeConfig()
  const { api } = runtimeConfig.pruvious.debug.logs

  if (!matcher) {
    matcher = new PathMatcher({
      include: api.include,
      exclude: api.exclude,
    })
  }

  return matcher.test(path)
}

/**
 * Anonymizes a single cookie string by replacing its value with `***`.
 */
function anonymizeCookie(cookie: string) {
  const [main, ...rest] = cookie.split(';')
  const [name] = main!.split('=')

  return [name + '=***', ...rest].join(';')
}
