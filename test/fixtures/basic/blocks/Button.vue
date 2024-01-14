<template>
  <button>{{ label }}</button>
</template>

<script lang="ts" setup>
import { isString, textField } from '#pruvious'

defineProps({
  label: textField(
    { required: true, default: 'Default label' },
    { population: { type: 'string', populator: ({ value }) => (isString(value) ? `${value}!` : value) } },
  ),
})
</script>
