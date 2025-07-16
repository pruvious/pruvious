<template>
  <component v-bind="dynamicProps" :is="tag" />
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * The HTML tag name to use for the root element when rendering this component.
   */
  tag: {
    type: String as PropType<
      'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre' | 'ul' | 'ol' | 'li' | (string & {})
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

// @todo revive links (https://github.com/pruvious/pruvious/blob/main/src/runtime/components/misc/HTML.vue)
const dynamicProps = computed(() => ({ innerHTML: props.html }))
</script>
