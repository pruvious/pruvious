import { query } from '#pruvious/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const { ids } = getQuery(event) as any
  return query('products').select({ id: true }).whereIn('id', ids).populate().delete()
})
