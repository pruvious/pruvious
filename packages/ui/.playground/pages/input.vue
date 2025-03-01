<template>
  <Showcase>
    <PUIInput
      v-model="value"
      :disabled="disabled"
      :error="state.hasErrors"
      :size="state.size"
      id="input"
      placeholder="Placeholder..."
      class="pui-input"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const disabled = ref(false)
const value = ref('')
</script>

<style scoped>
.pui-input {
  width: 20rem;
  max-width: 100%;
}
</style>
