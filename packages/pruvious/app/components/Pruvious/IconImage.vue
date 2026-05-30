<template>
  <img
    v-if="isString(name) && !isEmpty(name) && !hasError"
    :alt="alt"
    :decoding="decoding"
    :height="height"
    :loading="loading"
    :src="src"
    :width="width"
    @error="onError"
  />
</template>

<script lang="ts" setup>
import { buildIconUrl } from '#pruvious/app'
import { isEmpty, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * Icon basename (without `.svg` extension), as stored by `iconField`.
   */
  name: {
    type: String as PropType<string | null>,
    default: null,
  },

  /**
   * Icon directory basename. Defaults to the first directory configured via
   * `pruvious.dir.icons`.
   */
  dir: {
    type: String as PropType<string | null>,
    default: null,
  },

  /**
   * Accessible label. Leave empty for purely decorative icons.
   */
  alt: {
    type: String,
    default: '',
  },

  /**
   * Rendered width (any value the `<img>` `width` attribute accepts).
   */
  width: {
    type: [String, Number],
  },

  /**
   * Rendered height (any value the `<img>` `height` attribute accepts).
   */
  height: {
    type: [String, Number],
  },

  loading: {
    type: String as PropType<'lazy' | 'eager'>,
    default: 'lazy',
  },

  decoding: {
    type: String as PropType<'sync' | 'async' | 'auto'>,
    default: 'async',
  },
})

const src = computed(() => buildIconUrl(props.dir, props.name!))
const hasError = ref(false)

watch(src, () => {
  hasError.value = false
})

function onError() {
  hasError.value = true
  if (import.meta.dev) {
    console.warn(`[pruvious] <PruviousIconImage> failed to load '${src.value}'`)
  }
}
</script>
