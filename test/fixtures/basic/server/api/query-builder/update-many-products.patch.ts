import { query } from '#pruvious/server'
import { defineEventHandler, getQuery, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { ids } = getQuery(event) as any
  const body = await readBody(event)
  return query('products').whereIn('id', ids).order('id').populate().update(body)
})
