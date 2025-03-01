import {
  __,
  httpStatusCodeMessages,
  parseRangeHeader,
  pruviousError,
  resolveContextLanguage,
  streamFile,
} from '#pruvious/server'
import { isDefined } from '@pruvious/utils'
import mime from 'mime'
import { extname } from 'pathe'

export default defineEventHandler(async (event) => {
  const path = '/' + getRouterParams(event)._
  const ext = extname(path)
  const range = parseRangeHeader(event)
  const streamResult = range ? await streamFile(path, range[0], range[1]) : await streamFile(path)

  await resolveContextLanguage()

  if (!streamResult.success) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'File not found'),
    })
  }

  setHeader(event, 'Content-Type', mime.getType(ext) || 'application/octet-stream')
  setHeader(event, 'ETag', streamResult.data.etag)

  if (isDefined(streamResult.data.start) && isDefined(streamResult.data.end)) {
    setHeader(event, 'Accept-Ranges', 'bytes')
    setHeader(event, 'Content-Length', streamResult.data.end - streamResult.data.start + 1)
    setHeader(
      event,
      'Content-Range',
      `bytes ${streamResult.data.start}-${streamResult.data.end}/${streamResult.data.size}`,
    )
    setResponseStatus(event, 206, httpStatusCodeMessages[206])
  } else {
    setHeader(event, 'Content-Length', streamResult.data.size)
  }

  return streamResult.data.stream
})
