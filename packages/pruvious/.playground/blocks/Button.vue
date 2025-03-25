<template>
  <button>{{ label }}</button>
</template>

<script lang="ts" setup>
import { textField } from '#pruvious/client'

defineProps({
  label: textField({}),
})
</script>
