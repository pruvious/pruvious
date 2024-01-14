<template></template>

<script lang="ts" setup>
import { repeaterField, repeaterSubfield, textSubfield } from '#pruvious'

defineProps({
  repeater: repeaterField({
    subfields: {
      text: textSubfield({ default: 'foo' }),
      repeater: repeaterSubfield({
        subfields: { text: textSubfield({ default: 'bar' }) },
      }),
    },
  }),
})
</script>
