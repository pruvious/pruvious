<template>
  <div class="brand-icon-box">
    <PruviousIconImage v-if="icon" :name="icon" dir="brand-icons" class="brand-icon-box-glyph" />
    <span v-else class="brand-icon-box-empty">No brand icon selected</span>
    <PruviousEditableText field="label" tag="span" class="brand-icon-box-label" />
  </div>
</template>

<script lang="ts" setup>
import { defineBlock, iconField, textField } from '#pruvious/app'

defineBlock({
  ui: {
    icon: 'building-store',
    itemLabelConfiguration: {
      fieldValue: 'label',
      stripHTML: true,
    },
  },
})

defineProps({
  icon: iconField({
    dir: 'brand-icons',
    ui: {
      label: 'Brand icon',
      description: 'Pick a brand SVG from `app/brand-icons`',
      placeholder: 'Pick a brand icon',
    },
  }),
  label: textField({
    default: 'Brand',
    ui: {
      label: 'Label',
      placeholder: 'Enter a label...',
    },
  }),
})
</script>

<style scoped>
.brand-icon-box {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  font-family: Arial, Helvetica, sans-serif;
}

.brand-icon-box-glyph {
  flex: 0 0 1.5rem;
  font-size: 1.5rem;
  color: #16a34a;
}

.brand-icon-box-empty {
  font-size: 0.75rem;
  color: #999;
  font-style: italic;
}

.brand-icon-box-label {
  font-size: 0.9rem;
}
</style>
