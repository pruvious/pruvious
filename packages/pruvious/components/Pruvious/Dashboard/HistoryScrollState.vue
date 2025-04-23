<template></template>

<script lang="ts" setup>
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { useDebounceFn, type useScroll, watchPausable } from '@vueuse/core'

const { listen } = usePUIHotkeys({ allowInOverlays: true })
const scroll = inject<ReturnType<typeof useScroll> | null>('scroll', null)
const prevScrollY = ref(0)
const scrollWatcher = watchPausable(
  () => scroll?.y.value ?? window.scrollY,
  (scrollY) => {
    if (scrollY !== prevScrollY.value) {
      if (scroll) {
        scroll.y.value = prevScrollY.value
      } else {
        window.scrollTo({ top: prevScrollY.value, behavior: 'instant' })
      }
    }
  },
  { initialState: 'paused' },
)
const pauseScrollWatcher = useDebounceFn(() => scrollWatcher.pause(), 250)

listen('undo', trigger)
listen('redo', trigger)

function trigger() {
  prevScrollY.value = scroll?.y.value ?? window.scrollY
  scrollWatcher.resume()
  pauseScrollWatcher()
}
</script>
