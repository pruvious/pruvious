import { describe, expect, it } from 'vitest'
import { QueryStringParams } from '../src/runtime/utils/dashboard/query-string-params'

describe('query string params', () => {
  it('stringifies select', () => {
    expect(new QueryStringParams().select('foo').toString()).toBe('select=foo')
    expect(new QueryStringParams().select('foo,bar').toString()).toBe('select=foo,bar')
    expect(new QueryStringParams().select(['foo', 'bar']).toString()).toBe('select=foo,bar')
    expect(new QueryStringParams().select(['foo,bar']).toString()).toBe('select=foo,bar')
    expect(new QueryStringParams().select('').toString()).toBe('select=')
  })

  it('stringifies where', () => {
    expect(new QueryStringParams().where({ foo: 'bar' }).toString()).toBe('where=foo[=][bar]')
    expect(new QueryStringParams().where({ foo: { $eq: 'bar' } }).toString()).toBe('where=foo[=][bar]')
    expect(new QueryStringParams().where({ foo: { $ne: 'bar' } }).toString()).toBe('where=foo[!=][bar]')
    expect(new QueryStringParams().where({ foo: { $gt: 'bar' } }).toString()).toBe('where=foo[>][bar]')
    expect(new QueryStringParams().where({ foo: { $gte: 'bar' } }).toString()).toBe('where=foo[>=][bar]')
    expect(new QueryStringParams().where({ foo: { $lt: 'bar' } }).toString()).toBe('where=foo[<][bar]')
    expect(new QueryStringParams().where({ foo: { $lte: 'bar' } }).toString()).toBe('where=foo[<=][bar]')
    expect(new QueryStringParams().where({ foo: { $between: [1, 2] } }).toString()).toBe('where=foo[between][1,2]')
    expect(new QueryStringParams().where({ foo: { $notBetween: [1, 2] } }).toString()).toBe(
      'where=foo[notbetween][1,2]',
    )
    expect(new QueryStringParams().where({ foo: { $in: ['bar', 'baz'] } }).toString()).toBe('where=foo[in][bar,baz]')
    expect(new QueryStringParams().where({ foo: { $notIn: ['bar', 'baz'] } }).toString()).toBe(
      'where=foo[notin][bar,baz]',
    )
    expect(new QueryStringParams().where({ foo: { $like: 'bar%' } }).toString()).toBe('where=foo[like][bar%25]')
    expect(new QueryStringParams().where({ foo: { $notLike: 'bar' } }).toString()).toBe('where=foo[notlike][bar]')
    expect(new QueryStringParams().where({ foo: { $iLike: 'bar' } }).toString()).toBe('where=foo[ilike][bar]')
    expect(new QueryStringParams().where({ foo: { $notILike: 'bar' } }).toString()).toBe('where=foo[notilike][bar]')
    expect(new QueryStringParams().where({ foo: { $eq: 'bar' }, baz: { $gt: 0 } }).toString()).toBe(
      'where=foo[=][bar],baz[>][0]',
    )
    expect(new QueryStringParams().where({ $and: [{ foo: 'bar' }, { baz: { $gt: 0 } }] }).toString()).toBe(
      'where=foo[=][bar],baz[>][0]',
    )
    expect(new QueryStringParams().where({ $or: [{ baz: { $gt: 0 } }, { baz: { $eq: null } }] }).toString()).toBe(
      'where=some:[baz[>][0],baz[=][null]]',
    )
    expect(
      new QueryStringParams().where({ foo: 'bar', $or: [{ baz: { $gt: 0 } }, { baz: { $eq: null } }] }).toString(),
    ).toBe('where=foo[=][bar],some:[baz[>][0],baz[=][null]]')
  })

  it('stringifies search', () => {
    expect(new QueryStringParams().search('foo').toString()).toBe('search=foo')
    expect(new QueryStringParams().search('foo,bar').toString()).toBe('search=foo,bar')
    expect(new QueryStringParams().search(['foo', 'bar']).toString()).toBe('search=foo%20bar')
    expect(new QueryStringParams().search(['foo bar']).toString()).toBe('search=foo%20bar')
    expect(new QueryStringParams().search('').toString()).toBe('search=')
  })

  it('stringifies order', () => {
    expect(new QueryStringParams().order('foo').toString()).toBe('order=foo')
    expect(new QueryStringParams().order('foo,bar:desc').toString()).toBe('order=foo,bar:desc')
    expect(new QueryStringParams().order(['foo:asc', 'bar']).toString()).toBe('order=foo:asc,bar')
    expect(new QueryStringParams().order(['foo,bar']).toString()).toBe('order=foo,bar')
    expect(new QueryStringParams().order('').toString()).toBe('order=')
  })

  it('stringifies page', () => {
    expect(new QueryStringParams().page(1337).toString()).toBe('page=1337')
  })

  it('stringifies per page', () => {
    expect(new QueryStringParams().perPage(1337).toString()).toBe('perPage=1337')
  })

  it('parses select', () => {
    expect(new QueryStringParams().fromString('select=foo').selectOption.value).toEqual(['foo'])
    expect(new QueryStringParams().fromString('select=foo,bar').selectOption.value).toEqual(['foo', 'bar'])
  })

  it('parses where', () => {
    expect(new QueryStringParams().fromString('where=foo[=][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $eq: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[!=][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $ne: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[>][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $gt: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[>=][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $gte: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[<][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $lt: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[<=][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $lte: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[between][1,2]').whereOption.value).toEqual({
      $and: [{ foo: { $between: ['1', '2'] } }],
    })
    expect(new QueryStringParams().fromString('where=foo[notbetween][1,2]').whereOption.value).toEqual({
      $and: [{ foo: { $notBetween: ['1', '2'] } }],
    })
    expect(new QueryStringParams().fromString('where=foo[in][bar,baz]').whereOption.value).toEqual({
      $and: [{ foo: { $in: ['bar', 'baz'] } }],
    })
    expect(new QueryStringParams().fromString('where=foo[notin][bar,baz]').whereOption.value).toEqual({
      $and: [{ foo: { $notIn: ['bar', 'baz'] } }],
    })
    expect(new QueryStringParams().fromString('where=foo[like][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $like: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[notlike][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $notLike: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[ilike][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $iLike: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[notilike][bar]').whereOption.value).toEqual({
      $and: [{ foo: { $notILike: 'bar' } }],
    })
    expect(new QueryStringParams().fromString('where=foo[=][bar],baz[>][0]').whereOption.value).toEqual({
      $and: [{ foo: { $eq: 'bar' } }, { baz: { $gt: '0' } }],
    })
    expect(new QueryStringParams().fromString('where=[foo[=][bar],baz[>][0]]').whereOption.value).toEqual({
      $and: [{ $and: [{ foo: { $eq: 'bar' } }, { baz: { $gt: '0' } }] }],
    })
    expect(new QueryStringParams().fromString('where=some:[baz[>][0],baz[=][null]]').whereOption.value).toEqual({
      $and: [{ $or: [{ baz: { $gt: '0' } }, { baz: { $eq: null } }] }],
    })
    expect(
      new QueryStringParams().fromString('where=foo[=][bar],some:[baz[>][0],baz[=][null]]').whereOption.value,
    ).toEqual({
      $and: [{ foo: { $eq: 'bar' } }, { $or: [{ baz: { $gt: '0' } }, { baz: { $eq: null } }] }],
    })
  })

  it('parses search', () => {
    expect(new QueryStringParams().fromString('search=foo').searchOption.value).toEqual(['foo'])
    expect(new QueryStringParams().fromString('search=foo,bar').searchOption.value).toEqual(['foo', 'bar'])
  })

  it('parses order', () => {
    expect(new QueryStringParams().fromString('order=foo').orderOption.value).toEqual(['foo'])
    expect(new QueryStringParams().fromString('order=foo,bar:desc').orderOption.value).toEqual(['foo', 'bar:desc'])
  })

  it('parses page', () => {
    expect(new QueryStringParams().fromString('page=1337').pageOption.value).toEqual(1337)
  })

  it('parses per page', () => {
    expect(new QueryStringParams().fromString('perPage=1337').perPageOption.value).toEqual(1337)
  })
})
