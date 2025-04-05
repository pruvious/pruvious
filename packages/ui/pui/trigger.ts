const event = ref<{ name: string }>()

/**
 * Simple composable to dispatch and listen for custom events using Vue 3 reactivity.
 *
 * @example
 * ```ts
 * const { dispatch, listen } = puiTrigger()
 *
 * // Dispatch an event
 * dispatch('my-event')
 *
 * // Listen for an event
 * listen('my-event', () => {
 *   console.log('Event triggered!')
 * })
 * ```
 */
export function puiTrigger() {
  return { dispatch, listen }
}

/**
 * Dispatches an event with the given name.
 */
function dispatch(eventName: string) {
  event.value = { name: eventName }
}

/**
 * Listens for an event with the given name and calls the `callback` function when the event is triggered.
 *
 * When using in a Vue component, the listener will be automatically removed when the component is unmounted.
 *
 * @returns a function to stop listening for the event.
 */
function listen(eventName: string, callback: () => void) {
  const stop = watch(event, (value) => {
    if (value?.name === eventName) {
      callback()
    }
  })

  return stop
}
