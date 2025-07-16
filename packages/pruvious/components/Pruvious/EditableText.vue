<template>
  <component v-bind="dynamicProps" :is="component ?? PruviousHTML" />
</template>

<script lang="ts" setup>
import { PruviousHTML } from '#components'
import { isPreview, usePruviousRoute } from '#pruvious/client'
import { getProperty } from '@pruvious/utils'
import { computed, onMounted, shallowRef, type Component } from 'vue'

const props = defineProps({
  /**
   * The HTML tag name to use for the root element when rendering this component.
   */
  tag: {
    type: String as PropType<
      'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre' | 'ul' | 'ol' | 'li' | (string & {})
    >,
    required: true,
  },

  /**
   * The field name associated with the content of this component.
   * Can be a relative path using dot notation, starting from the closest block, collection, or singleton.
   * Required for enabling live editing in the Pruvious dashboard.
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
const parentBlockPath = inject<string | undefined>('pruviousParentBlockPath')
const fieldPath = computed(() => (parentBlockPath ? `${parentBlockPath}.${props.field}` : props.field))
const html = computed(() => getProperty(proute.value?.data ?? {}, fieldPath.value))
const dynamicProps = computed(() =>
  !component.value
    ? { html: html.value, tag: props.tag }
    : { html: html.value, tag: props.tag, fieldPath: fieldPath.value },
)

onMounted(() => {
  if (preview) {
    component.value = defineAsyncComponent(() => import('./RichTextEmitter.vue'))
  }
})
</script>
