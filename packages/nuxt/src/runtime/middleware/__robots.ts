import { useRuntimeConfig } from '#imports'
import axios from 'axios'
import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const response = await axios
    .get(`${config.public.pruvious.cmsBaseUrl}/api/robots`)
    .catch((_) => null)

  setResponseHeader(event, 'Content-Type', 'text/plain')

  return response?.data ?? ''
})
