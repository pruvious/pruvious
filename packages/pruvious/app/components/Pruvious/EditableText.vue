<template>
  <component v-bind="dynamicProps" :is="component ?? PruviousHTML" />
</template>

<script lang="ts" setup>
import { PruviousHTML } from '#components'
import { blockPathInjection, isPreview, usePruviousRoute } from '#pruvious/app'
import { getProperty } from '@pruvious/utils'
import { computed, onMounted, shallowRef, type Component } from 'vue'

const props = defineProps({
  /**
   * The HTML tag name to use for the root element when rendering this component.
   *
   * @default 'span'
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
    default: 'span',
  },

  /**
   * The field name associated with the content of this component.
   * Can be a relative path using dot notation, starting from the closest block, collection, or singleton.
   *
   * @example
   * ```ts
   * 'text'
   * 'button.label'
   * 'products.0.productDescription'
   * ```
   */
  field: {
    type: String,
    required: true,
  },
})

const proute = usePruviousRoute()
const preview = isPreview()
const component = shallowRef<string | Component>()
const blockPath = inject(blockPathInjection, undefined)
const fieldPath = computed(() => (blockPath ? `${blockPath.value}.${props.field}` : props.field))
const html = computed(() => getProperty(proute.value?.data ?? {}, fieldPath.value))
const dynamicProps = computed(() =>
  !component.value
    ? { html: html.value, tag: props.tag }
    : { html: html.value, tag: props.tag, fieldPath: fieldPath.value },
)

onMounted(() => {
  if (preview) {
    component.value = defineAsyncComponent(() => import('./RichTextController.vue'))
  }
})
</script>
