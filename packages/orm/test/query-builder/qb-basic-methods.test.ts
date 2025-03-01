import { sleep } from '@pruvious/utils'
import { expect, test } from 'vitest'
import { Database, QueryBuilderPrepareCallback } from '../../src'
import { collections } from '../test-collections'
import { initAllDrivers, qbe, qbo } from '../utils'

test('basic query builder methods', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_basic_methods')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

    expect(await qb.selectFrom('Students').all()).toEqual(qbo([]))

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Harry', middleName: '_a', lastName: 'Potter' }])
        .run(),
    ).toEqual(qbo(1))

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Hermione', middleName: null, lastName: 'Granger', foo: 'bar' }])
        .returning(['firstName', 'middleName', 'lastName'])
        .clone()
        .run(),
    ).toEqual(qbo([{ firstName: 'Hermione', middleName: null, lastName: 'Granger' }]))

    expect(
      await qb
        .insertInto('Students')
        .values([
          { firstName: 'Ron', middleName: '_c', lastName: 'Weasley' },
          { id: 99, foo: 'bar', firstName: 'Foo', middleName: 'Bar', lastName: 'Baz' },
        ])
        .returning(['id', 'firstName', 'middleName', 'lastName'])
        .run(),
    ).toEqual(
      qbo([
        { id: 3, firstName: 'Ron', middleName: '_c', lastName: 'Weasley' },
        { id: 4, firstName: 'Foo', middleName: 'Bar', lastName: 'Baz' },
      ]),
    )

    expect(await qb.selectFrom('Students').all()).toEqual(
      qbo([
        { id: 1, firstName: 'Harry', middleName: '_a', lastName: 'Potter', house: null, prefect: false, clubs: [] },
        { id: 2, firstName: 'Hermione', middleName: null, lastName: 'Granger', house: null, prefect: false, clubs: [] },
        { id: 3, firstName: 'Ron', middleName: '_c', lastName: 'Weasley', house: null, prefect: false, clubs: [] },
        { id: 4, firstName: 'Foo', middleName: 'Bar', lastName: 'Baz', house: null, prefect: false, clubs: [] },
      ]),
    )

    expect(
      await qb
        .update('Students')
        .set({ firstName: 'Foo 2', middleName: 'Bar 2', lastName: 'Baz 2' })
        .where('firstName', '=', 'Foo')
        .returning(['id', 'firstName', 'middleName', 'lastName'])
        .run(),
    ).toEqual(qbo([{ id: 4, firstName: 'Foo 2', middleName: 'Bar 2', lastName: 'Baz 2' }]))

    expect(await qb.deleteFrom('Students').where('firstName', '=', 'Foo 2').returningAll().run()).toEqual(
      qbo([
        { id: 4, firstName: 'Foo 2', middleName: 'Bar 2', lastName: 'Baz 2', house: null, prefect: false, clubs: [] },
      ]),
    )

    expect(await qb.selectFrom('Students').select('firstName').clone().first()).toEqual(qbo({ firstName: 'Harry' }))
    expect(await qb.selectFrom('Students').select('firstName').offset(1).first()).toEqual(
      qbo({ firstName: 'Hermione' }),
    )
    expect(await qb.selectFrom('Students').select('firstName').where('firstName', 'like', 'H%').first()).toEqual(
      qbo({ firstName: 'Harry' }),
    )
    expect(await qb.selectFrom('Students').select('firstName').where('firstName', 'like', 'R%').first()).toEqual(
      qbo({ firstName: 'Ron' }),
    )
    expect(await qb.selectFrom('Students').select('firstName').where('firstName', 'like', 'A%').first()).toEqual(
      qbo(null),
    )

    expect(await qb.selectFrom('Students').select('firstName').paginate()).toEqual(
      qbo({
        records: [{ firstName: 'Harry' }, { firstName: 'Hermione' }, { firstName: 'Ron' }],
        currentPage: 1,
        lastPage: 1,
        perPage: 3,
        total: 3,
      }),
    )
    expect(await qb.selectFrom('Students').select('firstName').paged(1, 2).paginate()).toEqual(
      qbo({
        records: [{ firstName: 'Harry' }, { firstName: 'Hermione' }],
        currentPage: 1,
        lastPage: 2,
        perPage: 2,
        total: 3,
      }),
    )
    expect(await qb.selectFrom('Students').select('firstName').paged(2, 2).paginate()).toEqual(
      qbo({
        records: [{ firstName: 'Ron' }],
        currentPage: 2,
        lastPage: 2,
        perPage: 2,
        total: 3,
      }),
    )
    expect(await qb.selectFrom('Students').select('firstName').paged(3, 2).paginate()).toEqual(
      qbo({
        records: [],
        currentPage: 3,
        lastPage: 2,
        perPage: 2,
        total: 3,
      }),
    )
    expect(await qb.selectFrom('Students').select('firstName').paged(2, 1).paginate()).toEqual(
      qbo({
        records: [{ firstName: 'Hermione' }],
        currentPage: 2,
        lastPage: 3,
        perPage: 1,
        total: 3,
      }),
    )
    expect(
      await qb.selectFrom('Students').select('firstName').where('firstName', 'like', 'H%').paged(2, 1).paginate(),
    ).toEqual(
      qbo({
        records: [{ firstName: 'Hermione' }],
        currentPage: 2,
        lastPage: 2,
        perPage: 1,
        total: 2,
      }),
    )
    expect(await qb.selectFrom('Students').select('firstName').paged(1, 10).paginate()).toEqual(
      qbo({
        records: [{ firstName: 'Harry' }, { firstName: 'Hermione' }, { firstName: 'Ron' }],
        currentPage: 1,
        lastPage: 1,
        perPage: 10,
        total: 3,
      }),
    )

    expect(await qb.selectFrom('Students').count()).toEqual(qbo(3))

    expect(await qb.selectFrom('Houses').count()).toEqual(qbo(0))
    expect(await qb.selectFrom('Houses').min('points')).toEqual(qbo(null))
    expect(await qb.selectFrom('Houses').max('points')).toEqual(qbo(null))
    expect(await qb.selectFrom('Houses').sum('points')).toEqual(qbo(null))
    expect(await qb.selectFrom('Houses').avg('points')).toEqual(qbo(null))

    expect(await qb.selectFrom('Houses').min('id')).toEqual(qbo(null))
    expect(await qb.selectFrom('Houses').max('id')).toEqual(qbo(null))
    expect(await qb.selectFrom('Houses').sum('id')).toEqual(qbo(null))
    expect(await qb.selectFrom('Houses').avg('id')).toEqual(qbo(null))

    const test = await qb.selectFrom('Houses').min('points')
    test.data

    expect(
      await qb
        .insertInto('Houses')
        .values([
          { name: 'Gryffindor', founder: 'Godric Gryffindor', points: 100 },
          { name: 'Slytherin', founder: 'Salazar Slytherin', points: 50 },
          { name: 'Ravenclaw', founder: 'Rowena Ravenclaw', points: 75 },
          { name: 'Hufflepuff', founder: 'Helga Hufflepuff', points: 25 },
        ])
        .returning(['id', 'name', 'founder'])
        .run(),
    ).toEqual(
      qbo([
        { id: 1, name: 'Gryffindor', founder: 'Godric Gryffindor' },
        { id: 2, name: 'Slytherin', founder: 'Salazar Slytherin' },
        { id: 3, name: 'Ravenclaw', founder: 'Rowena Ravenclaw' },
        { id: 4, name: 'Hufflepuff', founder: 'Helga Hufflepuff' },
      ]),
    )

    expect(await qb.selectFrom('Houses').count()).toEqual(qbo(4))
    expect(await qb.selectFrom('Houses').min('points')).toEqual(qbo(25))
    expect(await qb.selectFrom('Houses').max('points')).toEqual(qbo(100))
    expect(await qb.selectFrom('Houses').sum('points')).toEqual(qbo(250))
    expect(await qb.selectFrom('Houses').avg('points')).toEqual(qbo(62.5))

    expect(await qb.selectFrom('Houses').min('id')).toEqual(qbo(1))
    expect(await qb.selectFrom('Houses').max('id')).toEqual(qbo(4))
    expect(await qb.selectFrom('Houses').sum('id')).toEqual(qbo(10))
    expect(await qb.selectFrom('Houses').avg('id')).toEqual(qbo(2.5))

    expect(
      await qb
        .selectFrom('Houses')
        .selectRaw('cast(count(*) as text) as "houses", cast(round(avg("points"), 1) as text) as "avgPoints"')
        .first(),
    ).toEqual(qbo({ houses: '4', avgPoints: '62.5' }))

    expect(
      await qb.selectFrom('Students').selectRaw('"prefect", cast(count(*) as text) as count').groupBy('prefect').all(),
    ).toEqual(qbo([{ prefect: false, count: '3' }]))

    expect(await qb.selectFrom('Students').fromQueryString('select=prefect&groupBy=prefect').all()).toEqual(
      qbo([{ prefect: false }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').orderBy('firstName').all()).toEqual(
      qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }, { firstName: 'Ron' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').orderBy('firstName', 'desc').all()).toEqual(
      qbo([{ firstName: 'Ron' }, { firstName: 'Hermione' }, { firstName: 'Harry' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&orderBy=firstName:desc').all()).toEqual(
      qbo([{ firstName: 'Ron' }, { firstName: 'Hermione' }, { firstName: 'Harry' }]),
    )

    expect(await qb.selectFrom('Students').select('middleName').orderBy('middleName').all()).toEqual(
      qbo([{ middleName: null }, { middleName: '_a' }, { middleName: '_c' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=middleName&orderBy=middleName').all()).toEqual(
      qbo([{ middleName: null }, { middleName: '_a' }, { middleName: '_c' }]),
    )

    expect(
      await qb.selectFrom('Students').select('middleName').orderBy('middleName', 'asc', 'nullsFirst').all(),
    ).toEqual(qbo([{ middleName: null }, { middleName: '_a' }, { middleName: '_c' }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=middleName&orderBy=middleName:nullsFirst').all(),
    ).toEqual(qbo([{ middleName: null }, { middleName: '_a' }, { middleName: '_c' }]))

    expect(
      await qb.selectFrom('Students').select('middleName').orderBy('middleName', 'asc', 'nullsLast').all(),
    ).toEqual(qbo([{ middleName: '_a' }, { middleName: '_c' }, { middleName: null }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=middleName&orderBy=middleName:asc:nullsLast').all(),
    ).toEqual(qbo([{ middleName: '_a' }, { middleName: '_c' }, { middleName: null }]))

    expect(
      await qb.selectFrom('Students').select('middleName').orderBy('middleName', 'desc', 'nullsAuto').all(),
    ).toEqual(qbo([{ middleName: '_c' }, { middleName: '_a' }, { middleName: null }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=middleName&orderBy=middleName:desc:nullsAuto').all(),
    ).toEqual(qbo([{ middleName: '_c' }, { middleName: '_a' }, { middleName: null }]))

    expect(
      await qb.selectFrom('Students').select('middleName').orderBy('middleName', 'desc', 'nullsFirst').all(),
    ).toEqual(qbo([{ middleName: null }, { middleName: '_c' }, { middleName: '_a' }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=middleName&orderBy=middleName:desc:nullsFirst').all(),
    ).toEqual(qbo([{ middleName: null }, { middleName: '_c' }, { middleName: '_a' }]))

    expect(
      await qb.selectFrom('Students').select('middleName').orderBy('middleName', 'desc', 'nullsLast').all(),
    ).toEqual(qbo([{ middleName: '_c' }, { middleName: '_a' }, { middleName: null }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=middleName&orderBy=middleName:desc:nullsLast').all(),
    ).toEqual(qbo([{ middleName: '_c' }, { middleName: '_a' }, { middleName: null }]))

    expect(
      await qb.selectFrom('Students').select('middleName').orderByRaw('"middleName" desc nulls first').all(),
    ).toEqual(qbo([{ middleName: null }, { middleName: '_c' }, { middleName: '_a' }]))

    expect(await qb.selectFrom('Students').select('firstName').limit(1).all()).toEqual(qbo([{ firstName: 'Harry' }]))
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&limit=1').all()).toEqual(
      qbo([{ firstName: 'Harry' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').offset(1).all()).toEqual(
      qbo([{ firstName: 'Hermione' }, { firstName: 'Ron' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&offset=1').all()).toEqual(
      qbo([{ firstName: 'Hermione' }, { firstName: 'Ron' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').paged(1, 1).all()).toEqual(qbo([{ firstName: 'Harry' }]))
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&page=1&perPage=1').all()).toEqual(
      qbo([{ firstName: 'Harry' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').paged(2, 1).all()).toEqual(
      qbo([{ firstName: 'Hermione' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&page=2&perPage=1').all()).toEqual(
      qbo([{ firstName: 'Hermione' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').paged(1, 2).all()).toEqual(
      qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&page=1&perPage=2').all()).toEqual(
      qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]),
    )

    expect(await qb.update('Students').where('firstName', '=', 'Harry').set({ house: -1 }).run()).toEqual(
      qbe({ house: 'The value must be greater than or equal to `1`' }),
    )

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Bar', lastName: 'Baz', house: 1 }])
        .returning('house')
        .populate()
        .run(),
    ).toEqual(qbo([{ house: { name: 'Gryffindor' } }]))

    expect(
      await qb
        .update('Students')
        .set({ house: 3 })
        .where('firstName', '=', 'Bar')
        .clone()
        .returning('house')
        .populate()
        .run(),
    ).toEqual(qbo([{ house: { name: 'Ravenclaw' } }]))

    expect(await qb.selectFrom('Students').select('house').where('firstName', '=', 'Bar').populate().all()).toEqual(
      qbo([{ house: { name: 'Ravenclaw' } }]),
    )

    expect(
      await qb.deleteFrom('Students').where('firstName', '=', 'Bar').returning('house').clone().populate().run(),
    ).toEqual(qbo([{ house: { name: 'Ravenclaw' } }]))

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Bar', lastName: 'Baz', house: 1 }])
        .returning('firstName')
        .injectRaw('afterReturningClause', ', "house"')
        .run(),
    ).toEqual(qbo([{ firstName: 'Bar', house: 1 }]))

    expect(
      await qb
        .selectFrom('Students')
        .select(['firstName', 'lastName'])
        .injectRaw('afterSelectClause', ', "Houses"."name" as "houseName"')
        .injectRaw('afterFromClause', 'join "Houses" on "Students"."house" = "Houses"."id"')
        .where('firstName', '=', 'Bar')
        .first(),
    ).toEqual(qbo({ firstName: 'Bar', lastName: 'Baz', houseName: 'Gryffindor' }))

    expect(
      await qb
        .update('Students')
        .injectRaw('afterSetClause', ', "house" = 2')
        .where('firstName', '=', 'Bar')
        .returning('firstName')
        .injectRaw('afterReturningClause', ', "house"')
        .populate()
        .run(),
    ).toEqual(qbo([{ firstName: 'Bar', house: { name: 'Slytherin' } }]))

    expect(
      await qb
        .deleteFrom('Students')
        .where('firstName', '=', 'Bar')
        .returning('firstName')
        .injectRaw('afterReturningClause', ', "house"')
        .run(),
    ).toEqual(qbo([{ firstName: 'Bar', house: 2 }]))

    // Runtime validation

    expect(
      await qb
        .selectFrom('Students')
        .select([] as any)
        .all(),
    ).toEqual(qbe('At least one field must be selected'))

    expect(
      await qb
        .selectFrom('Students')
        .select(['foo' as any])
        .all(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .selectFrom('Students')
        .select('foo' as any)
        .all(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(await qb.insertInto('Students').run()).toEqual(qbe('At least one row must be inserted'))

    expect(await qb.insertInto('Students').values([]).run()).toEqual(qbe('At least one row must be inserted'))

    expect(
      await qb
        .insertInto('Students')
        .values(['foo'] as any)
        .run(),
    ).toEqual(qbe('The input must be an object or an array of objects'))

    expect(
      await qb
        .insertInto('Students')
        .values('foo' as any)
        .run(),
    ).toEqual(qbe('The input must be an object or an array of objects'))

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Harry', lastName: 'Potter' }])
        .returning([] as any)
        .run(),
    ).toEqual(qbe('At least one field must be returned'))

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Harry', lastName: 'Potter' }])
        .returning(['foo'] as any)
        .run(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Harry', lastName: 'Potter' }])
        .returning('foo' as any)
        .run(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .update('Students')
        .set(undefined as any)
        .returning([] as any)
        .run(),
    ).toEqual(qbe('The input must be an object'))

    expect(
      await qb
        .update('Students')
        .set(null as any)
        .returning([] as any)
        .run(),
    ).toEqual(qbe('The input must be an object'))

    expect(
      await qb
        .update('Students')
        .set('foo' as any)
        .returning([] as any)
        .run(),
    ).toEqual(qbe('The input must be an object'))

    expect(
      await qb
        .update('Students')
        .set({ firstName: 'Harry', lastName: 'Potter' })
        .returning([] as any)
        .run(),
    ).toEqual(qbe('At least one field must be returned'))

    expect(
      await qb
        .update('Students')
        .set({ firstName: 'Harry', lastName: 'Potter' })
        .returning(['foo'] as any)
        .run(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .update('Students')
        .set({ firstName: 'Harry', lastName: 'Potter' })
        .returning('foo' as any)
        .run(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(await qb.update('Students').where('firstName', '=', 'Harry').set({ house: -1 }).run()).toEqual(
      qbe({ house: 'The value must be greater than or equal to `1`' }),
    )

    expect(
      await qb
        .deleteFrom('Students')
        .returning([] as any)
        .run(),
    ).toEqual(qbe('At least one field must be returned'))

    expect(
      await qb
        .deleteFrom('Students')
        .returning(['foo'] as any)
        .run(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .deleteFrom('Students')
        .returning('foo' as any)
        .run(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .insertInto('Houses')
        .values([{ name: 'Foo', founder: 'Bar', points: -1 }])
        .run(),
    ).toEqual(qbe([{ points: 'The value must be greater than or equal to `0`' }]))

    expect(
      await qb
        .insertInto('Houses')
        .values([{ name: 'Foo', founder: 'Bar', points: 0.5 }])
        .run(),
    ).toEqual(qbe([{ points: 'The value must be an integer' }]))

    expect(await qb.selectFrom('Houses').min('foo' as any)).toEqual(qbe('The field `foo` does not exist'))
    expect(await qb.selectFrom('Houses').max('foo' as any)).toEqual(qbe('The field `foo` does not exist'))
    expect(await qb.selectFrom('Houses').sum('foo' as any)).toEqual(qbe('The field `foo` does not exist'))
    expect(await qb.selectFrom('Houses').avg('foo' as any)).toEqual(qbe('The field `foo` does not exist'))

    expect(await qb.selectFrom('Houses').min('name' as any)).toEqual(qbe('The field `name` must be a number'))
    expect(await qb.selectFrom('Houses').max('name' as any)).toEqual(qbe('The field `name` must be a number'))
    expect(await qb.selectFrom('Houses').sum('name' as any)).toEqual(qbe('The field `name` must be a number'))
    expect(await qb.selectFrom('Houses').avg('name' as any)).toEqual(qbe('The field `name` must be a number'))

    expect(
      await qb
        .selectFrom('Houses')
        .groupBy('foo' as any)
        .all(),
    ).toEqual(qbe('The field `foo` does not exist'))

    expect(
      await qb
        .selectFrom('Houses')
        .orderBy('foo' as any)
        .all(),
    ).toEqual(qbe('The field `foo` does not exist'))
    expect(
      await qb
        .selectFrom('Houses')
        .orderBy('points', 'foo' as any)
        .all(),
    ).toEqual(qbe('Invalid order direction `foo`'))
    expect(
      await qb
        .selectFrom('Houses')
        .orderBy('points', 'asc', 'foo' as any)
        .all(),
    ).toEqual(qbe('Invalid nulls order `foo`'))

    expect(await qb.selectFrom('Houses').limit(0).all()).toEqual(
      qbe('The `limit` parameter must be a positive integer'),
    )
    expect(await qb.selectFrom('Houses').limit(1.1).all()).toEqual(
      qbe('The `limit` parameter must be a positive integer'),
    )

    expect(await qb.selectFrom('Houses').offset(1.1).all()).toEqual(qbe('The `offset` parameter must be an integer'))
    expect(await qb.selectFrom('Houses').offset(-1).all()).toEqual(
      qbe('The `offset` parameter must be greater than or equal to zero'),
    )

    expect(await qb.selectFrom('Houses').paged(0, 1).all()).toEqual(
      qbe('The `offset` parameter must be greater than or equal to zero'),
    )
    expect(await qb.selectFrom('Houses').paged(1, 0).all()).toEqual(
      qbe('The `limit` parameter must be a positive integer'),
    )
    expect(await qb.selectFrom('Houses').paged(1.1, 1).all()).toEqual(qbe('The `offset` parameter must be an integer'))
    expect(await qb.selectFrom('Houses').paged(1, 1.1).all()).toEqual(
      qbe('The `limit` parameter must be a positive integer'),
    )

    expect(await qb.deleteFrom('Houses').where('name', '=', 'Gryffindor').run()).toEqual(
      qbe('You cannot delete a Hogwarts house'),
    )

    // Validate method

    expect(await qb.insertInto('Students').values([]).validate()).toEqual(qbe('At least one row must be inserted'))
    expect(
      await qb
        .insertInto('Students')
        .values({} as any)
        .validate(),
    ).toEqual(qbe([{ firstName: 'This field is required', lastName: 'This field is required' }]))
    expect(await qb.insertInto('Students').values({ firstName: 'Harry', lastName: 'Potter' }).validate()).toEqual(
      qbe([
        {
          firstName: 'A student with identical first and last names already exists',
          lastName: 'A student with identical first and last names already exists',
        },
      ]),
    )
    expect(
      await qb
        .insertInto('Students')
        .values([{ firstName: 'Foo', lastName: 'Bar' }])
        .validate(),
    ).toEqual(qbo(undefined))

    const insertValidation = () => qb.insertInto('Students').values([{ firstName: 'Foo', lastName: 'Bar' }])
    const uniqueErrorMessage = 'A student with identical first and last names already exists'
    const uniqueError = { firstName: uniqueErrorMessage, lastName: uniqueErrorMessage }
    const insertValidation1 = insertValidation()
    const insertValidation2 = insertValidation()
    expect(await insertValidation1.validate()).toEqual(qbo(undefined))
    expect(await insertValidation1.run()).toEqual(qbo(1))
    expect(await insertValidation2.validate()).toEqual(qbe([uniqueError]))
    expect(await insertValidation2.run()).toEqual(qbe([uniqueError]))

    const updateValidation = () => qb.update('Students').set({ firstName: 'Foo', lastName: 'Bar' })
    const updateValidation1 = updateValidation()
    const updateValidation2 = updateValidation()
    expect(await updateValidation1.validate()).toEqual(qbe(uniqueError))
    expect(await updateValidation2.where('firstName', '=', 'Foo').validate()).toEqual(qbo(undefined))
    expect(await updateValidation1.run()).toEqual(qbe(uniqueError))
    expect(await updateValidation2.run()).toEqual(qbo(1))

    expect(await qb.update('Students').set({ firstName: 'Harry', lastName: 'Potter' }).validate()).toEqual(
      qbe(uniqueError),
    )

    expect(
      await qb
        .update('Students')
        .set({ firstName: 'Harry', lastName: 'Potter' })
        .where('firstName', '=', 'Harry')
        .validate(),
    ).toEqual(qbo(undefined))

    // Prepare method

    const prepareCallback: QueryBuilderPrepareCallback = async ({ operation }) => {
      sleep(0)
      throw new Error(operation)
    }

    expect(await qb.insertInto('Houses').prepare(prepareCallback).run()).toEqual(qbe('insert'))
    expect(await qb.insertInto('Houses').prepare(prepareCallback).validate()).toEqual(qbe('insert'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).all()).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).paginate()).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).first()).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).count()).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).min('points')).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).max('points')).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).sum('points')).toEqual(qbe('select'))
    expect(await qb.selectFrom('Houses').prepare(prepareCallback).avg('points')).toEqual(qbe('select'))
    expect(await qb.update('Houses').prepare(prepareCallback).run()).toEqual(qbe('update'))
    expect(await qb.update('Houses').prepare(prepareCallback).validate()).toEqual(qbe('update'))
    expect(await qb.deleteFrom('Houses').prepare(prepareCallback).run()).toEqual(qbe('delete'))

    await db.close()
    await close?.()
  }
})
