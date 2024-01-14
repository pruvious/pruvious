<template>
  <picture v-if="image">
    <source
      v-for="(source, i) in image.sources"
      :height="source.height"
      :key="i"
      :media="source.media ?? undefined"
      :srcset="source.srcset"
      :type="source.type"
      :width="source.width"
    />
    <slot>
      <PruviousImage v-bind="imgAttrs" :image="image" :lazy="lazy" />
    </slot>
  </picture>
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

  /**
   * Additional attributes to apply to the `<img>` element.
   */
  imgAttrs: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
})
</script>
