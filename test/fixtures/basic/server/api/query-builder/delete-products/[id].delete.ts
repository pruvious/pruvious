import { query } from '#pruvious/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params.id)
  return (await query('products').select({ id: true }).where('id', id).populate().delete())[0]
})
