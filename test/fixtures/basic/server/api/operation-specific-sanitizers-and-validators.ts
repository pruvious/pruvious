import { isArray } from '#pruvious'
import { query } from '#pruvious/server'
import { createError, defineEventHandler, getQuery, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'POST') {
    const body = await readBody(event)
    return isArray(body)
      ? query('operation-specific-sanitizers-and-validators').createMany(body)
      : query('operation-specific-sanitizers-and-validators').create(body)
  } else if (method === 'GET') {
    const qs = getQuery(event)
    return query('operation-specific-sanitizers-and-validators')
      .where('test', qs.test as string)
      .first()
  } else if (method === 'PATCH') {
    const body = await readBody(event)
    return query('operation-specific-sanitizers-and-validators').where('test', body.test).update(body)
  }

  throw createError({ statusCode: 405 })
})
