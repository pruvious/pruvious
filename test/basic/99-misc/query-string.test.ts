import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'
import type { QueryStringParams } from '../../../src/runtime/collections/query-string'

describe('query string (multi-entry collections)', () => {
  const api = '/api/query-string-multi'
  const c = (query?: Record<string, any>) => $fetch(api, { query, method: 'post' })
  const r = (query?: Record<string, any>) => $fetch(api, { query, method: 'get' })
  const u = (query?: Record<string, any>) => $fetch(api, { query, method: 'patch' })
  const d = (query?: Record<string, any>) => $fetch(api, { query, method: 'delete' })
  const f = (params?: Partial<QueryStringParams<any>>, errors = 0) => ({
    params: {
      group: [],
      limit: undefined,
      offset: undefined,
      order: [],
      populate: false,
      select: ['id', 'language', 'translations', 'name', 'isActive', 'price'],
      where: { 'Symbol(and)': [] },
      search: {},
      ...(params ?? {}),
    },
    errors: Array(errors).fill(expect.any(String)),
  })

  it('create: parses empty query string parameters', async () => expect(await c({})).toEqual(f()))
  it('read: parses empty query string parameters', async () => expect(await r({})).toEqual(f()))
  it('update: parses empty query string parameters', async () => expect(await u({})).toEqual(f()))
  it('delete: parses empty query string parameters', async () => expect(await d({})).toEqual(f()))

  /*
  |--------------------------------------------------------------------------
  | select
  |--------------------------------------------------------------------------
  |
  */
  it('create: parses select parameter', async () => {
    expect(await c({ select: 'id' })).toEqual(f({ select: ['id'] } as any))
    expect(await c({ select: '' })).toEqual(f({}, 1))
    expect(await c({ select: [] })).toEqual(f({}))
    expect(await c({ select: [''] })).toEqual(f({}, 1))
    expect(await c({ select: ' ' })).toEqual(f({}, 1))
    expect(await c({ select: [' '] })).toEqual(f({}, 1))
    expect(await c({ select: 'foo' })).toEqual(f({ select: ['id'] } as any, 1))
    expect(await c({ select: ['id', 'name'] })).toEqual(f({ select: ['id', 'name'] } as any))
    expect(await c({ select: ['name ', ' name', 'FOO', '', ' '] })).toEqual(f({ select: ['name'] } as any, 1))
    expect(await c({ select: 'id,name' })).toEqual(f({ select: ['id', 'name'] } as any))
    expect(await c({ select: 'id,, name ' })).toEqual(f({ select: ['id', 'name'] } as any))
    expect(await c({ select: '*' })).toEqual(f({}))
    expect(await c({ select: '*, ,,' })).toEqual(f({}))
    expect(await c({ select: '*,name' })).toEqual(f({}))
    expect(await c({ select: '*,foo' })).toEqual(f({}, 1))
    expect(await c({ select: ['*'] })).toEqual(f({}))
    expect(await c({ select: ['*', 'name'] })).toEqual(f({}))
    expect(await c({ select: ['*', 'foo'] })).toEqual(f({}, 1))
    expect(await c({ select: [true, 1, undefined, null, {}, []] })).toEqual(f({ select: ['id'] } as any, 6))
    expect(await c({ select: 1 })).toEqual(f({ select: ['id'] } as any, 1))
    expect(await c({ select: null })).toEqual(f({}, 1))
    expect(await c({ select: undefined })).toEqual(f({}))
  })

  it('read: parses select parameter', async () => {
    expect(await r({ select: 'id' })).toEqual(f({ select: ['id'] } as any))
  })

  it('update: parses select parameter', async () => {
    expect(await u({ select: 'id' })).toEqual(f({ select: ['id'] } as any))
  })

  it('delete: parses select parameter', async () => {
    expect(await d({ select: 'id' })).toEqual(f({ select: ['id'] } as any))
  })

  /*
  |--------------------------------------------------------------------------
  | where
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores where parameter', async () => {
    expect(await c({ where: 'id[=][1]' })).toEqual(f({}))
  })

  it('read: parses where parameter', async () => {
    expect(await r({ where: 'id[=][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(eq)': 1 } }] } }))
    expect(await r({ where: 'id[eq][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(eq)': 1 } }] } }))
    expect(await d({ where: 'isActive[eq][true]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ isActive: { 'Symbol(eq)': true } }] } }),
    )
    expect(await r({ where: 'id[>][1],name[gt][a]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ id: { 'Symbol(gt)': 1 } }, { name: { 'Symbol(gt)': 'a' } }] } }),
    )
    expect(await r({ where: '[id[>][1],name[gt][a]]' })).toEqual(
      f({
        where: { 'Symbol(and)': [{ 'Symbol(and)': [{ id: { 'Symbol(gt)': 1 } }, { name: { 'Symbol(gt)': 'a' } }] }] },
      }),
    )
    expect(await r({ where: 'every:[id[>][1],name[gt][a]]' })).toEqual(
      f({
        where: { 'Symbol(and)': [{ 'Symbol(and)': [{ id: { 'Symbol(gt)': 1 } }, { name: { 'Symbol(gt)': 'a' } }] }] },
      }),
    )
    expect(await r({ where: 'some:[id[>][1],name[gt][a]]' })).toEqual(
      f({
        where: { 'Symbol(and)': [{ 'Symbol(or)': [{ id: { 'Symbol(gt)': 1 } }, { name: { 'Symbol(gt)': 'a' } }] }] },
      }),
    )
    expect(await r({ where: 'id[=][null],some:[name[like][%foo%],isActive[!=][false]]' })).toEqual(
      f({
        where: {
          'Symbol(and)': [
            { id: { 'Symbol(eq)': null } },
            { 'Symbol(or)': [{ name: { 'Symbol(like)': '%foo%' } }, { isActive: { 'Symbol(ne)': false } }] },
          ],
        },
      }),
    )
    expect(
      await r({ where: 'id[>][1],some:[name[like][\\[foo\\]],every:[isActive[=][1],isActive[!=][null]]]' }),
    ).toEqual(
      f({
        where: {
          'Symbol(and)': [
            { id: { 'Symbol(gt)': 1 } },
            {
              'Symbol(or)': [
                { name: { 'Symbol(like)': '[foo]' } },
                { 'Symbol(and)': [{ isActive: { 'Symbol(eq)': true } }, { isActive: { 'Symbol(ne)': null } }] },
              ],
            },
          ],
        },
      }),
    )
  })

  it('update: parses where parameter', async () => {
    expect(await u({ where: 'id[eq][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(eq)': 1 } }] } }))
    expect(await u({ where: 'id[EQ][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(eq)': 1 } }] } }))
    expect(await u({ where: 'id[=][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(eq)': 1 } }] } }))
    expect(await u({ where: 'id[ne][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(ne)': 1 } }] } }))
    expect(await u({ where: 'id[!=][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(ne)': 1 } }] } }))
    expect(await u({ where: 'id[gte][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(gte)': 1 } }] } }))
    expect(await u({ where: 'id[>=][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(gte)': 1 } }] } }))
    expect(await u({ where: 'id[lt][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(lt)': 1 } }] } }))
    expect(await u({ where: 'id[<][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(lt)': 1 } }] } }))
    expect(await u({ where: 'id[lte][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(lte)': 1 } }] } }))
    expect(await u({ where: 'id[<=][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(lte)': 1 } }] } }))
    expect(await u({ where: 'id[<=][1]' })).toEqual(f({ where: { 'Symbol(and)': [{ id: { 'Symbol(lte)': 1 } }] } }))
    expect(await u({ where: 'id[between][1,2]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ id: { 'Symbol(between)': [1, 2] } }] } }),
    )
    expect(await u({ where: 'id[notBetween][1,2]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ id: { 'Symbol(notBetween)': [1, 2] } }] } }),
    )
    expect(await u({ where: 'id[in][1,2]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ id: { 'Symbol(in)': [1, 2] } }] } }),
    )
    expect(await u({ where: 'id[notIn][1,2]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ id: { 'Symbol(notIn)': [1, 2] } }] } }),
    )
    expect(await u({ where: 'name[like][%foo%]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ name: { 'Symbol(like)': '%foo%' } }] } }),
    )
    expect(await u({ where: 'name[notLike][%foo%]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ name: { 'Symbol(notLike)': '%foo%' } }] } }),
    )
    expect(await u({ where: 'name[iLike][%foo%]' })).toEqual(
      process.env.NUXT_PRUVIOUS_DATABASE?.startsWith('postgresql:')
        ? f({ where: { 'Symbol(and)': [{ name: { 'Symbol(iLike)': '%foo%' } }] } })
        : f({ where: { 'Symbol(and)': [{ name: { 'Symbol(like)': '%foo%' } }] } }),
    )
    expect(await u({ where: 'name[notILike][%foo%]' })).toEqual(
      process.env.NUXT_PRUVIOUS_DATABASE?.startsWith('postgresql:')
        ? f({ where: { 'Symbol(and)': [{ name: { 'Symbol(notILike)': '%foo%' } }] } })
        : f({ where: { 'Symbol(and)': [{ name: { 'Symbol(notLike)': '%foo%' } }] } }),
    )
    expect(await d({ where: '[]' })).toEqual(f({ where: { 'Symbol(and)': [{ 'Symbol(and)': [] }] } }))
  })

  it('delete: parses where parameter', async () => {
    expect(await d({ where: 'id[eq][foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[equal][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[between][1,2,3]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[between][1,foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[notBetween][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[notBetween][1,2,3]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[notBetween][1,foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[in][1,foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[notIn][1,foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[like][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[notLike][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[iLike][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[notILike][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'foo[=][1]' })).toEqual(f({}, 1))
    expect(await d({ where: 'foo' })).toEqual(f({}, 1))
    expect(await d({ where: '' })).toEqual(f({}, 1))
    expect(await d({ where: ['id'] })).toEqual(f({}, 1))
    expect(await d({ where: '[id,name]' })).toEqual(f({ where: { 'Symbol(and)': [{ 'Symbol(and)': [] }] } }, 1))
    expect(await d({ where: 'id,name' })).toEqual(f({}, 1))
    expect(await d({ where: 'isActive[=][foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'price[=][foo]' })).toEqual(f({}, 1))
    expect(await d({ where: 'id[eq][1],foo[=][bar]' })).toEqual(
      f({ where: { 'Symbol(and)': [{ id: { 'Symbol(eq)': 1 } }] } }, 1),
    )
  })

  /*
  |--------------------------------------------------------------------------
  | search
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores search parameter', async () => {
    expect(await c({ search: 'foo' })).toEqual(f({}))
  })

  it('read: parses search parameter', async () => {
    expect(await r({ search: 'foo' })).toEqual(f({ search: { default: ['foo'] } }))
    expect(await r({ search: ' foo  bar ' })).toEqual(f({ search: { default: ['foo', 'bar'] } }))
    expect(await r({ search: ['foo', 'BAR'] })).toEqual(f({ search: { default: ['foo', 'bar'] } }))
    expect(await r({ 'search:default': 'foo' })).toEqual(f({ search: { default: ['foo'] } }))
    expect(await r({ 'search:test': 'foo' })).toEqual(f({ search: { test: ['foo'] } }))
    expect(await r({ 'search': 'foo', 'search:test': 'bar' })).toEqual(
      f({ search: { default: ['foo'], test: ['bar'] } }),
    )
    expect(await r({ 'search:foo': 'bar' })).toEqual(f({}, 1))
    expect(await r({ 'search:': 'bar' })).toEqual(f({}, 1))
    expect(await r({ search: '' })).toEqual(f({ search: { default: [] } }))
    expect(await r({ search: 1 })).toEqual(f({ search: { default: ['1'] } }))
    expect(await r({ search: NaN })).toEqual(f({ search: { default: ['nan'] } }))
    expect(await r({ search: true })).toEqual(f({ search: { default: ['true'] } }))
    expect(await r({ search: null })).toEqual(f({ search: { default: [] } }))
    expect(await r({ search: undefined })).toEqual(f({}))
    expect(await r({ search: {} })).toEqual(f({ search: { default: ['{}'] } }))
  })

  it('update: ignores search parameter', async () => {
    expect(await u({ search: 'foo' })).toEqual(f({}))
  })

  it('delete: ignores search parameter', async () => {
    expect(await d({ search: 'foo' })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | order
  |--------------------------------------------------------------------------
  |
  */
  it('create: parses order parameter', async () => {
    expect(await c({ order: 'name' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
  })

  it('read: parses order parameter', async () => {
    expect(await r({ order: 'name' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:a' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:asc' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:ASC' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:ascending' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:u' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:up' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name:d' })).toEqual(f({ order: [['name', 'DESC NULLS LAST']] }))
    expect(await r({ order: 'name:desc' })).toEqual(f({ order: [['name', 'DESC NULLS LAST']] }))
    expect(await r({ order: 'name:DESC' })).toEqual(f({ order: [['name', 'DESC NULLS LAST']] }))
    expect(await r({ order: 'name:descending' })).toEqual(f({ order: [['name', 'DESC NULLS LAST']] }))
    expect(await r({ order: 'name:down' })).toEqual(f({ order: [['name', 'DESC NULLS LAST']] }))
    expect(await r({ order: ['name'] })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
    expect(await r({ order: 'name,price' })).toEqual(
      f({
        order: [
          ['name', 'ASC NULLS LAST'],
          ['price', 'ASC NULLS LAST'],
        ],
      }),
    )
    expect(await r({ order: ['name', 'price'] })).toEqual(
      f({
        order: [
          ['name', 'ASC NULLS LAST'],
          ['price', 'ASC NULLS LAST'],
        ],
      }),
    )
    expect(await r({ order: 'name, price:desc ,,' })).toEqual(
      f({
        order: [
          ['name', 'ASC NULLS LAST'],
          ['price', 'DESC NULLS LAST'],
        ],
      }),
    )
    expect(await r({ order: '*' })).toEqual(f({}, 1))
    expect(await r({ order: 'foo' })).toEqual(f({}, 1))
    expect(await r({ order: 'foo,bar' })).toEqual(f({}, 2))
    expect(await r({ order: 'foo:random' })).toEqual(f({}, 1))
    expect(await r({ order: 'name:random' })).toEqual(f({}, 1))
    expect(await r({ order: ':default' })).toEqual(f({ order: [[':default', 'ASC NULLS LAST']] }))
    expect(await r({ order: ':default:asc' })).toEqual(f({ order: [[':default', 'ASC NULLS LAST']] }))
    expect(await r({ order: ':default:desc' })).toEqual(f({ order: [[':default', 'DESC NULLS LAST']] }))
    expect(await r({ order: ':default:foo' })).toEqual(f({}, 1))
    expect(await r({ order: ':search' })).toEqual(f({}, 1))
    expect(await r({ order: ':search:asc' })).toEqual(f({}, 1))
    expect(await r({ order: ':test' })).toEqual(f({ order: [[':test', 'ASC NULLS LAST']] }))
    expect(await r({ order: ':test:asc' })).toEqual(f({ order: [[':test', 'ASC NULLS LAST']] }))
    expect(await r({ order: '::asc' })).toEqual(f({}, 1))
  })

  it('update: parses order parameter', async () => {
    expect(await u({ order: 'name' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
  })

  it('delete: parses order parameter', async () => {
    expect(await d({ order: 'name' })).toEqual(f({ order: [['name', 'ASC NULLS LAST']] }))
  })

  /*
  |--------------------------------------------------------------------------
  | group
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores group parameter', async () => {
    expect(await c({ group: 1 })).toEqual(f({}))
  })

  it('read: parses group parameter', async () => {
    expect(await r({ group: 'name' })).toEqual(f({ group: ['name'] }))
    expect(await r({ group: 'name,price' })).toEqual(f({ group: ['name', 'price'] }))
    expect(await r({ group: ['name'] })).toEqual(f({ group: ['name'] }))
    expect(await r({ group: ['name', 'price'] })).toEqual(f({ group: ['name', 'price'] }))
    expect(await r({ group: 'foo' })).toEqual(f({}, 1))
    expect(await r({ group: '' })).toEqual(f({}))
    expect(await r({ group: '*' })).toEqual(f({}, 1))
    expect(await r({ group: null })).toEqual(f({}))
  })

  it('update: ignores group parameter', async () => {
    expect(await u({ group: 1 })).toEqual(f({}))
  })

  it('delete: ignores group parameter', async () => {
    expect(await d({ group: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | offset
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores offset parameter', async () => {
    expect(await c({ offset: 1 })).toEqual(f({}))
  })

  it('read: parses offset parameter', async () => {
    expect(await r({ offset: 1 })).toEqual(f({ offset: 1 }))
    expect(await r({ offset: 0 })).toEqual(f({ offset: 0 }))
    expect(await r({ offset: -1 })).toEqual(f({}, 1))
    expect(await r({ offset: 1.5 })).toEqual(f({}, 1))
    expect(await r({ offset: '1' })).toEqual(f({ offset: 1 }))
    expect(await r({ offset: null })).toEqual(f({}, 1))
    expect(await r({ offset: NaN })).toEqual(f({}, 1))
    expect(await r({ offset: [1] })).toEqual(f({ offset: 1 }))
    expect(await r({ offset: [1, 1] })).toEqual(f({}, 1))
    expect(await r({ offset: '' })).toEqual(f({}, 1))
  })

  it('update: ignores offset parameter', async () => {
    expect(await u({ offset: 1 })).toEqual(f({}))
  })

  it('delete: ignores offset parameter', async () => {
    expect(await d({ offset: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | limit
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores limit parameter', async () => {
    expect(await c({ limit: 1 })).toEqual(f({}))
  })

  it('read: parses limit parameter', async () => {
    expect(await r({ limit: 1 })).toEqual(f({ limit: 1 }))
    expect(await r({ limit: 0 })).toEqual(f({ limit: 0 }))
    expect(await r({ limit: -1 })).toEqual(f({}, 1))
    expect(await r({ limit: 1.5 })).toEqual(f({}, 1))
    expect(await r({ limit: '1' })).toEqual(f({ limit: 1 }))
    expect(await r({ limit: null })).toEqual(f({}, 1))
    expect(await r({ limit: NaN })).toEqual(f({}, 1))
    expect(await r({ limit: [1] })).toEqual(f({ limit: 1 }))
    expect(await r({ limit: [1, 1] })).toEqual(f({}, 1))
    expect(await r({ limit: '' })).toEqual(f({}, 1))
  })

  it('update: ignores limit parameter', async () => {
    expect(await u({ limit: 1 })).toEqual(f({}))
  })

  it('delete: ignores limit parameter', async () => {
    expect(await d({ limit: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | populate
  |--------------------------------------------------------------------------
  |
  */
  it('create: parses populate parameter', async () => {
    expect(await c({ populate: 'yes' })).toEqual(f({ populate: true }))
    expect(await c({ populate: 'no' })).toEqual(f({ populate: false }))
  })

  it('read: parses populate parameter', async () => {
    expect(await r({ populate: 'yes' })).toEqual(f({ populate: true }))
    expect(await r({ populate: 'no' })).toEqual(f({ populate: false }))
  })

  it('update: parses populate parameter', async () => {
    expect(await u({ populate: 'yes' })).toEqual(f({ populate: true }))
    expect(await u({ populate: 'no' })).toEqual(f({ populate: false }))
  })

  it('delete: parses populate parameter', async () => {
    expect(await d({ populate: 'yes' })).toEqual(f({ populate: true }))
    expect(await d({ populate: 'no' })).toEqual(f({ populate: false }))
  })

  /*
  |--------------------------------------------------------------------------
  | pagination
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores page and perPage parameter', async () => {
    expect(await c({ page: 1, perPage: 1 })).toEqual(f({}))
  })

  it('read: parses page and perPage parameter', async () => {
    expect(await r({ page: 1, perPage: 1 })).toEqual(f({ offset: 0, limit: 1 }))
    expect(await r({ page: '1', perPage: '1' })).toEqual(f({ offset: 0, limit: 1 }))
    expect(await r({ page: [1], perPage: [1] })).toEqual(f({ offset: 0, limit: 1 }))
    expect(await r({ page: 2, perPage: 10 })).toEqual(f({ offset: 10, limit: 10 }))
    expect(await r({ page: 3, perPage: 3 })).toEqual(f({ offset: 6, limit: 3 }))
    expect(await r({ page: 0, perPage: 1 })).toEqual(f({ limit: 1 }, 1))
    expect(await r({ page: 0, perPage: 0 })).toEqual(f({}, 2))
    expect(await r({ page: 1 })).toEqual(f({}, 1))
    expect(await r({ perPage: 1 })).toEqual(f({ limit: 1 }))
    expect(await r({ page: 2, offset: 1 })).toEqual(f({ offset: 1 }, 1))
    expect(await r({ perPage: 2, limit: 1 })).toEqual(f({ limit: 1 }, 1))
    expect(await r({ perPage: null })).toEqual(f({}, 1))
    expect(await r({ perPage: NaN })).toEqual(f({}, 1))
    expect(await r({ perPage: [1, 1] })).toEqual(f({}, 1))
    expect(await r({ perPage: '' })).toEqual(f({}, 1))
  })

  it('update: ignores page and perPage parameter', async () => {
    expect(await u({ page: 1, perPage: 1 })).toEqual(f({}))
  })

  it('delete: ignores page and perPage parameter', async () => {
    expect(await d({ page: 1, perPage: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | language
  |--------------------------------------------------------------------------
  |
  */
  it('create: ignores language parameter', async () => {
    expect(await c({ language: 1 })).toEqual(f({}))
  })

  it('read: ignores language parameter', async () => {
    expect(await r({ language: 1 })).toEqual(f({}))
  })

  it('update: ignores language parameter', async () => {
    expect(await u({ language: 1 })).toEqual(f({}))
  })

  it('delete: ignores language parameter', async () => {
    expect(await d({ language: 1 })).toEqual(f({}))
  })
})

describe('query string (single-entry collections)', async () => {
  const api = '/api/query-string-single'
  const r = (query?: Record<string, any>) => $fetch(api, { query, method: 'get' })
  const u = (query?: Record<string, any>) => $fetch(api, { query, method: 'patch' })
  const f = (params?: Partial<QueryStringParams<any>>, errors = 0) => ({
    params: {
      language: 'en',
      populate: false,
      select: ['id', 'language', 'normal', 'required', 'immutable', 'populated'],
      ...(params ?? {}),
    },
    errors: Array(errors).fill(expect.any(String)),
  })

  it('read: parses empty query string parameters', async () => expect(await r({})).toEqual(f()))
  it('update: parses empty query string parameters', async () => expect(await u({})).toEqual(f()))

  /*
  |--------------------------------------------------------------------------
  | select
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses select parameter', async () => {
    expect(await r({ select: 'id' })).toEqual(f({ select: ['id'] } as any))
    expect(await r({ select: '' })).toEqual(f({}, 1))
    expect(await r({ select: [] })).toEqual(f({}))
    expect(await r({ select: [''] })).toEqual(f({}, 1))
    expect(await r({ select: ' ' })).toEqual(f({}, 1))
    expect(await r({ select: [' '] })).toEqual(f({}, 1))
    expect(await r({ select: 'foo' })).toEqual(f({ select: ['id'] } as any, 1))
    expect(await r({ select: ['id', 'normal'] })).toEqual(f({ select: ['id', 'normal'] } as any))
    expect(await r({ select: ['normal ', ' normal', 'FOO', '', ' '] })).toEqual(f({ select: ['normal'] } as any, 1))
    expect(await r({ select: 'id,normal' })).toEqual(f({ select: ['id', 'normal'] } as any))
    expect(await r({ select: 'id,, normal ' })).toEqual(f({ select: ['id', 'normal'] } as any))
    expect(await r({ select: '*' })).toEqual(f({}))
    expect(await r({ select: '*, ,,' })).toEqual(f({}))
    expect(await r({ select: '*,normal' })).toEqual(f({}))
    expect(await r({ select: '*,foo' })).toEqual(f({}, 1))
    expect(await r({ select: ['*'] })).toEqual(f({}))
    expect(await r({ select: ['*', 'normal'] })).toEqual(f({}))
    expect(await r({ select: ['*', 'foo'] })).toEqual(f({}, 1))
    expect(await r({ select: [true, 1, undefined, null, {}, []] })).toEqual(f({ select: ['id'] } as any, 6))
    expect(await r({ select: 1 })).toEqual(f({ select: ['id'] } as any, 1))
    expect(await r({ select: null })).toEqual(f({}, 1))
    expect(await r({ select: undefined })).toEqual(f({}))
  })

  it('update: parses select parameter', async () => {
    expect(await u({ select: 'id' })).toEqual(f({ select: ['id'] } as any))
  })

  /*
  |--------------------------------------------------------------------------
  | language
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses language parameter', async () => {
    expect(await r({ language: 'en' })).toEqual(f({ language: 'en' }))
    expect(await r({ language: 'de' })).toEqual(f({ language: 'de' }))
    expect(await r({ language: 'foo' })).toEqual(f({}, 1))
  })

  it('update: parses language parameter', async () => {
    expect(await u({ language: 'en' })).toEqual(f({ language: 'en' }))
    expect(await u({ language: 'de' })).toEqual(f({ language: 'de' }))
  })

  /*
  |--------------------------------------------------------------------------
  | populate
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses populate parameter', async () => {
    expect(await r({ populate: 'yes' })).toEqual(f({ populate: true }))
    expect(await r({ populate: 'no' })).toEqual(f({ populate: false }))
  })

  it('update: parses populate parameter', async () => {
    expect(await u({ populate: 'yes' })).toEqual(f({ populate: true }))
    expect(await u({ populate: 'no' })).toEqual(f({ populate: false }))
  })

  /*
  |--------------------------------------------------------------------------
  | where
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses where parameter', async () => {
    expect(await r({ where: 1 })).toEqual(f({}))
  })

  it('update: ignores where parameter', async () => {
    expect(await u({ where: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | search
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses search parameter', async () => {
    expect(await r({ search: 1 })).toEqual(f({}))
  })

  it('update: ignores search parameter', async () => {
    expect(await u({ search: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | order
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses order parameter', async () => {
    expect(await r({ order: 1 })).toEqual(f({}))
  })

  it('update: ignores order parameter', async () => {
    expect(await u({ order: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | group
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses group parameter', async () => {
    expect(await r({ group: 1 })).toEqual(f({}))
  })

  it('update: ignores group parameter', async () => {
    expect(await u({ group: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | offset
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses offset parameter', async () => {
    expect(await r({ offset: 1 })).toEqual(f({}))
  })

  it('update: ignores offset parameter', async () => {
    expect(await u({ offset: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | limit
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses limit parameter', async () => {
    expect(await r({ limit: 1 })).toEqual(f({}))
  })

  it('update: ignores limit parameter', async () => {
    expect(await u({ limit: 1 })).toEqual(f({}))
  })

  /*
  |--------------------------------------------------------------------------
  | pagination
  |--------------------------------------------------------------------------
  |
  */
  it('read: parses pagination parameter', async () => {
    expect(await r({ pagination: 1 })).toEqual(f({}))
  })

  it('update: ignores pagination parameter', async () => {
    expect(await u({ pagination: 1 })).toEqual(f({}))
  })
})
