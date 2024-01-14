import { query } from '#pruvious/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params.id)
  const body = await readBody(event)
  return query('products').where('id', id).populate().update(body)
})
