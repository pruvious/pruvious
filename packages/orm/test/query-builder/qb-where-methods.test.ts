import { expect, test } from 'vitest'
import { Database } from '../../src'
import { collections } from '../test-collections'
import { initAllDrivers, qbe, qbo } from '../utils'

test('query builder where methods', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_where_methods')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

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

    expect(
      await qb
        .insertInto('Students')
        .values([
          { firstName: 'Harry', lastName: 'Potter', house: 1 },
          { firstName: 'Hermione', lastName: 'Granger', house: 1 },
          { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
        ])
        .returning(['firstName', 'lastName', 'house', 'prefect'])
        .run(),
    ).toEqual(
      qbo([
        { firstName: 'Harry', lastName: 'Potter', house: 1, prefect: false },
        { firstName: 'Hermione', lastName: 'Granger', house: 1, prefect: false },
        { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
      ]),
    )

    // `where`

    expect(await qb.selectFrom('Students').select('firstName').where('firstName', '=', 'Harry').all()).toEqual(
      qbo([{ firstName: 'Harry' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&where=firstName[=][Harry]').all()).toEqual(
      qbo([{ firstName: 'Harry' }]),
    )

    expect(await qb.selectFrom('Students').select('firstName').where('prefect', '=', 'yes').all()).toEqual(
      qbo([{ firstName: 'Draco' }]),
    )
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&where=prefect[=][yes]').all()).toEqual(
      qbo([{ firstName: 'Draco' }]),
    )

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .where('firstName', '!=', 'Harry')
        .orderBy('firstName', 'desc')
        .all(),
    ).toEqual(qbo([{ firstName: 'Hermione' }, { firstName: 'Draco' }]))
    expect(
      await qb
        .selectFrom('Students')
        .fromQueryString('select=firstName&where=firstName[!=][Harry]')
        .orderBy('firstName', 'desc')
        .all(),
    ).toEqual(qbo([{ firstName: 'Hermione' }, { firstName: 'Draco' }]))

    expect(await qb.selectFrom('Houses').select('name').where('points', '<', 50).all()).toEqual(
      qbo([{ name: 'Hufflepuff' }]),
    )
    expect(await qb.selectFrom('Houses').fromQueryString('select=name&where=points[<][50]').all()).toEqual(
      qbo([{ name: 'Hufflepuff' }]),
    )

    expect(
      await qb.selectFrom('Houses').select('name').where('points', '<=', '50').orderBy('name', 'desc').all(),
    ).toEqual(qbo([{ name: 'Slytherin' }, { name: 'Hufflepuff' }]))
    expect(
      await qb.selectFrom('Houses').fromQueryString('select=name&where=points[<=][50]').orderBy('name', 'desc').all(),
    ).toEqual(qbo([{ name: 'Slytherin' }, { name: 'Hufflepuff' }]))

    expect(await qb.selectFrom('Houses').select('name').where('points', '>', 50).orderBy('name').all()).toEqual(
      qbo([{ name: 'Gryffindor' }, { name: 'Ravenclaw' }]),
    )
    expect(
      await qb.selectFrom('Houses').fromQueryString('select=name&where=points[>][50]').orderBy('name').all(),
    ).toEqual(qbo([{ name: 'Gryffindor' }, { name: 'Ravenclaw' }]))

    expect(await qb.selectFrom('Houses').select('name').where('points', '>=', '50').orderBy('name').all()).toEqual(
      qbo([{ name: 'Gryffindor' }, { name: 'Ravenclaw' }, { name: 'Slytherin' }]),
    )
    expect(
      await qb.selectFrom('Houses').fromQueryString('select=name&where=points[>=][50]').orderBy('name').all(),
    ).toEqual(qbo([{ name: 'Gryffindor' }, { name: 'Ravenclaw' }, { name: 'Slytherin' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .where('firstName', 'in', ['Harry', 'Hermione'])
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))
    expect(
      await qb
        .selectFrom('Students')
        .fromQueryString('select=firstName&where=firstName[in][Harry,Hermione]')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').select('firstName').where('firstName', 'notIn', ['Harry', 'Hermione']).all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=firstName&where=firstName[notIn][Harry,Hermione]').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb.selectFrom('Students').select('firstName').where('firstName', 'like', 'H%').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))
    expect(
      await qb
        .selectFrom('Students')
        .fromQueryString('select=firstName&where=firstName[like][H%]')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(await qb.selectFrom('Students').select('firstName').where('firstName', 'like', 'h%').all()).toEqual(qbo([]))
    expect(await qb.selectFrom('Students').fromQueryString('select=firstName&where=firstName[like][h%]').all()).toEqual(
      qbo([]),
    )

    expect(await qb.selectFrom('Students').select('firstName').where('firstName', 'notLike', 'H%').all()).toEqual(
      qbo([{ firstName: 'Draco' }]),
    )
    expect(
      await qb.selectFrom('Students').fromQueryString('select=firstName&where=firstName[notLike][H%]').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .where('firstName', 'notLike', 'h%')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Harry' }, { firstName: 'Hermione' }]))
    expect(
      await qb
        .selectFrom('Students')
        .fromQueryString('select=firstName&where=firstName[notLike][h%]')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').select('firstName').where('firstName', 'ilike', 'h%').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))
    expect(
      await qb.selectFrom('Students').fromQueryString('select=firstName&where=firstName[ilike][h%]').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(await qb.selectFrom('Students').select('firstName').where('firstName', 'notIlike', 'h%').all()).toEqual(
      qbo([{ firstName: 'Draco' }]),
    )
    expect(
      await qb.selectFrom('Students').fromQueryString('select=firstName&where=firstName[notIlike][h%]').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb.selectFrom('Houses').select('name').where('points', 'between', [50, 75]).orderBy('name', 'desc').all(),
    ).toEqual(qbo([{ name: 'Slytherin' }, { name: 'Ravenclaw' }]))
    expect(
      await qb
        .selectFrom('Houses')
        .fromQueryString('select=name&where=points[between][50,75]')
        .orderBy('name', 'desc')
        .all(),
    ).toEqual(qbo([{ name: 'Slytherin' }, { name: 'Ravenclaw' }]))

    expect(
      await qb.selectFrom('Houses').select('name').where('points', 'notBetween', [50, 75]).orderBy('name').all(),
    ).toEqual(qbo([{ name: 'Gryffindor' }, { name: 'Hufflepuff' }]))
    expect(
      await qb
        .selectFrom('Houses')
        .fromQueryString('select=name&where=points[notBetween][50,75]')
        .orderBy('name')
        .all(),
    ).toEqual(qbo([{ name: 'Gryffindor' }, { name: 'Hufflepuff' }]))

    // includes, includesAny, excludes, excludesAny

    expect(
      await qb
        .insertInto('Clubs')
        .values([{ name: 'Chess Club' }, { name: 'Gobstones Club' }, { name: 'Quidditch Club' }])
        .run(),
    ).toEqual(qbo(3))

    expect(
      await qb
        .update('Students')
        .set({ clubs: [1, 2] })
        .where('firstName', '=', 'Harry')
        .run(),
    ).toEqual(qbo(1))

    expect(
      await qb
        .update('Students')
        .set({ clubs: [1, 3] })
        .where('firstName', '=', 'Hermione')
        .run(),
    ).toEqual(qbo(1))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includes', [1]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includes', 2).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includes', [3]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includes', [1, 2]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb
        .selectFrom('Students')
        .where('clubs', 'includes', [1, 2, 3])
        .select('firstName')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includesAny', [1]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includesAny', 2).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'includesAny', [3]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Hermione' }]))

    expect(
      await qb
        .selectFrom('Students')
        .where('clubs', 'includesAny', [1, 2])
        .select('firstName')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb
        .selectFrom('Students')
        .where('clubs', 'includesAny', [1, 2, 3])
        .select('firstName')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludes', [1]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludes', 2).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludes', [3]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Harry' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludes', [1, 2]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb
        .selectFrom('Students')
        .where('clubs', 'excludes', [1, 2, 3])
        .select('firstName')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludesAny', [1]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludesAny', 2).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Hermione' }]))

    expect(
      await qb.selectFrom('Students').where('clubs', 'excludesAny', [3]).select('firstName').orderBy('firstName').all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Harry' }]))

    expect(
      await qb
        .selectFrom('Students')
        .where('clubs', 'excludesAny', [1, 2])
        .select('firstName')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Hermione' }]))

    expect(
      await qb
        .selectFrom('Students')
        .where('clubs', 'excludesAny', [1, 2, 3])
        .select('firstName')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Draco' }, { firstName: 'Harry' }, { firstName: 'Hermione' }]))

    // `whereRaw`

    expect(
      await qb.selectFrom('Students').select('firstName').whereRaw('"firstName" = $1', { '1': 'Harry' }).all(),
    ).toEqual(qbo([{ firstName: 'Harry' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .whereRaw('"firstName" = $1 or "firstName" = $2', { '1': 'Harry', '2': 'Hermione' })
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    // `orGroup`

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .orGroup([(eb) => eb.where('firstName', '=', 'Harry'), (eb) => eb.where('firstName', '=', 'Hermione')])
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))
    expect(
      await qb
        .selectFrom('Students')
        .fromQueryString('select=firstName&where=orGroup[firstName[=][Harry],firstName[=][Hermione]]')
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .orGroup([
          (eb) =>
            eb
              .where('firstName', '=', 'Harry')
              .orGroup([(eb) => eb.where('lastName', '=', 'Otter'), (eb) => eb.where('lastName', '=', 'Potter')]),
          (eb) => eb.where('firstName', '=', 'Hermione').whereRaw('lower("lastName") like lower($1)', { '1': '%NG%' }),
        ])
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))
    expect(
      await qb
        .selectFrom('Students')
        .fromQueryString(
          'select=firstName&where=orGroup[firstName[=][Harry],orGroup[lastName[=][Otter],lastName[=][Potter]],firstName[=][Hermione],lastName[ilike][%NG%]]',
        )
        .orderBy('firstName')
        .all(),
    ).toEqual(qbo([{ firstName: 'Harry' }, { firstName: 'Hermione' }]))

    // Traverse

    const traverseResults: string[] = []
    qb.selectFrom('Students')
      .orGroup([
        (eb) =>
          eb
            .where('firstName', '=', 'Harry')
            .orGroup([(eb) => eb.where('lastName', '=', 'Otter'), (eb) => eb.where('lastName', '=', 'Potter')]),
        (eb) => eb.where('firstName', '=', 'Hermione').whereRaw('lower("lastName") like lower($1)', { '1': '%NG%' }),
      ])
      .traverseWhereCondition((condition, _, index) => {
        if ('field' in condition) {
          traverseResults.push(`${condition.field}:${index}`)
        } else if ('or' in condition) {
          traverseResults.push(`OR:${index}`)
        } else if ('raw' in condition) {
          traverseResults.push(`RAW:${index}`)
        }
      })
    expect(traverseResults).toEqual(['OR:0', 'firstName:0', 'OR:1', 'lastName:0', 'lastName:0', 'firstName:0', 'RAW:1'])

    // Validation

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .where('lostName' as any, '=', '')
        .all(),
    ).toEqual(qbe('The field `lostName` does not exist'))

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .orGroup([
          (eb) => eb.where('firstName', '=', 'Harry').where('lostName' as any, '=', ''),
          (eb) => eb.where('secondLostName' as any, '=', ''),
        ])
        .all(),
    ).toEqual(qbe('The field `lostName` does not exist'))

    expect(
      await qb
        .selectFrom('Students')
        .where('firstName', '=', null as any)
        .all(),
    ).toEqual(qbe('The field `firstName` is not nullable'))

    expect(await qb.selectFrom('Students').where('house', '!=', 'foo').all()).toEqual(
      qbe('The field `house` must be a number or `null`'),
    )

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', '=', 'foo' as any)
        .all(),
    ).toEqual(qbe('The field `prefect` must be a boolean'))

    expect(await qb.selectFrom('Students').where('id', '>', 'foo').all()).toEqual(
      qbe('The field `id` must be a number'),
    )

    expect(
      await qb
        .selectFrom('Students')
        .where('firstName', '<' as any, 'foo')
        .all(),
    ).toEqual(qbe('The operator `<` is not supported for the field `firstName`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', '>=' as any, false)
        .all(),
    ).toEqual(qbe('The operator `>=` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('firstName', 'in', ['foo', null as any])
        .all(),
    ).toEqual(qbe('The field `firstName` is not nullable'))

    expect(
      await qb
        .selectFrom('Students')
        .where('firstName', 'in', 'foo' as any)
        .all(),
    ).toEqual(qbe('The field `firstName` must be an array of strings'))

    expect(
      await qb
        .selectFrom('Students')
        .where('house', 'in', 1 as any)
        .all(),
    ).toEqual(qbe('The field `house` must be an array of numbers'))

    expect(await qb.selectFrom('Students').where('house', 'in', [1, 'foo']).all()).toEqual(
      qbe('The field `house` must be an array of numbers'),
    )

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'in' as any, false)
        .all(),
    ).toEqual(qbe('The operator `in` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('id', 'like' as any, 1)
        .all(),
    ).toEqual(qbe('The operator `like` is not supported for the field `id`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'notIlike' as any, false)
        .all(),
    ).toEqual(qbe('The operator `notIlike` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'includes' as any, false)
        .all(),
    ).toEqual(qbe('The operator `includes` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'includesAny' as any, false)
        .all(),
    ).toEqual(qbe('The operator `includesAny` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'excludes' as any, false)
        .all(),
    ).toEqual(qbe('The operator `excludes` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'excludesAny' as any, false)
        .all(),
    ).toEqual(qbe('The operator `excludesAny` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('house', 'between', 'foo' as any)
        .all(),
    ).toEqual(qbe('The `house` field must be an array containing exactly two numbers'))

    expect(
      await qb
        .selectFrom('Students')
        .where('house', 'between', [] as any)
        .all(),
    ).toEqual(qbe('The `house` field must be an array containing exactly two numbers'))

    expect(await qb.selectFrom('Students').where('house', 'between', ['1', 'foo']).all()).toEqual(
      qbe('The `house` field must be an array containing exactly two numbers'),
    )

    expect(
      await qb
        .selectFrom('Students')
        .where('firstName', 'notBetween' as any, ['1', '2'])
        .all(),
    ).toEqual(qbe('The operator `notBetween` is not supported for the field `firstName`'))

    expect(
      await qb
        .selectFrom('Students')
        .where('prefect', 'between' as any, [0, 1])
        .all(),
    ).toEqual(qbe('The operator `between` is not supported for the field `prefect`'))

    expect(
      await qb
        .selectFrom('Students')
        .orGroup([(eb) => eb.where('firstName', '=', 'Harry'), (eb) => eb.where('lastName', '>' as any, '')])
        .all(),
    ).toEqual(qbe('The operator `>` is not supported for the field `lastName`'))

    // SQL injection

    expect(await qb.selectFrom('Students').where('firstName', '=', `Harry'; drop table "Students";`).all()).toEqual(
      qbo([]),
    )

    expect(
      await qb
        .selectFrom('Students')
        .select('firstName')
        .whereRaw('"firstName" = $1', { '1': `Harry'; drop table "Students";` })
        .all(),
    ).toEqual(qbo([]))

    expect(await qb.selectFrom('Students').count()).toEqual(qbo(3))

    await db.close()
    await close?.()
  }
})
