import { db } from '#pruvious/server'
import { defineEventHandler } from 'h3'
import { nanoid } from 'nanoid'

export default defineEventHandler(async () => {
  ;(await db()).model('repeater_fields').create({
    language: 'en',
    translations: nanoid(),
    empty: 'foo',
    normal: JSON.stringify(['bar', { x: 123 }]),
    nested: JSON.stringify([{ user: 9001, sub: [{ user: 9001, foo: 'bar' }, { invalid: true }] }, { sub: 123 }]),
  })
})
