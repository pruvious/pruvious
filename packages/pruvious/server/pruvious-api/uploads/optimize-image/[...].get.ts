import {
  __,
  assertUserPermissions,
  createOptimizedImage,
  logError,
  parseImageTransformOptions,
  pruviousError,
  selectFrom,
  streamFile,
} from '#pruvious/server'
import type { StreamResult } from '@pruvious/storage'
import { deepCompare, omit, withoutTrailingSlash } from '@pruvious/utils'
import mime from 'mime'
import { extname } from 'pathe'
import { isWorkerd } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:read'])

  const path = '/' + getRouterParams(event)._
  const ext = extname(path)
  const urlSuffix = path.includes('_') ? '_' + path.split('_').slice(1).join('_') : ''
  const imageOptions = urlSuffix ? parseImageTransformOptions(urlSuffix) : null

  if (!imageOptions) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Missing image optimization parameters'),
    })
  }

  const runtimeConfig = useRuntimeConfig()
  const uploadPath = path.slice(0, -urlSuffix.length) + imageOptions.originalExtension
  const upload = await selectFrom('Uploads')
    .select('path')
    .where('path', '=', uploadPath)
    .withCustomContextData({ _allowUploadsQueries: true })
    .first()

  if (!upload) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  if (
    !Object.values(runtimeConfig.pruvious.images.variants).some((variant) =>
      deepCompare(omit(imageOptions, ['originalExtension']), variant),
    )
  ) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Image variant not found'),
    })
  }

  let streamResult: StreamResult | undefined
  let baseURL: string | undefined

  if (isWorkerd) {
    const url = new URL(event.context.cloudflare.request.url)
    baseURL = url.origin + withoutTrailingSlash(runtimeConfig.pruvious.uploads.basePath)
  }

  try {
    const optimizedImage = await createOptimizedImage(uploadPath, imageOptions!, baseURL)

    if (optimizedImage.success) {
      streamResult = await streamFile(optimizedImage.data.path)
    } else {
      event.waitUntil(
        logError(optimizedImage.error, {
          category: 'image-optimization',
          payload: { functionName: 'uploadEventHandler', uploadPath, imageOptions, baseURL },
        }),
      )
      throw pruviousError(event, {
        statusCode: 400,
        message: optimizedImage.error || __('pruvious-api', 'Failed to create image variant'),
      })
    }
  } catch (error: any) {
    event.waitUntil(
      logError(error.toString(), {
        category: 'image-optimization',
        payload: { functionName: 'uploadEventHandler', uploadPath, imageOptions, baseURL },
      }),
    )
    throw pruviousError(event, {
      statusCode: 400,
      message: error.toString() || __('pruvious-api', 'Failed to create image variant'),
    })
  }

  if (!streamResult.success) {
    throw pruviousError(event, {
      statusCode: 404,
      message: streamResult.error || __('pruvious-api', 'Failed to create image variant'),
    })
  }

  setHeader(event, 'Content-Type', mime.getType(ext) || 'application/octet-stream')
  setHeader(event, 'ETag', streamResult.data.etag)
  setHeader(event, 'Content-Length', streamResult.data.size)

  return streamResult.data.stream
})
