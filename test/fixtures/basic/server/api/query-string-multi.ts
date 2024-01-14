import { stringifySymbols } from '#pruvious'
import { getQueryStringParams } from '#pruvious/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const qs = getQueryStringParams(event, 'products')
  qs.params.where = stringifySymbols(qs.params.where)
  return qs
})
