import { useState, type Ref } from '#imports'

/**
 * The number of active fetch requests.
 */
export const useFetchCount: () => Ref<number> = () => useState('pruvious-fetch-count', () => 0)

if (process.client) {
  window.addEventListener('pruvious-fetch-start', () => {
    useFetchCount().value++
  })

  window.addEventListener('pruvious-fetch-end', () => {
    useFetchCount().value = Math.max(0, useFetchCount().value - 1)
  })
}
