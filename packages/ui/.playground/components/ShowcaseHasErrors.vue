<template>
  <PUIField>
    <PUIFieldLabel>
      <label for="has-errors">Has errors</label>
    </PUIFieldLabel>
    <PUIButtonGroup
      v-model="state.hasErrors"
      :choices="[
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ]"
      :size="-2"
      id="has-errors"
    />
  </PUIField>
</template>

<script lang="ts" setup>
const state = useShowcase()
</script>
