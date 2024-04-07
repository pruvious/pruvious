import { query } from '#pruvious/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const userId = getQuery(event).userId as number

  return {
    whereRecordsIn1: await query('records-fields').whereRecordsIn('users', 1).exists(),
    whereRecordsIn2: await query('records-fields').whereRecordsIn('users', [2]).exists(),
    whereRecordsNotIn1: await query('records-fields').whereRecordsNotIn('users', [1]).exists(),
    whereRecordsNotIn2: await query('records-fields').whereRecordsNotIn('users', [2]).exists(),

    whereRecordsInUserIdOr1: await query('records-fields').whereRecordsIn('users', [1, userId]).exists(),
    whereRecordsInUserIdAnd1: await query('records-fields').whereRecordsIn('users', [1, userId], 'every').exists(),

    whereRecordsInUserIdOr2: await query('records-fields').whereRecordsIn('users', [2, userId], 'some').exists(),
    whereRecordsInUserIdAnd2: await query('records-fields').whereRecordsIn('users', [2, userId], 'every').exists(),

    whereRecordsNotInUserIdOr1: await query('records-fields').whereRecordsNotIn('users', [1, userId]).exists(),
    whereRecordsNotInUserIdAnd1: await query('records-fields')
      .whereRecordsNotIn('users', [1, userId], 'every')
      .exists(),

    whereRecordsNotInUserIdOr2: await query('records-fields').whereRecordsNotIn('users', [2, userId], 'some').exists(),
    whereRecordsNotInUserIdAnd2: await query('records-fields')
      .whereRecordsNotIn('users', [2, userId], 'every')
      .exists(),
  }
})
