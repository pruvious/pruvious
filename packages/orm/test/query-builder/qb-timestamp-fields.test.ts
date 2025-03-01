import { sleep } from '@pruvious/utils'
import { expect, test } from 'vitest'
import { Database } from '../../src'
import { collections } from '../test-collections'
import { initAllDrivers, qbo } from '../utils'

test('timestamp fields', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_timestamp_fields')) {
    const db = new Database({ driver, PGPool, collections })
    const qb = db.queryBuilder()
    await db.connect()

    const insertResult = await qb
      .insertInto('Houses')
      .values([{ name: 'Gryffindor' }])
      .returning(['createdAt', 'updatedAt'])
      .run()

    expect(insertResult).toEqual(qbo([{ createdAt: expect.any(Number), updatedAt: expect.any(Number) }]))
    expect(insertResult.data![0].createdAt).toBeGreaterThan(Date.now() - 1000)
    expect(insertResult.data![0].createdAt).toBeLessThan(Date.now() + 1000)
    expect(insertResult.data![0].updatedAt).toBe(insertResult.data![0].createdAt)

    await sleep(1)
    const updateResult = await qb.update('Houses').returning(['createdAt', 'updatedAt']).run()

    expect(updateResult).toEqual(qbo([{ createdAt: expect.any(Number), updatedAt: expect.any(Number) }]))
    expect(updateResult.data![0].createdAt).toBe(insertResult.data![0].createdAt)
    expect(updateResult.data![0].updatedAt).toBeGreaterThan(insertResult.data![0].updatedAt)

    await db.close()
    await close?.()
  }
})
