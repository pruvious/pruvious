<template>
  <img
    v-if="image"
    :alt="image.alt"
    :height="image.height"
    :loading="lazy ? 'lazy' : 'eager'"
    :src="image.src"
    :width="image.width"
  />
</template>

<script lang="ts" setup>
import { type PropType } from '#imports'
import { type Image } from '#pruvious'

defineProps({
  /**
   * The image to render.
   */
  image: {
    type: Object as PropType<Image | null | undefined>,
  },

  /**
   * Specifies whether the image should be lazy loaded.
   *
   * @default false
   */
  lazy: {
    type: Boolean,
    default: false,
  },
})
</script>
