<template>
  <Showcase>
    <PUIAlert
      :size="state.size"
      :title="state.hasErrors ? 'Error' : 'Alert'"
      :variant="state.hasErrors ? 'destructive' : 'primary'"
      class="pui-alert"
    >
      <template v-if="icon" #icon>
        <Icon mode="svg" name="tabler:exclamation-circle" />
      </template>
      <p>
        Incididunt fugiat nisi elit sint mollit amet occaecat
        <a href="#">occaecat</a>
        nisi.
      </p>
    </PUIAlert>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
        <ShowcaseHasErrors />

        <PUIField>
          <PUIFieldLabel>
            <label for="icon">Icon</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="icon"
            :choices="[
              { label: 'Hide', value: false },
              { label: 'Show', value: true },
            ]"
            id="icon"
          />
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const icon = ref(true)
</script>

<style scoped>
.pui-alert {
  width: 20rem;
}
</style>
