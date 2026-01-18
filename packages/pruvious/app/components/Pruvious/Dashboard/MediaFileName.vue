<template>
  <span v-pui-tooltip="showTooltip ? filename : undefined" :title="showTitle ? filename : undefined" class="pui-flex">
    <span class="pui-truncate">
      <span>{{ filenameWithoutExtension }}</span>
      <span v-if="extensionWithoutDot" class="pui-muted">.</span>
    </span>
    <span v-if="extensionWithoutDot" class="pui-shrink-0 pui-muted">{{ extensionWithoutDot }}</span>
  </span>
</template>

<script lang="ts" setup>
import { basename, extname } from 'pathe'

const props = defineProps({
  path: {
    type: String,
    required: true,
  },
  showTitle: {
    type: Boolean,
    default: false,
  },
  showTooltip: {
    type: Boolean,
    default: false,
  },
})

const filename = computed(() => basename(props.path))
const extension = computed(() => extname(filename.value))
const filenameWithoutExtension = computed(() =>
  extension.value ? filename.value.slice(0, -extension.value.length) : filename.value,
)
const extensionWithoutDot = computed(() =>
  extension.value.startsWith('.') ? extension.value.slice(1) : extension.value,
)
</script>
