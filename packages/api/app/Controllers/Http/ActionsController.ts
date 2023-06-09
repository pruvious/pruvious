import { Request, Response } from '@adonisjs/core/build/standalone'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { actions } from 'App/imports'
import { Auth } from '../../UserQuery'

interface MultipartFileContract {
  isMultipartFile: true
  fieldName: string
  clientName: string
  size: number
  headers: {
    [key: string]: string
  }
  tmpPath?: string
  filePath?: string
  fileName?: string
  type?: string
  extname?: string
  subtype?: string
  state: 'idle' | 'streaming' | 'consumed' | 'moved'
  isValid: boolean
  hasErrors: boolean
  validated: boolean
  errors: {
    fieldName: string
    clientName: string
    message: string
    type: 'size' | 'extname' | 'fatal'
  }[]
  sizeLimit?: number | string
  allowedExtensions?: string[]
  meta: any
  /**
   * Get JSON representation of file
   */
  toJSON(): {
    fieldName: string
    clientName: string
    size: number
    filePath?: string
    type?: string
    extname?: string
    subtype?: string
    state: 'idle' | 'streaming' | 'consumed' | 'moved'
    isValid: boolean
    validated: boolean
    errors: {
      fieldName: string
      clientName: string
      message: string
      type: 'size' | 'extname' | 'fatal'
    }[]
    meta: any
  }
  validate: any
  markAsMoved: any
  move: any
  moveToDisk: any
}

/*
|--------------------------------------------------------------------------
| Action
|--------------------------------------------------------------------------
|
*/

export interface Action {
  /**
   * Name of the action that defines the URL to call this action. It must be a
   * lowercase slug (e.g. 'my-action'; the generated URL in this case would be
   * '/api/actions/my-action').
   */
  name: string

  /**
   * Callback function which is triggered when the action is called. It accepts
   * a single `context` parameter which is a request-specific object that holds
   * the information like the request body, cookies, headers, the currently
   * logged in user, and much more for a given HTTP request.
   *
   * @see https://docs.adonisjs.com/guides/context (only the `request` and
   * `response` objects from AdonisJS are inherited)
   */
  callback: (context: {
    /**
     * HTTP Request class exposes the interface to consistently read values
     * related to a given HTTP request. The class is wrapper over
     * [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
     * and has extended API.
     *
     * You can access the original [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
     * using `request.request` property.
     */
    request: Request & {
      file: (
        key: string,
        options?:
          | Partial<{
              size: string | number
              extnames: string[]
            }>
          | undefined,
      ) => MultipartFileContract | null
      files: (
        key: string,
        options?:
          | Partial<{
              size: string | number
              extnames: string[]
            }>
          | undefined,
      ) => MultipartFileContract[]
      allFiles: () => {
        [field: string]: MultipartFileContract | MultipartFileContract[]
      }
    }

    /**
     * The response is a wrapper over [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
     * streamlining the process of writing response body and automatically setting up appropriate headers.
     */
    response: Response

    /**
     * A helper object for user authentication. It contains the `userId` of the
     * current user (if logged in) and the methods `attemptLogin`, `createAccessToken`,
     * `logoutFromOtherDevices`, `refreshAccessToken`, and `revokeAccessToken`.
     */
    auth: Auth
  }) => Promise<any>
}

export default class ActionsController {
  /**
   * GET: /actions/:name
   */
  public async query({ auth, bouncer, params, request, response }: HttpContextContract) {
    if (!actions[params.name]) {
      return response.notFound({ message: 'E_ROW_NOT_FOUND: Row not found' })
    }

    return actions[params.name].callback({
      request: request as any,
      response: response as any,
      auth: new Auth(auth, bouncer),
    })
  }
}
