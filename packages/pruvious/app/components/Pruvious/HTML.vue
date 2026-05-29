<template>
  <component v-bind="dynamicProps" :is="tag" ref="el" />
</template>

<script lang="ts" setup>
import { navigateTo } from '#imports'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /**
   * The HTML tag name to use for the root element when rendering this component.
   *
   * @default 'div'
   */
  tag: {
    type: String as PropType<
      | 'div'
      | 'section'
      | 'article'
      | 'aside'
      | 'p'
      | 'h1'
      | 'h2'
      | 'h3'
      | 'h4'
      | 'h5'
      | 'h6'
      | 'blockquote'
      | 'pre'
      | 'ul'
      | 'ol'
      | 'li'
      | 'span'
      | 'code'
      | 'a'
      | 'button'
      | 'label'
      | 'strong'
      | 'em'
      | 'small'
      | (string & {})
    >,
    default: 'div',
  },

  /**
   * The HTML content.
   */
  html: {
    type: String,
  },
})

const el = ref<HTMLElement>()
const dynamicProps = computed(() => ({ innerHTML: props.html }))

/**
 * Delegated click handler that routes internal anchor clicks through `navigateTo`.
 *
 * Modifier-key, middle-click, and right-click events are left alone so the browser
 * keeps native new-tab/new-window/download behavior, matching `<NuxtLink>`.
 */
function onClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const anchor = (event.target as HTMLElement | null)?.closest('a')

  if (!anchor || !el.value?.contains(anchor)) {
    return
  }

  const href = anchor.getAttribute('href')

  if (!href || href.startsWith('http') || (anchor.target && anchor.target !== '_self')) {
    return
  }

  event.preventDefault()
  navigateTo(href)
}

onMounted(() => el.value?.addEventListener('click', onClick))
onBeforeUnmount(() => el.value?.removeEventListener('click', onClick))
</script>
