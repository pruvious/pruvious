import { db } from '#pruvious/server'
import { defineEventHandler } from 'h3'
import { nanoid } from 'nanoid'

export default defineEventHandler(async () => {
  return (await db()).model('image_fields').create({
    language: 'en',
    translations: nanoid(),
    regular: JSON.stringify({}),
    required: JSON.stringify({ uploadId: 9001, alt: 'foo' }),
    png: 2,
    minW9001: JSON.stringify({ alt: 'foo' }),
    optimized: JSON.stringify({ uploadId: 2 }),
  })
})
