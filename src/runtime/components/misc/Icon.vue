<template>
  <component v-if="icon && components[icon]" :is="components[icon]" />
</template>

<script lang="ts" setup>
import { watch, type PropType } from '#imports'
import { type Icon } from '#pruvious'
import { iconImports } from '#pruvious/icons'

const props = defineProps({
  /**
   * The icon name.
   */
  icon: {
    type: String as PropType<Icon | null>,
  },
})

const components: Record<string, any> = {}

watch(
  () => props.icon,
  (icon) => {
    if (icon) {
      components[icon] = iconImports[icon]?.()
    }
  },
  { immediate: true },
)
</script>
