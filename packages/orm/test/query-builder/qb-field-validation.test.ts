import { expect, test } from 'vitest'
import { Database } from '../../src'
import { collections } from '../test-collections'
import { initAllDrivers, qbe, qbo } from '../utils'

test('basic query field validation', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_field_validation')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

    // Houses: name

    expect(await qb.insertInto('Houses').values({ name: 'Gryffindor' }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Houses').values({ name: 'Gryffindor' }).run()).toEqual(
      qbe([{ name: 'The house already exists' }]),
    )
    expect(
      await qb
        .insertInto('Houses')
        .values([{ name: 'Hufflepuff' }, { name: 'Gryffindor' }])
        .run(),
    ).toEqual(qbe([undefined, { name: 'The house already exists' }]))
    expect(await qb.update('Houses').set({ name: 'Gryffindor' }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Houses').values({ name: 'Hufflepuff' }).run()).toEqual(qbo(1))
    expect(await qb.update('Houses').set({ name: 'Hufflepuff' }).run()).toEqual(
      qbe({ name: 'The house already exists' }),
    )

    // Students: firstName, lastName

    expect(await qb.insertInto('Students').values({ firstName: 'Tom', lastName: 'Who' }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Students').values({ firstName: 'Who', lastName: 'Riddle' }).run()).toEqual(qbo(1))
    expect(await qb.insertInto('Students').values({ firstName: 'Tom', lastName: 'Riddle' }).run()).toEqual(
      qbe([{ firstName: 'You know who', lastName: 'You know who' }]),
    )
    expect(await qb.insertInto('Students').values({ firstName: 'Voldemort', lastName: 'Who' }).run()).toEqual(
      qbe([{ firstName: 'You know who' }]),
    )
    expect(await qb.insertInto('Students').values({ firstName: 'Who', lastName: 'Voldemort' }).run()).toEqual(
      qbe([{ lastName: 'You know who' }]),
    )
    expect(await qb.deleteFrom('Students').where('id', '=', 2).run()).toEqual(qbo(1))

    expect(await qb.update('Students').set({ firstName: 'Who', lastName: 'Who' }).run()).toEqual(qbo(1))
    expect(await qb.update('Students').set({ firstName: 'Tom' }).run()).toEqual(qbo(1))
    expect(await qb.update('Students').set({ firstName: 'Tom', lastName: 'Riddle' }).run()).toEqual(
      qbe({ firstName: 'You know who', lastName: 'You know who' }),
    )
    expect(await qb.update('Students').set({ lastName: 'Riddle' }).run()).toEqual(qbe({ lastName: 'You know who' }))
    expect(await qb.update('Students').set({ firstName: 'Voldemort' }).run()).toEqual(
      qbe({ firstName: 'You know who' }),
    )
    expect(await qb.update('Students').set({ lastName: 'Voldemort' }).run()).toEqual(qbe({ lastName: 'You know who' }))

    // Students: house

    expect(await qb.insertInto('Students').values({ firstName: 'Harry', lastName: 'Potter', house: 1 }).run()).toEqual(
      qbo(1),
    )
    expect(
      await qb.insertInto('Students').values({ firstName: 'Hermione', lastName: 'Granger', house: 3 }).run(),
    ).toEqual(qbe([{ house: 'The house does not exist' }]))
    expect(await qb.update('Students').set({ house: 3 }).run()).toEqual(qbe({ house: 'The house does not exist' }))

    // Students: firstName, lastName (unique)

    expect(await qb.insertInto('Students').values({ firstName: 'Harry', lastName: 'Potter' }).run()).toEqual(
      qbe([
        {
          firstName: 'A student with identical first and last names already exists',
          lastName: 'A student with identical first and last names already exists',
        },
      ]),
    )
    expect(
      await qb
        .update('Students')
        .set({ firstName: 'Harry', lastName: 'Potter' })
        .where('firstName', '=', 'Harry')
        .run(),
    ).toEqual(qbo(1))
    expect(
      await qb
        .insertInto('Students')
        .values([
          { firstName: 'Hermione', lastName: 'Granger' },
          { firstName: 'Ron', lastName: 'Wesley' },
          { firstName: 'Hermione', lastName: 'Granger' },
        ])
        .run(),
    ).toEqual(
      qbe([
        {
          firstName: 'A student with identical first and last names already exists',
          lastName: 'A student with identical first and last names already exists',
        },
        undefined,
        {
          firstName: 'A student with identical first and last names already exists',
          lastName: 'A student with identical first and last names already exists',
        },
      ]),
    )
    expect(await qb.insertInto('Students').values({ firstName: 'James', lastName: 'Potter', house: 1 }).run()).toEqual(
      qbo(1),
    )
    expect(await qb.selectFrom('Students').select('firstName').orderBy('id').all()).toEqual(
      qbo([{ firstName: 'Tom' }, { firstName: 'Harry' }, { firstName: 'James' }]),
    )
    expect(await qb.update('Students').set({ firstName: 'James' }).run()).toEqual(
      qbe({ firstName: 'A student with identical first and last names already exists' }),
    )

    await db.close()
    await close?.()
  }
})
