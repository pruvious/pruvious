<template>
  <component
    :is.prop="typeof modelValue === 'string' ? 'p' : LazyPruviousRichText"
    :modelValue.prop="typeof modelValue === 'string' ? modelValue : modelValue.value"
    :placeholder.prop="modelValue.placeholder"
    @commit="console.log('@todo dispatch custom event with `modelValue.path` and `$event`')"
  >
    @todo check if live preview and async load RichText component
  </component>
</template>

<script lang="ts" setup>
import { LazyPruviousRichText } from '#components'

defineProps({
  /**
   * The populated field value.
   */
  modelValue: {
    type: [String, Object] as PropType<string | { todo: '@todo' }>,
    required: true,
  },
})
</script>
