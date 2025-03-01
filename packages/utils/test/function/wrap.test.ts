import { expect, test } from 'vitest'
import { lockAndLoad, retry, sleep } from '../../src'

test('lock and load', async () => {
  const lock = { value: false }
  const cb = lockAndLoad(lock, (arg: string) => new Promise<string>((resolve) => sleep(50).then(() => resolve(arg))))

  expect(await Promise.all([cb('foo'), cb('bar')])).toEqual(['foo', undefined])
  expect(lock.value).toBe(false)
})

test('retry', async () => {
  let attempts = 0

  expect(
    await retry(
      (resolve) => {
        if (++attempts === 10) {
          resolve()
        }
      },
      { delay: 1 },
    ),
  ).toBeUndefined()

  expect(attempts).toBe(10)

  await expect(() =>
    retry(
      (resolve) => {
        if (++attempts === 20) {
          resolve()
        }
      },
      { delay: 1, attempts: 9 },
    ),
  ).rejects.toThrow()
})
