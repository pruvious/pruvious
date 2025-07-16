<template>
  <div>
    <div v-if="language" class="pui-row">
      <PUIBadge color="secondary" class="p-language-code pui-truncate">{{ language.code }}</PUIBadge>
      <span class="pui-truncate">{{ language.name }}</span>
    </div>
    <PruviousTableFieldFallback v-else :modelValue="modelValue" />
  </div>
</template>

<script lang="ts" setup>
import { PruviousTableFieldFallback } from '#components'
import { languages } from '#pruvious/client'
import type { LanguageCode } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: String as PropType<LanguageCode>,
    required: true,
  },
})

const language = computed(() => languages.find(({ code }) => code === props.modelValue))
</script>

<style scoped>
.p-language-code {
  flex-shrink: 1;
  text-transform: uppercase;
}
</style>
