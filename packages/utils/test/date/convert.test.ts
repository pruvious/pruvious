import { expect, test } from 'vitest'
import { toDate, toSeconds, toSQLDateTime } from '../../src'

test('to date', () => {
  expect(toDate(new Date('2021-01-01T00:00:00.000Z'))).toEqual(new Date('2021-01-01T00:00:00.000Z'))
  expect(toDate('2021-01-01T00:00:00.000Z')).toEqual(new Date('2021-01-01T00:00:00.000Z'))
  expect(toDate(1609459200000)).toEqual(new Date('2021-01-01T00:00:00.000Z'))
  expect(toDate()).toBeInstanceOf(Date)
})

test('to sql date-time', () => {
  expect(toSQLDateTime(new Date('2021-01-01T00:00:00.000Z'))).toEqual('2021-01-01 00:00:00')
  expect(toSQLDateTime('2021-01-01T00:00:00.000Z')).toEqual('2021-01-01 00:00:00')
  expect(toSQLDateTime(1609459200000)).toEqual('2021-01-01 00:00:00')
  expect(toSQLDateTime()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
})

test('to seconds', () => {
  expect(toSeconds('1 minute')).toEqual(60)
  expect(toSeconds('2 hours')).toEqual(7200)
  expect(toSeconds('3 days')).toEqual(259200)
  expect(toSeconds('1 second')).toEqual(1)
  expect(toSeconds('1 minute ago')).toEqual(-60)
  expect(toSeconds('1 minute from now')).toEqual(60)
  expect(toSeconds('1.5 minutes')).toEqual(90)
})
