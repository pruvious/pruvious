import { describe, expect, test } from 'vitest'
import { promiseAllInBatches } from '../../src'

describe('promise all in batches', () => {
  const createResolvingTask =
    <T>(value: T, delay: number) =>
    () =>
      new Promise<T>((resolve) => setTimeout(() => resolve(value), delay))

  const createRejectingTask = (error: Error, delay: number) => () =>
    new Promise<never>((_, reject) => setTimeout(() => reject(error), delay))

  test('should process all promises when the total number is a multiple of the batch size', async () => {
    const tasks = [
      createResolvingTask('a', 20),
      createResolvingTask('b', 10),
      createResolvingTask('c', 30),
      createResolvingTask('d', 15),
    ]
    const results = await promiseAllInBatches(tasks, 2)
    expect(results).toEqual(['a', 'b', 'c', 'd'])
  })

  test('should handle a final batch that is smaller than the batch size', async () => {
    const tasks = [
      createResolvingTask(1, 20),
      createResolvingTask(2, 10),
      createResolvingTask(3, 30),
      createResolvingTask(4, 15),
      createResolvingTask(5, 10),
    ]
    const results = await promiseAllInBatches(tasks, 3)
    expect(results).toEqual([1, 2, 3, 4, 5])
  })

  test('should resolve with an empty array when given an empty array of tasks', async () => {
    const results = await promiseAllInBatches([], 5)
    expect(results).toEqual([])
  })

  test('should reject if any promise in a batch rejects', async () => {
    const rejectionError = new Error('Something went wrong')
    const tasks = [
      createResolvingTask('a', 10),
      createResolvingTask('b', 20),
      createRejectingTask(rejectionError, 30),
      createResolvingTask('d', 10), // This task should not be executed
    ]

    await expect(promiseAllInBatches(tasks, 2)).rejects.toThrow(rejectionError)
  })

  test('should process all promises in a single batch if batch size is larger than the number of tasks', async () => {
    const tasks = [createResolvingTask(10, 10), createResolvingTask(20, 10), createResolvingTask(30, 10)]
    const results = await promiseAllInBatches(tasks, 5)
    expect(results).toEqual([10, 20, 30])
  })

  test('should maintain the original order of the results, regardless of completion time', async () => {
    const tasks = [
      createResolvingTask('first', 100), // takes longer
      createResolvingTask('second', 10), // finishes first
      createResolvingTask('third', 50),
    ]
    const results = await promiseAllInBatches(tasks, 3)
    expect(results).toEqual(['first', 'second', 'third'])
  })

  test('should work correctly with a batch size of 1 (sequential execution)', async () => {
    const tasks = [createResolvingTask('a', 30), createResolvingTask('b', 10), createResolvingTask('c', 20)]
    const results = await promiseAllInBatches(tasks, 1)
    expect(results).toEqual(['a', 'b', 'c'])
  })
})
