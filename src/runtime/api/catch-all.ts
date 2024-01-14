import { defineEventHandler, setResponseStatus } from 'h3'
import { __ } from '../utils/server/translate-string'

export default defineEventHandler((event) => {
  setResponseStatus(event, 404)
  return __(event, 'pruvious-server', 'Resource not found')
})
