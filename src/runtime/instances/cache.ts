import { createClient, type RedisClientType } from 'redis'
import { sleep } from '../utils/function'
import { getModuleOption } from './state'

let client: RedisClientType | undefined
let status: 'initial' | 'connecting' | 'ready' = 'initial'

/**
 * Return the Redis database client.
 *
 * Returns `null` if the connection cannot be established.
 */
export async function cache(force = false) {
  if (status === 'initial' || (!client && force)) {
    const url = getModuleOption('redis')

    if (url) {
      client = createClient({ url })
      status = 'connecting'

      try {
        await client.connect()
        await client.flushDb()
      } catch {}
    }

    status = 'ready'
  }

  while (status === 'connecting') {
    sleep(50)
  }

  return client ?? null
}
