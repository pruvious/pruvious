<template>
  <Showcase>
    <PUICard :size="state.size" class="pui-card">
      <template v-if="header" #header>
        <p><strong>Header</strong></p>
      </template>

      <p class="pui-lead"><strong>Headline</strong></p>
      <p>
        Incididunt fugiat nisi elit sint mollit amet occaecat nisi. Incididunt deserunt esse Lorem irure laboris
        pariatur occaecat commodo pariatur est eu enim ullamco.
      </p>
      <div class="buttons">
        <PUIButton>Save</PUIButton>
        <PUIButton variant="outline">Cancel</PUIButton>
      </div>

      <template v-if="footer" #footer>
        <p><strong>Footer</strong></p>
      </template>
    </PUICard>

    <template #config>
      <ShowcaseConfig>
        <PUIField>
          <PUIFieldLabel>
            <label for="header">Header</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="header"
            :choices="[
              { label: 'Hide', value: false },
              { label: 'Show', value: true },
            ]"
            id="header"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="footer">Footer</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="footer"
            :choices="[
              { label: 'Hide', value: false },
              { label: 'Show', value: true },
            ]"
            id="footer"
          />
        </PUIField>

        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const header = ref(false)
const footer = ref(false)
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
