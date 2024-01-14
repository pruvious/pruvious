import { query } from '#pruvious/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return query('number-fields').create(body)
})
