import { getQueryStringParams } from '#pruvious/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  return getQueryStringParams(event, 'settings')
})
