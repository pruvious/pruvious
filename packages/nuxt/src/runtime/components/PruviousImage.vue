<template>
  <picture v-if="image">
    <source
      v-for="(source, index) in image.sources"
      :key="index"
      :media="source.media"
      :srcset="source.url"
      :width="source.width"
      :height="source.height"
      :type="source.type"
    />
    <img
      v-bind="imgAttrs"
      :src="image.url"
      :alt="image.alt"
      :width="image.width"
      :height="image.height"
      :loading="lazy ? 'lazy' : null"
    />
  </picture>
</template>

<script setup lang="ts">
import { PropType } from 'vue'

defineProps({
  image: {
    type: Object as PropType<Record<string, any> | null>,
    default: {
      sources: [],
      url: null,
      alt: '',
      width: 0,
      height: 0,
    },
  },
  imgAttrs: {
    type: Object,
    default: {},
  },
  lazy: {
    type: Boolean,
    default: false,
  },
})
</script>
