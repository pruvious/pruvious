<template>
  <Showcase>
    <PUICard :size="state.size" class="pui-card">
      <p class="pui-lead"><strong>Headline</strong></p>
      <p>
        Incididunt fugiat nisi elit sint mollit amet occaecat nisi. Incididunt deserunt esse Lorem irure laboris
        pariatur occaecat commodo pariatur est eu enim ullamco.
      </p>
      <div class="buttons">
        <PUIButton>Save</PUIButton>
        <PUIButton variant="outline">Cancel</PUIButton>
      </div>
    </PUICard>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
</script>

<style scoped>
.pui-card {
  width: 20rem;
}

.buttons {
  display: flex;
  gap: 0.5em;
}
</style>
