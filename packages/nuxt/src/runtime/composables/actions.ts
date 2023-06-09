import { Pruvious, useRuntimeConfig } from '#imports'

interface Options {
  /**
   * HTTP headers to be sent in the request.
   *
   * Defaults to `undefined`.
   */
  headers?: Record<string, string>
}

type ActionResponse<OkResponse = any, ErrorResponse = any> =
  | {
      /**
       * Whether the request was successful.
       */
      ok: true

      /**
       * The response data.
       */
      data: OkResponse
    }
  | {
      /**
       * Whether the request was successful.
       */
      ok: false

      /**
       * The error response.
       */
      data: ErrorResponse

      /**
       * The HTTP response status code.
       */
      statusCode: number

      /**
       * The HTTP response status message.
       */
      statusMessage: string
    }

/**
 * Use the `GET` method to request an action from the Previous API by its `name`.
 * By default, the response is not cached on either the client or server.
 *
 * @example
 * ```js
 * await getAction('actionName')
 * ```
 */
export async function getAction<OkResponse = any, ErrorResponse = any>(
  name: Pruvious.Action,
  params: Record<string, any>,
  options: Options = {},
): Promise<ActionResponse<OkResponse, ErrorResponse>> {
  return request<OkResponse, ErrorResponse>(name, 'GET', { ...options, params })
}

/**
 * Use the `PATCH` method to request an action from the Previous API by its `name`.
 * By default, the response is not cached on either the client or server.
 *
 * @example
 * ```js
 * await patchAction('actionName')
 * ```
 */
export async function patchAction<OkResponse = any, ErrorResponse = any>(
  name: Pruvious.Action,
  body: Record<string, any> | FormData,
  options: Options = {},
): Promise<ActionResponse<OkResponse, ErrorResponse>> {
  return request<OkResponse, ErrorResponse>(name, 'PATCH', { ...options, body })
}

/**
 * Use the `POST` method to request an action from the Previous API by its `name`.
 * By default, the response is not cached on either the client or server.
 *
 * @example
 * ```js
 * await postAction('actionName')
 * ```
 */
export async function postAction<OkResponse = any, ErrorResponse = any>(
  name: Pruvious.Action,
  body: Record<string, any> | FormData,
  options: Options = {},
): Promise<ActionResponse<OkResponse, ErrorResponse>> {
  return request<OkResponse, ErrorResponse>(name, 'POST', { ...options, body })
}

/**
 * Use the `PUT` method to request an action from the Previous API by its `name`.
 * By default, the response is not cached on either the client or server.
 *
 * @example
 * ```js
 * await putAction('actionName')
 * ```
 */
export async function putAction<OkResponse = any, ErrorResponse = any>(
  name: Pruvious.Action,
  body: Record<string, any> | FormData,
  options: Options = {},
): Promise<ActionResponse<OkResponse, ErrorResponse>> {
  return request<OkResponse, ErrorResponse>(name, 'PUT', { ...options, body })
}

/**
 * Use the `DELETE` method to request an action from the Previous API by its `name`.
 * By default, the response is not cached on either the client or server.
 *
 * @example
 * ```js
 * await deleteAction('actionName')
 * ```
 */
export async function deleteAction<OkResponse = any, ErrorResponse = any>(
  name: Pruvious.Action,
  params?: Record<string, any>,
  options: Options = {},
): Promise<ActionResponse<OkResponse, ErrorResponse>> {
  return request<OkResponse, ErrorResponse>(name, 'DELETE', { ...options, params })
}

function request<OkResponse = any, ErrorResponse = any>(
  name: Pruvious.Action,
  method: any,
  options: Record<string, any>,
): Promise<ActionResponse<OkResponse, ErrorResponse>> {
  return new Promise((resolve) => {
    $fetch(`${useRuntimeConfig().public.pruvious.cmsBaseUrl}/api/actions/${name}`, {
      ...options,
      method,
    })
      .then((response: any) => {
        resolve({ ok: true, data: response })
      })
      .catch((response: any) => {
        resolve({
          ok: false,
          data: response.data,
          statusCode: response.status,
          statusMessage: response.statusMessage,
        })
      })
  })
}
