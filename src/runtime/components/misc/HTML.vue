<template>
  <div v-html="html" ref="el"></div>
</template>

<script lang="ts" setup>
import { navigateTo, ref, watch } from '#imports'

const props = defineProps({
  /**
   * The HTML content to render.
   */
  html: String,
})

const el = ref<HTMLElement>()

watch(
  () => props.html,
  () => {
    setTimeout(() => {
      el.value?.querySelectorAll('a').forEach((a: HTMLAnchorElement) => {
        const href = a.getAttribute('href')

        if (href && !href.startsWith('http') && (a.target === '_self' || !a.target)) {
          a.addEventListener('click', (event) => {
            if (!event.defaultPrevented) {
              event.preventDefault()

              if (event.metaKey || event.ctrlKey) {
                window.open(href, '_blank')
              } else {
                navigateTo(href)
              }
            }
          })
        }
      })
    })
  },
  { immediate: true },
)
</script>
