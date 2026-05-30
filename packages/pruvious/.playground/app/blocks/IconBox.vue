<template>
  <div class="icon-box">
    <PruviousIcon v-if="icon" :name="icon" class="icon-box-glyph" />
    <span v-else class="icon-box-empty">No icon selected</span>
    <PruviousEditableText field="label" tag="span" class="icon-box-label" />
  </div>
</template>

<script lang="ts" setup>
import { defineBlock, iconField, textField } from '#pruvious/app'

defineBlock({
  ui: {
    icon: 'sparkles',
    itemLabelConfiguration: {
      fieldValue: 'label',
      stripHTML: true,
    },
  },
})

defineProps({
  icon: iconField({
    ui: {
      label: 'Icon',
      description: 'Pick an SVG from `app/icons`',
      placeholder: 'Pick an icon',
    },
  }),
  label: textField({
    default: 'Label',
    ui: {
      label: 'Label',
      placeholder: 'Enter a label...',
    },
  }),
})
</script>

<style scoped>
.icon-box {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  font-family: Arial, Helvetica, sans-serif;
}

.icon-box-glyph {
  flex: 0 0 1.5rem;
  font-size: 1.5rem;
  color: #1f6feb;
}

.icon-box-empty {
  font-size: 0.75rem;
  color: #999;
  font-style: italic;
}

.icon-box-label {
  font-size: 0.9rem;
}
</style>
