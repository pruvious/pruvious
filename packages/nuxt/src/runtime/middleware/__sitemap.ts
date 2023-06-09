import { createError, useRuntimeConfig } from '#imports'
import axios from 'axios'
import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const response = await axios
    .get(`${config.public.pruvious.cmsBaseUrl}/api/sitemap/${event.context.params?.index ?? 0}`)
    .catch((_) => null)

  if (response) {
    setResponseHeader(event, 'Content-Type', 'text/xml')
    return response.data
  }

  throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
})
