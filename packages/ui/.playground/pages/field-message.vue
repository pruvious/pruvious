<template>
  <Showcase>
    <PUIFieldMessage :error="state.hasErrors" :size="state.size" class="pui-field-message">
      <p v-if="state.hasErrors">This is a field error</p>
      <p v-else>This is a field message</p>
    </PUIFieldMessage>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
        <ShowcaseHasErrors />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
</script>

<style scoped>
.pui-field-message {
  width: 16rem;
}
</style>
