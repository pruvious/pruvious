import { query } from '#pruvious/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return query('file-fields').create(body)
})
