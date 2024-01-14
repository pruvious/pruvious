import { db } from '#pruvious/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return (await (await db()).model(body.collection).create(body.data)).dataValues as any
})
