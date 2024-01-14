import { getQueryStringParams, query } from '#pruvious/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params.id)
  const qs = getQueryStringParams(event, 'products')
  const product = await query('products').applyQueryStringParams(qs.params).where('id', id).populate().first()

  return product
})
