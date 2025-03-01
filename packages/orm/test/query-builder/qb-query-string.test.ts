import { expect, test } from 'vitest'
import {
  conditionalQueryBuilderParamsToQueryString,
  Database,
  deleteQueryBuilderParamsToQueryString,
  insertQueryBuilderParamsToQueryString,
  normalizeQueryString,
  queryStringToConditionalQueryBuilderParams,
  queryStringToDeleteQueryBuilderParams,
  queryStringToInsertQueryBuilderParams,
  queryStringToSelectQueryBuilderParams,
  queryStringToUpdateQueryBuilderParams,
  selectQueryBuilderParamsToQueryString,
  updateQueryBuilderParamsToQueryString,
} from '../../src'
import { collections } from '../test-collections'

test('query string to insert query builder params', () => {
  expect(queryStringToInsertQueryBuilderParams('select=foo&returning=firstName,lastName')).toEqual({
    returning: ['firstName', 'lastName'],
  })

  expect(
    queryStringToInsertQueryBuilderParams('select= foo &returning= firstName , lastName ', { returning: true }),
  ).toEqual({
    returning: ['firstName', 'lastName'],
  })

  expect(
    queryStringToInsertQueryBuilderParams('select=foo&returning=firstName,lastName', { returning: false }),
  ).toEqual({})

  expect(
    queryStringToInsertQueryBuilderParams('select=foo&returning=firstName,lastName', {
      returning: { allow: ['firstName'] },
    }),
  ).toEqual({
    returning: ['firstName'],
  })

  expect(
    queryStringToInsertQueryBuilderParams('select=foo&returning=firstName,lastName', {
      returning: { deny: ['firstName'] },
    }),
  ).toEqual({
    returning: ['lastName'],
  })

  expect(queryStringToInsertQueryBuilderParams('returning')).toEqual({
    returning: [],
  })

  expect(queryStringToInsertQueryBuilderParams('returning=')).toEqual({
    returning: [],
  })

  expect(queryStringToInsertQueryBuilderParams('where=firstName[=][Harry]')).toEqual({})

  expect(queryStringToInsertQueryBuilderParams('populate')).toEqual({
    populate: true,
  })

  expect(queryStringToInsertQueryBuilderParams('populate= &returning= ')).toEqual({
    returning: [],
    populate: true,
  })

  expect(queryStringToInsertQueryBuilderParams('populate=T')).toEqual({
    populate: true,
  })

  expect(queryStringToInsertQueryBuilderParams('populate=F')).toEqual({
    populate: false,
  })

  expect(queryStringToInsertQueryBuilderParams('populate', { populate: true })).toEqual({
    populate: true,
  })

  expect(queryStringToInsertQueryBuilderParams('populate', { populate: false })).toEqual({})

  expect(queryStringToInsertQueryBuilderParams('')).toEqual({})
})

test('insert query builder params to query string', () => {
  expect(
    insertQueryBuilderParamsToQueryString({
      returning: ['firstName', 'lastName'],
    }),
  ).toBe('returning=firstName,lastName')

  expect(insertQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] }, { returning: true })).toBe(
    'returning=firstName,lastName',
  )

  expect(insertQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] }, { returning: false })).toBe('')

  expect(
    insertQueryBuilderParamsToQueryString(
      { returning: ['firstName', 'lastName'] },
      { returning: { allow: ['firstName'] } },
    ),
  ).toBe('returning=firstName')

  expect(
    insertQueryBuilderParamsToQueryString(
      { returning: ['firstName', 'lastName'] },
      { returning: { deny: ['firstName'] } },
    ),
  ).toBe('returning=lastName')

  expect(insertQueryBuilderParamsToQueryString({ returning: [] })).toBe('returning=')

  expect(insertQueryBuilderParamsToQueryString({ populate: true })).toBe('populate')

  expect(insertQueryBuilderParamsToQueryString({ populate: false })).toBe('populate=0')

  expect(insertQueryBuilderParamsToQueryString({ populate: true }, { populate: true })).toBe('populate')

  expect(insertQueryBuilderParamsToQueryString({ populate: true }, { populate: false })).toBe('')

  expect(insertQueryBuilderParamsToQueryString({})).toBe('')
})

test('query string to select query builder params', () => {
  expect(queryStringToSelectQueryBuilderParams('select=firstName,lastName&returning=foo')).toEqual({
    select: ['firstName', 'lastName'],
  })

  expect(queryStringToSelectQueryBuilderParams('select=firstName,lastName&returning=foo', { select: true })).toEqual({
    select: ['firstName', 'lastName'],
  })

  expect(queryStringToSelectQueryBuilderParams('select=firstName,lastName&returning=foo', { select: false })).toEqual(
    {},
  )

  expect(
    queryStringToSelectQueryBuilderParams('select=firstName,lastName&returning=foo', {
      select: { allow: ['firstName'] },
    }),
  ).toEqual({
    select: ['firstName'],
  })

  expect(
    queryStringToSelectQueryBuilderParams('select=firstName,lastName&returning=foo', {
      select: { deny: ['firstName'] },
    }),
  ).toEqual({
    select: ['lastName'],
  })

  expect(queryStringToSelectQueryBuilderParams('where=firstName[=][Harry]')).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(queryStringToSelectQueryBuilderParams('select')).toEqual({
    select: [],
  })

  expect(queryStringToSelectQueryBuilderParams('select=')).toEqual({
    select: [],
  })

  expect(queryStringToSelectQueryBuilderParams('groupBy=firstName')).toEqual({
    groupBy: ['firstName'],
  })

  expect(queryStringToSelectQueryBuilderParams('groupBy=firstName,lastName')).toEqual({
    groupBy: ['firstName', 'lastName'],
  })

  expect(queryStringToSelectQueryBuilderParams('groupBy=firstName,lastName', { groupBy: true })).toEqual({
    groupBy: ['firstName', 'lastName'],
  })

  expect(queryStringToSelectQueryBuilderParams('groupBy=firstName,lastName', { groupBy: false })).toEqual({})

  expect(
    queryStringToSelectQueryBuilderParams('groupBy=firstName,lastName', { groupBy: { allow: ['firstName'] } }),
  ).toEqual({
    groupBy: ['firstName'],
  })

  expect(
    queryStringToSelectQueryBuilderParams('groupBy=firstName,lastName', { groupBy: { deny: ['firstName'] } }),
  ).toEqual({
    groupBy: ['lastName'],
  })

  expect(queryStringToSelectQueryBuilderParams('groupBy')).toEqual({
    groupBy: [],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'asc', nulls: 'nullsAuto' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName:asc')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'asc', nulls: 'nullsAuto' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName:desc')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'desc', nulls: 'nullsAuto' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName:desc:nullsFirst')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'desc', nulls: 'nullsFirst' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName:asc:nullsLast')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'asc', nulls: 'nullsLast' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName:nullsLast')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'asc', nulls: 'nullsLast' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=firstName:foo:nullsLast:bar')).toEqual({
    orderBy: [{ field: 'firstName', direction: 'asc', nulls: 'nullsLast' }],
  })

  expect(
    queryStringToSelectQueryBuilderParams('orderBy=firstName:desc:nullsAuto,lastName:nullsLast', { orderBy: true }),
  ).toEqual({
    orderBy: [
      { field: 'firstName', direction: 'desc', nulls: 'nullsAuto' },
      { field: 'lastName', direction: 'asc', nulls: 'nullsLast' },
    ],
  })

  expect(
    queryStringToSelectQueryBuilderParams('orderBy=firstName:desc:nullsAuto,lastName:nullsLast', { orderBy: false }),
  ).toEqual({})

  expect(
    queryStringToSelectQueryBuilderParams('orderBy=firstName:desc:nullsAuto,lastName:nullsLast', {
      orderBy: { allow: ['firstName'] },
    }),
  ).toEqual({
    orderBy: [{ field: 'firstName', direction: 'desc', nulls: 'nullsAuto' }],
  })

  expect(
    queryStringToSelectQueryBuilderParams('orderBy=firstName:desc:nullsAuto,lastName:nullsLast', {
      orderBy: { deny: ['firstName'] },
    }),
  ).toEqual({
    orderBy: [{ field: 'lastName', direction: 'asc', nulls: 'nullsLast' }],
  })

  expect(queryStringToSelectQueryBuilderParams('orderBy=')).toEqual({
    orderBy: [],
  })

  expect(queryStringToSelectQueryBuilderParams('limit=1')).toEqual({
    limit: 1,
  })

  expect(queryStringToSelectQueryBuilderParams('limit=10', { limit: true })).toEqual({
    limit: 10,
  })

  expect(queryStringToSelectQueryBuilderParams('limit=10', { limit: false })).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('limit=10', { limit: 5 })).toEqual({
    limit: 5,
  })

  expect(queryStringToSelectQueryBuilderParams('', { limit: 5 })).toEqual({
    limit: 5,
  })

  expect(queryStringToSelectQueryBuilderParams('limit=foo')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('limit=-1')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('limit=0')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('limit=1.1')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('limit=')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('offset=1')).toEqual({
    offset: 1,
  })

  expect(queryStringToSelectQueryBuilderParams('offset=10', { offset: true })).toEqual({
    offset: 10,
  })

  expect(queryStringToSelectQueryBuilderParams('offset=10', { offset: false })).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('offset=foo')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('offset=-1')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('offset=0')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('offset=1.1')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('offset=')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('page=1')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('page=2')).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('page=1&perPage=10')).toEqual({
    limit: 10,
    offset: 0,
  })

  expect(queryStringToSelectQueryBuilderParams('page=2&perPage=10')).toEqual({
    limit: 10,
    offset: 10,
  })

  expect(queryStringToSelectQueryBuilderParams('perPage=10')).toEqual({
    limit: 10,
  })

  expect(queryStringToSelectQueryBuilderParams('perPage=10&limit=5')).toEqual({
    limit: 5,
  })

  expect(queryStringToSelectQueryBuilderParams('limit=5&offset=15&page=30&perPage=10')).toEqual({
    limit: 5,
    offset: 15,
  })

  expect(queryStringToSelectQueryBuilderParams('page=1&perPage=10', { limit: false })).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('page=1&perPage=10', { offset: false })).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('limit=2&offset=4&page=1&perPage=10', { limit: false })).toEqual({
    offset: 4,
  })

  expect(queryStringToSelectQueryBuilderParams('limit=2&offset=4&page=1&perPage=10', { offset: false })).toEqual({
    limit: 2,
  })

  expect(queryStringToSelectQueryBuilderParams('page=1&perPage=10', { limit: 5 })).toEqual({
    limit: 5,
    offset: 0,
  })

  expect(queryStringToSelectQueryBuilderParams('page=2&perPage=10', { limit: 5 })).toEqual({
    limit: 5,
    offset: 5,
  })

  expect(queryStringToSelectQueryBuilderParams('page=2', { limit: 5 })).toEqual({
    limit: 5,
  })

  expect(queryStringToSelectQueryBuilderParams('populate')).toEqual({
    populate: true,
  })

  expect(queryStringToSelectQueryBuilderParams('populate= &select= ')).toEqual({
    select: [],
    populate: true,
  })

  expect(queryStringToSelectQueryBuilderParams('populate=T')).toEqual({
    populate: true,
  })

  expect(queryStringToSelectQueryBuilderParams('populate=F')).toEqual({
    populate: false,
  })

  expect(queryStringToSelectQueryBuilderParams('populate', { populate: true })).toEqual({
    populate: true,
  })

  expect(queryStringToSelectQueryBuilderParams('populate', { populate: false })).toEqual({})

  expect(queryStringToSelectQueryBuilderParams('')).toEqual({})
})

test('select query builder params to query string', () => {
  expect(selectQueryBuilderParamsToQueryString({ select: ['firstName', 'lastName'] })).toBe('select=firstName,lastName')

  expect(selectQueryBuilderParamsToQueryString({ select: ['firstName', 'lastName'] }, { select: true })).toBe(
    'select=firstName,lastName',
  )

  expect(selectQueryBuilderParamsToQueryString({ select: ['firstName', 'lastName'] }, { select: false })).toBe('')

  expect(
    selectQueryBuilderParamsToQueryString({ select: ['firstName', 'lastName'] }, { select: { allow: ['firstName'] } }),
  ).toBe('select=firstName')

  expect(
    selectQueryBuilderParamsToQueryString({ select: ['firstName', 'lastName'] }, { select: { deny: ['firstName'] } }),
  ).toBe('select=lastName')

  expect(
    selectQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: '=', value: 'Harry' }] }),
  ).toBe('where=firstName[=][Harry]')

  expect(selectQueryBuilderParamsToQueryString({ select: [] })).toBe('select=')

  expect(selectQueryBuilderParamsToQueryString({ groupBy: ['firstName'] })).toBe('groupBy=firstName')

  expect(selectQueryBuilderParamsToQueryString({ groupBy: ['firstName', 'lastName'] })).toBe(
    'groupBy=firstName,lastName',
  )

  expect(selectQueryBuilderParamsToQueryString({ groupBy: ['firstName', 'lastName'] }, { groupBy: true })).toBe(
    'groupBy=firstName,lastName',
  )

  expect(selectQueryBuilderParamsToQueryString({ groupBy: ['firstName', 'lastName'] }, { groupBy: false })).toBe('')

  expect(
    selectQueryBuilderParamsToQueryString(
      { groupBy: ['firstName', 'lastName'] },
      { groupBy: { allow: ['firstName'] } },
    ),
  ).toBe('groupBy=firstName')

  expect(
    selectQueryBuilderParamsToQueryString({ groupBy: ['firstName', 'lastName'] }, { groupBy: { deny: ['firstName'] } }),
  ).toBe('groupBy=lastName')

  expect(selectQueryBuilderParamsToQueryString({ groupBy: [] })).toBe('groupBy=')

  expect(selectQueryBuilderParamsToQueryString({ orderBy: [{ field: 'firstName', direction: 'asc' }] })).toBe(
    'orderBy=firstName',
  )

  expect(
    selectQueryBuilderParamsToQueryString({ orderBy: [{ field: 'firstName', direction: 'desc', nulls: 'nullsAuto' }] }),
  ).toBe('orderBy=firstName:desc')

  expect(
    selectQueryBuilderParamsToQueryString({
      orderBy: [{ field: 'firstName', direction: 'desc', nulls: 'nullsFirst' }],
    }),
  ).toBe('orderBy=firstName:desc:nullsFirst')

  expect(selectQueryBuilderParamsToQueryString({ orderBy: [{ field: 'firstName', nulls: 'nullsLast' }] })).toBe(
    'orderBy=firstName:nullsLast',
  )

  expect(
    selectQueryBuilderParamsToQueryString({
      orderBy: [{ field: 'firstName', direction: 'foo' as any, nulls: 'nullsLast' }],
    }),
  ).toBe('orderBy=firstName:nullsLast')

  expect(
    selectQueryBuilderParamsToQueryString({
      orderBy: [{ field: 'firstName', direction: 'desc', nulls: 'foo' as any }],
    }),
  ).toBe('orderBy=firstName:desc')

  expect(
    selectQueryBuilderParamsToQueryString({
      orderBy: [
        { field: 'firstName', direction: 'desc', nulls: 'nullsAuto' },
        { field: 'lastName', direction: 'asc', nulls: 'nullsLast' },
      ],
    }),
  ).toBe('orderBy=firstName:desc,lastName:nullsLast')

  expect(
    selectQueryBuilderParamsToQueryString(
      {
        orderBy: [
          { field: 'firstName', direction: 'desc', nulls: 'nullsAuto' },
          { field: 'lastName', direction: 'asc', nulls: 'nullsLast' },
        ],
      },
      { orderBy: true },
    ),
  ).toBe('orderBy=firstName:desc,lastName:nullsLast')

  expect(
    selectQueryBuilderParamsToQueryString(
      {
        orderBy: [
          { field: 'firstName', direction: 'desc', nulls: 'nullsAuto' },
          { field: 'lastName', direction: 'asc', nulls: 'nullsLast' },
        ],
      },
      { orderBy: false },
    ),
  ).toBe('')

  expect(
    selectQueryBuilderParamsToQueryString(
      {
        orderBy: [
          { field: 'firstName', direction: 'desc', nulls: 'nullsAuto' },
          { field: 'lastName', direction: 'asc', nulls: 'nullsLast' },
        ],
      },
      { orderBy: { allow: ['firstName'] } },
    ),
  ).toBe('orderBy=firstName:desc')

  expect(
    selectQueryBuilderParamsToQueryString(
      {
        orderBy: [
          { field: 'firstName', direction: 'desc', nulls: 'nullsAuto' },
          { field: 'lastName', direction: 'asc', nulls: 'nullsLast' },
        ],
      },
      { orderBy: { deny: ['firstName'] } },
    ),
  ).toBe('orderBy=lastName:nullsLast')

  expect(selectQueryBuilderParamsToQueryString({ orderBy: [] })).toBe('orderBy=')

  expect(selectQueryBuilderParamsToQueryString({ limit: 1 })).toBe('limit=1')

  expect(selectQueryBuilderParamsToQueryString({ limit: 10 }, { limit: true })).toBe('limit=10')

  expect(selectQueryBuilderParamsToQueryString({ limit: 10 }, { limit: false })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({ limit: 10 }, { limit: 5 })).toBe('limit=5')

  expect(selectQueryBuilderParamsToQueryString({}, { limit: 5 })).toBe('limit=5')

  expect(selectQueryBuilderParamsToQueryString({ offset: 1 })).toBe('offset=1')

  expect(selectQueryBuilderParamsToQueryString({ offset: 10 }, { offset: true })).toBe('offset=10')

  expect(selectQueryBuilderParamsToQueryString({ offset: 10 }, { offset: false })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({ page: 1 })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({ page: 2 })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({ page: 1, perPage: 10 })).toBe('page=1&perPage=10')

  expect(selectQueryBuilderParamsToQueryString({ page: 2, perPage: 10 })).toBe('page=2&perPage=10')

  expect(selectQueryBuilderParamsToQueryString({ perPage: 10 })).toBe('page=1&perPage=10')

  expect(selectQueryBuilderParamsToQueryString({ perPage: 10, limit: 5 })).toBe('limit=5')

  expect(selectQueryBuilderParamsToQueryString({ limit: 5, offset: 15, page: 30, perPage: 10 })).toBe(
    'limit=5&offset=15',
  )

  expect(selectQueryBuilderParamsToQueryString({ limit: 5, page: 30, perPage: 10 })).toBe('limit=5')

  expect(selectQueryBuilderParamsToQueryString({ offset: 15, page: 30, perPage: 10 })).toBe('offset=15')

  expect(selectQueryBuilderParamsToQueryString({ page: 1, perPage: 10 }, { limit: false })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({ page: 1, perPage: 10 }, { offset: false })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({ limit: 2, offset: 4, page: 1, perPage: 10 }, { limit: false })).toBe(
    'offset=4',
  )

  expect(selectQueryBuilderParamsToQueryString({ limit: 2, offset: 4, page: 1, perPage: 10 }, { offset: false })).toBe(
    'limit=2',
  )

  expect(selectQueryBuilderParamsToQueryString({ page: 1, perPage: 10 }, { limit: 5 })).toBe('page=1&perPage=5')

  expect(selectQueryBuilderParamsToQueryString({ page: 2, perPage: 10 }, { limit: 5 })).toBe('page=2&perPage=5')

  expect(selectQueryBuilderParamsToQueryString({ perPage: 10 }, { limit: 5 })).toBe('page=1&perPage=5')

  expect(selectQueryBuilderParamsToQueryString({ populate: true })).toBe('populate')

  expect(selectQueryBuilderParamsToQueryString({ populate: false })).toBe('populate=0')

  expect(selectQueryBuilderParamsToQueryString({ populate: true }, { populate: true })).toBe('populate')

  expect(selectQueryBuilderParamsToQueryString({ populate: true }, { populate: false })).toBe('')

  expect(selectQueryBuilderParamsToQueryString({})).toBe('')
})

test('query string to update query builder params', () => {
  expect(queryStringToUpdateQueryBuilderParams('select=foo&returning=firstName,lastName')).toEqual({
    returning: ['firstName', 'lastName'],
  })

  expect(queryStringToUpdateQueryBuilderParams('select=foo&returning=firstName,lastName', { returning: true })).toEqual(
    {
      returning: ['firstName', 'lastName'],
    },
  )

  expect(
    queryStringToUpdateQueryBuilderParams('select=foo&returning=firstName,lastName', { returning: false }),
  ).toEqual({})

  expect(
    queryStringToUpdateQueryBuilderParams('select=foo&returning=firstName,lastName', {
      returning: { allow: ['firstName'] },
    }),
  ).toEqual({
    returning: ['firstName'],
  })

  expect(
    queryStringToUpdateQueryBuilderParams('select=foo&returning=firstName,lastName', {
      returning: { deny: ['firstName'] },
    }),
  ).toEqual({
    returning: ['lastName'],
  })

  expect(queryStringToUpdateQueryBuilderParams('where=firstName[=][Harry]')).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(queryStringToUpdateQueryBuilderParams('returning')).toEqual({ returning: [] })

  expect(queryStringToUpdateQueryBuilderParams('returning=')).toEqual({ returning: [] })

  expect(queryStringToUpdateQueryBuilderParams('populate')).toEqual({
    populate: true,
  })

  expect(queryStringToUpdateQueryBuilderParams('populate= &returning= ')).toEqual({
    returning: [],
    populate: true,
  })

  expect(queryStringToUpdateQueryBuilderParams('populate=T')).toEqual({
    populate: true,
  })

  expect(queryStringToUpdateQueryBuilderParams('populate=F')).toEqual({
    populate: false,
  })

  expect(queryStringToUpdateQueryBuilderParams('populate', { populate: true })).toEqual({
    populate: true,
  })

  expect(queryStringToUpdateQueryBuilderParams('populate', { populate: false })).toEqual({})

  expect(queryStringToUpdateQueryBuilderParams('')).toEqual({})
})

test('update query builder params to query string', () => {
  expect(updateQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] })).toBe(
    'returning=firstName,lastName',
  )

  expect(updateQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] }, { returning: true })).toBe(
    'returning=firstName,lastName',
  )

  expect(updateQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] }, { returning: false })).toBe('')

  expect(
    updateQueryBuilderParamsToQueryString(
      { returning: ['firstName', 'lastName'] },
      { returning: { allow: ['firstName'] } },
    ),
  ).toBe('returning=firstName')

  expect(
    updateQueryBuilderParamsToQueryString(
      { returning: ['firstName', 'lastName'] },
      { returning: { deny: ['firstName'] } },
    ),
  ).toBe('returning=lastName')

  expect(
    updateQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: '=', value: 'Harry' }] }),
  ).toBe('where=firstName[=][Harry]')

  expect(updateQueryBuilderParamsToQueryString({ returning: [] })).toBe('returning=')

  expect(updateQueryBuilderParamsToQueryString({ populate: true })).toBe('populate')

  expect(updateQueryBuilderParamsToQueryString({ populate: false })).toBe('populate=0')

  expect(updateQueryBuilderParamsToQueryString({ populate: true }, { populate: true })).toBe('populate')

  expect(updateQueryBuilderParamsToQueryString({ populate: true }, { populate: false })).toBe('')

  expect(updateQueryBuilderParamsToQueryString({})).toBe('')
})

test('query string to delete query builder params', () => {
  expect(queryStringToDeleteQueryBuilderParams('select=foo&returning=firstName,lastName')).toEqual({
    returning: ['firstName', 'lastName'],
  })

  expect(queryStringToDeleteQueryBuilderParams('select=foo&returning=firstName,lastName', { returning: true })).toEqual(
    {
      returning: ['firstName', 'lastName'],
    },
  )

  expect(
    queryStringToDeleteQueryBuilderParams('select=foo&returning=firstName,lastName', { returning: false }),
  ).toEqual({})

  expect(
    queryStringToDeleteQueryBuilderParams('select=foo&returning=firstName,lastName', {
      returning: { allow: ['firstName'] },
    }),
  ).toEqual({
    returning: ['firstName'],
  })

  expect(
    queryStringToDeleteQueryBuilderParams('select=foo&returning=firstName,lastName', {
      returning: { deny: ['firstName'] },
    }),
  ).toEqual({
    returning: ['lastName'],
  })

  expect(queryStringToDeleteQueryBuilderParams('where=firstName[=][Harry]')).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(queryStringToDeleteQueryBuilderParams('returning')).toEqual({ returning: [] })

  expect(queryStringToDeleteQueryBuilderParams('returning=')).toEqual({ returning: [] })

  expect(queryStringToDeleteQueryBuilderParams('populate')).toEqual({
    populate: true,
  })

  expect(queryStringToDeleteQueryBuilderParams('populate= &returning= ')).toEqual({
    returning: [],
    populate: true,
  })

  expect(queryStringToDeleteQueryBuilderParams('populate=T')).toEqual({
    populate: true,
  })

  expect(queryStringToDeleteQueryBuilderParams('populate=F')).toEqual({
    populate: false,
  })

  expect(queryStringToDeleteQueryBuilderParams('populate', { populate: true })).toEqual({
    populate: true,
  })

  expect(queryStringToDeleteQueryBuilderParams('populate', { populate: false })).toEqual({})

  expect(queryStringToDeleteQueryBuilderParams('')).toEqual({})
})

test('delete query builder params to query string', () => {
  expect(deleteQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] })).toBe(
    'returning=firstName,lastName',
  )

  expect(deleteQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] }, { returning: true })).toBe(
    'returning=firstName,lastName',
  )

  expect(deleteQueryBuilderParamsToQueryString({ returning: ['firstName', 'lastName'] }, { returning: false })).toBe('')

  expect(
    deleteQueryBuilderParamsToQueryString(
      { returning: ['firstName', 'lastName'] },
      { returning: { allow: ['firstName'] } },
    ),
  ).toBe('returning=firstName')

  expect(
    deleteQueryBuilderParamsToQueryString(
      { returning: ['firstName', 'lastName'] },
      { returning: { deny: ['firstName'] } },
    ),
  ).toBe('returning=lastName')

  expect(
    deleteQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: '=', value: 'Harry' }] }),
  ).toBe('where=firstName[=][Harry]')

  expect(deleteQueryBuilderParamsToQueryString({ returning: [] })).toBe('returning=')

  expect(deleteQueryBuilderParamsToQueryString({ populate: true })).toBe('populate')

  expect(deleteQueryBuilderParamsToQueryString({ populate: false })).toBe('populate=0')

  expect(deleteQueryBuilderParamsToQueryString({ populate: true }, { populate: true })).toBe('populate')

  expect(deleteQueryBuilderParamsToQueryString({ populate: true }, { populate: false })).toBe('')

  expect(deleteQueryBuilderParamsToQueryString({})).toBe('')
})

test('query string to conditional query builder params', () => {
  expect(queryStringToConditionalQueryBuilderParams('where=firstName[=][Harry]')).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(queryStringToConditionalQueryBuilderParams(' where= firstName [ != ] [ Harry ] ')).toEqual({
    where: [{ field: 'firstName', operator: '!=', value: 'Harry' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=points[<][50]')).toEqual({
    where: [{ field: 'points', operator: '<', value: 50 }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=points[<=][50]')).toEqual({
    where: [{ field: 'points', operator: '<=', value: 50 }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=points[>][50]')).toEqual({
    where: [{ field: 'points', operator: '>', value: 50 }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=points[>=][50]')).toEqual({
    where: [{ field: 'points', operator: '>=', value: 50 }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[includes][1,2]')).toEqual({
    where: [{ field: 'matrix', operator: 'includes', value: [1, 2] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[includes][1]')).toEqual({
    where: [{ field: 'matrix', operator: 'includes', value: [1] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[includesAny][1,2]')).toEqual({
    where: [{ field: 'matrix', operator: 'includesAny', value: [1, 2] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[includesAny][1]')).toEqual({
    where: [{ field: 'matrix', operator: 'includesAny', value: [1] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[excludes][1,2]')).toEqual({
    where: [{ field: 'matrix', operator: 'excludes', value: [1, 2] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[excludes][1]')).toEqual({
    where: [{ field: 'matrix', operator: 'excludes', value: [1] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[excludesAny][1,2]')).toEqual({
    where: [{ field: 'matrix', operator: 'excludesAny', value: [1, 2] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=matrix[excludesAny][1]')).toEqual({
    where: [{ field: 'matrix', operator: 'excludesAny', value: [1] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[in][Harry,Hermione]')).toEqual({
    where: [{ field: 'firstName', operator: 'in', value: ['Harry', 'Hermione'] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[notIn][Harry,Hermione]')).toEqual({
    where: [{ field: 'firstName', operator: 'notIn', value: ['Harry', 'Hermione'] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[like][H%]')).toEqual({
    where: [{ field: 'firstName', operator: 'like', value: 'H%' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[LIKE][H%]')).toEqual({
    where: [{ field: 'firstName', operator: 'like', value: 'H%' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[notLike][H%]')).toEqual({
    where: [{ field: 'firstName', operator: 'notLike', value: 'H%' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[NOTLike][H%]')).toEqual({
    where: [{ field: 'firstName', operator: 'notLike', value: 'H%' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[ilike][H%]')).toEqual({
    where: [{ field: 'firstName', operator: 'ilike', value: 'H%' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=firstName[notIlike][H%]')).toEqual({
    where: [{ field: 'firstName', operator: 'notIlike', value: 'H%' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=points[between][50,75]')).toEqual({
    where: [{ field: 'points', operator: 'between', value: [50, 75] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=points[notBetween][50,75]')).toEqual({
    where: [{ field: 'points', operator: 'notBetween', value: [50, 75] }],
  })

  expect(queryStringToConditionalQueryBuilderParams('select=foo&where=firstName[=][Harry]&returning=bar')).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=orGroup[firstName[=][Harry],firstName[=][Hermione]]'),
  ).toEqual({
    where: [
      {
        or: [
          [{ field: 'firstName', operator: '=', value: 'Harry' }],
          [{ field: 'firstName', operator: '=', value: 'Hermione' }],
        ],
      },
    ],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=[[[orGroup[[[[firstName[=][Harry]]]],firstName[=][Hermione]]]]]'),
  ).toEqual({
    where: [
      {
        or: [
          [{ field: 'firstName', operator: '=', value: 'Harry' }],
          [{ field: 'firstName', operator: '=', value: 'Hermione' }],
        ],
      },
    ],
  })

  expect(
    queryStringToConditionalQueryBuilderParams(
      'select=firstName&where=orGroup[[firstName[=][Harry],orGroup[lastName[=][Otter],lastName[=][Potter]]],[firstName[=][Hermione],lastName[ilike][%NG%]]]',
    ),
  ).toEqual({
    where: [
      {
        or: [
          [
            { field: 'firstName', operator: '=', value: 'Harry' },
            {
              or: [
                [{ field: 'lastName', operator: '=', value: 'Otter' }],
                [{ field: 'lastName', operator: '=', value: 'Potter' }],
              ],
            },
          ],
          [
            { field: 'firstName', operator: '=', value: 'Hermione' },
            { field: 'lastName', operator: 'ilike', value: '%NG%' },
          ],
        ],
      },
    ],
  })

  expect(
    queryStringToConditionalQueryBuilderParams(
      ' where= [ [ firstName [ = ] [ Harry ] ] , [ [ lastName [ = ] [ Potter ] ] ] ] ',
      {
        where: true,
      },
    ),
  ).toEqual({
    where: [
      { field: 'firstName', operator: '=', value: 'Harry' },
      { field: 'lastName', operator: '=', value: 'Potter' },
    ],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=[firstName[=][Harry],lastName[=][Potter]]', { where: false }),
  ).toEqual({})

  expect(
    queryStringToConditionalQueryBuilderParams('where=[firstName[=][Harry],lastName[=][Potter]]', {
      where: { allow: [{ field: 'firstName' }] },
    }),
  ).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=[firstName[=][Harry],lastName[=][Potter]]', {
      where: { deny: [{ field: 'firstName' }] },
    }),
  ).toEqual({
    where: [{ field: 'lastName', operator: '=', value: 'Potter' }],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=[firstName[=][Harry],lastName[=][Potter]]', {
      where: { allow: [{ field: 'firstName', operators: ['='] }] },
    }),
  ).toEqual({
    where: [{ field: 'firstName', operator: '=', value: 'Harry' }],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=[firstName[=][Harry],lastName[=][Potter]]', {
      where: { allow: [{ field: 'firstName', operators: ['!='] }] },
    }),
  ).toEqual({
    where: [],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=[firstName[=][Harry],lastName[=][Potter]]', {
      where: { deny: [{ field: 'firstName', operators: ['='] }] },
    }),
  ).toEqual({
    where: [{ field: 'lastName', operator: '=', value: 'Potter' }],
  })

  expect(
    queryStringToConditionalQueryBuilderParams('where=firstName[=][Harry],lastName[=][Potter]', {
      where: { deny: [{ field: 'firstName', operators: ['!='] }] },
    }),
  ).toEqual({
    where: [
      { field: 'firstName', operator: '=', value: 'Harry' },
      { field: 'lastName', operator: '=', value: 'Potter' },
    ],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[=][null]')).toEqual({
    where: [{ field: 'middleName', operator: '=', value: null }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[>][null]')).toEqual({
    where: [],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[>][foo]')).toEqual({
    where: [],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[in][]')).toEqual({
    where: [],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[between][1,2,3]')).toEqual({
    where: [],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[between][1,foo]')).toEqual({
    where: [],
  })

  expect(queryStringToConditionalQueryBuilderParams('where=middleName[like][null]')).toEqual({
    where: [{ field: 'middleName', operator: 'like', value: 'null' }],
  })

  expect(queryStringToConditionalQueryBuilderParams('where')).toEqual({ where: [] })

  expect(queryStringToConditionalQueryBuilderParams('where=')).toEqual({ where: [] })

  expect(queryStringToConditionalQueryBuilderParams('where=')).toEqual({ where: [] })

  expect(queryStringToConditionalQueryBuilderParams('')).toEqual({})
})

test('conditional query builder params to query string', () => {
  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: '=', value: 'Harry' }] }),
  ).toBe('where=firstName[=][Harry]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: '!=', value: 'Harry' }] }),
  ).toBe('where=firstName[!=][Harry]')

  expect(conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'points', operator: '<', value: 50 }] })).toBe(
    'where=points[<][50]',
  )

  expect(conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'points', operator: '<=', value: 50 }] })).toBe(
    'where=points[<=][50]',
  )

  expect(conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'points', operator: '>', value: 50 }] })).toBe(
    'where=points[>][50]',
  )

  expect(conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'points', operator: '>=', value: 50 }] })).toBe(
    'where=points[>=][50]',
  )

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'includes', value: [1, 2] }] }),
  ).toBe('where=matrix[includes][1,2]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'includes', value: [1] }] }),
  ).toBe('where=matrix[includes][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'includes', value: 1 }] }),
  ).toBe('where=matrix[includes][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [{ field: 'matrix', operator: 'includesAny', value: [1, 2] }],
    }),
  ).toBe('where=matrix[includesAny][1,2]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'includesAny', value: [1] }] }),
  ).toBe('where=matrix[includesAny][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'includesAny', value: 1 }] }),
  ).toBe('where=matrix[includesAny][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'excludes', value: [1, 2] }] }),
  ).toBe('where=matrix[excludes][1,2]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'excludes', value: [1] }] }),
  ).toBe('where=matrix[excludes][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'excludes', value: 1 }] }),
  ).toBe('where=matrix[excludes][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [{ field: 'matrix', operator: 'excludesAny', value: [1, 2] }],
    }),
  ).toBe('where=matrix[excludesAny][1,2]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'excludesAny', value: [1] }] }),
  ).toBe('where=matrix[excludesAny][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'matrix', operator: 'excludesAny', value: 1 }] }),
  ).toBe('where=matrix[excludesAny][1]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [{ field: 'firstName', operator: 'in', value: ['Harry', 'Hermione'] }],
    }),
  ).toBe('where=firstName[in][Harry,Hermione]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [{ field: 'firstName', operator: 'notIn', value: ['Harry', 'Hermione'] }],
    }),
  ).toBe('where=firstName[notIn][Harry,Hermione]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: 'like', value: 'H%' }] }),
  ).toBe('where=firstName[like][H%]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: 'notLike', value: 'H%' }] }),
  ).toBe('where=firstName[notLike][H%]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: 'ilike', value: 'H%' }] }),
  ).toBe('where=firstName[ilike][H%]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'firstName', operator: 'notIlike', value: 'H%' }] }),
  ).toBe('where=firstName[notIlike][H%]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [{ field: 'points', operator: 'between', value: [50, 75] }],
    }),
  ).toBe('where=points[between][50,75]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [{ field: 'points', operator: 'notBetween', value: [50, 75] }],
    }),
  ).toBe('where=points[notBetween][50,75]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      select: ['foo'],
      where: [{ field: 'firstName', operator: '=', value: 'Harry', returning: 'bar' }],
    } as any),
  ).toBe('where=firstName[=][Harry]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [
        {
          or: [
            [{ field: 'firstName', operator: '=', value: 'Harry' }],
            [{ field: 'firstName', operator: '=', value: 'Hermione' }],
          ],
        },
      ],
    }),
  ).toBe('where=orGroup[firstName[=][Harry],firstName[=][Hermione]]')

  expect(
    conditionalQueryBuilderParamsToQueryString({
      where: [
        {
          or: [
            [
              { field: 'firstName', operator: '=', value: 'Harry' },
              {
                or: [
                  [{ field: 'lastName', operator: '=', value: 'Otter' }],
                  [{ field: 'lastName', operator: '=', value: 'Potter' }],
                ],
              },
            ],
            [
              { field: 'firstName', operator: '=', value: 'Hermione' },
              { field: 'lastName', operator: 'ilike', value: '%NG%' },
            ],
          ],
        },
      ],
    }),
  ).toBe(
    'where=orGroup[firstName[=][Harry],orGroup[lastName[=][Otter],lastName[=][Potter]],firstName[=][Hermione],lastName[ilike][%NG%]]',
  )

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: true },
    ),
  ).toBe('where=firstName[=][Harry],lastName[=][Potter]')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: false },
    ),
  ).toBe('')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: { allow: [{ field: 'firstName' }] } },
    ),
  ).toBe('where=firstName[=][Harry]')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: { deny: [{ field: 'firstName' }] } },
    ),
  ).toBe('where=lastName[=][Potter]')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: { allow: [{ field: 'firstName', operators: ['='] }] } },
    ),
  ).toBe('where=firstName[=][Harry]')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: { allow: [{ field: 'firstName', operators: ['!='] }] } },
    ),
  ).toBe('where=')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: { deny: [{ field: 'firstName', operators: ['='] }] } },
    ),
  ).toBe('where=lastName[=][Potter]')

  expect(
    conditionalQueryBuilderParamsToQueryString(
      {
        where: [
          { field: 'firstName', operator: '=', value: 'Harry' },
          { field: 'lastName', operator: '=', value: 'Potter' },
        ],
      },
      { where: { deny: [{ field: 'firstName', operators: ['!='] }] } },
    ),
  ).toBe('where=firstName[=][Harry],lastName[=][Potter]')

  expect(
    conditionalQueryBuilderParamsToQueryString({ where: [{ field: 'middleName', operator: '=', value: null }] }),
  ).toBe('where=middleName[=][null]')

  expect(conditionalQueryBuilderParamsToQueryString({ where: [] })).toBe('where=')

  expect(conditionalQueryBuilderParamsToQueryString({})).toBe('')
})

test('normalize query string', () => {
  expect(normalizeQueryString('key1=value1&key2=value2')).toEqual({
    key1: 'value1',
    key2: 'value2',
  })

  expect(normalizeQueryString('/path?key1=value1&key2=value2')).toEqual({
    key1: 'value1',
    key2: 'value2',
  })

  expect(normalizeQueryString('key1=value1&key2=value2')).toEqual({
    key1: 'value1',
    key2: 'value2',
  })

  expect(normalizeQueryString('key1=value1&key2=value2&key2=value3')).toEqual({
    key1: 'value1',
    key2: 'value2,value3',
  })

  expect(normalizeQueryString({ key1: 'value1', key2: ['value2', 'value3'] })).toEqual({
    key1: 'value1',
    key2: 'value2,value3',
  })

  expect(normalizeQueryString('select=firstName,lastName')).toEqual({
    select: 'firstName,lastName',
  })

  expect(
    normalizeQueryString(
      'select=firstName&where=orGroup[firstName[=][Harry],orGroup[lastName[=][Otter],lastName[=][Potter]],firstName[=][Hermione],lastName[ilike][%NG%]]',
    ),
  ).toEqual({
    select: 'firstName',
    where:
      'orGroup[firstName[=][Harry],orGroup[lastName[=][Otter],lastName[=][Potter]],firstName[=][Hermione],lastName[ilike][%NG%]]',
  })

  expect(normalizeQueryString('select')).toEqual({
    select: '',
  })

  expect(normalizeQueryString('select=')).toEqual({
    select: '',
  })

  expect(normalizeQueryString('')).toEqual({})
})

test('query builder query string methods', () => {
  const db = new Database({ collections })
  const qb = db.queryBuilder()
  const qss = 'select=firstName,lastName'
  const qsr = 'returning=firstName,lastName&where=firstName[=][Harry],lastName[=][Potter]'

  expect(qb.insertInto('Students').fromQueryString(qsr).toQueryString()).toBe('returning=firstName,lastName')
  expect(qb.selectFrom('Students').fromQueryString(qss).toQueryString()).toBe(qss)
  expect(qb.update('Students').fromQueryString(qsr).toQueryString()).toBe(qsr)
  expect(qb.deleteFrom('Students').fromQueryString(qsr).toQueryString()).toBe(qsr)

  expect(qb.insertInto('Students').fromQueryString(qsr).toQueryString({ withDefaults: true })).toBe(
    'returning=firstName,lastName&populate=0',
  )
  expect(qb.selectFrom('Students').fromQueryString(qss).toQueryString({ withDefaults: true })).toBe(
    `${qss}&where=&groupBy=&orderBy=&limit=-1&offset=0&populate=0`,
  )
  expect(qb.update('Students').fromQueryString(qsr).toQueryString({ withDefaults: true })).toBe(`${qsr}&populate=0`)
  expect(qb.deleteFrom('Students').fromQueryString(qsr).toQueryString({ withDefaults: true })).toBe(`${qsr}&populate=0`)

  expect(qb.insertInto('Students').toQueryString({ withDefaults: true })).toBe('populate=0')
  expect(qb.selectFrom('Students').toQueryString({ withDefaults: true })).toBe(
    'select=*&where=&groupBy=&orderBy=&limit=-1&offset=0&populate=0',
  )
  expect(qb.update('Students').toQueryString({ withDefaults: true })).toBe('where=&populate=0')
  expect(qb.deleteFrom('Students').toQueryString({ withDefaults: true })).toBe('where=&populate=0')
})
