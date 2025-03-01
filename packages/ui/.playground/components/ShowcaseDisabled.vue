<template>
  <PUIField>
    <PUIFieldLabel>
      <label for="disabled">Disabled</label>
    </PUIFieldLabel>
    <PUIButtonGroup
      :choices="[
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ]"
      :modelValue="modelValue"
      @update:modelValue="$emit('update:modelValue', !!$event)"
      id="disabled"
    />
  </PUIField>
</template>

<script lang="ts" setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
