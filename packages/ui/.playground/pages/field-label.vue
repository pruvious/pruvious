<template>
  <Showcase>
    <PUIFieldLabel :required="required" :size="state.size" class="pui-field-label">
      <label for="label">Label</label>
      <a href="#">Link</a>
      <p>Paragraph</p>
    </PUIFieldLabel>
    <input hidden id="label" />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="required">Required</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="required"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="required"
          />
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const required = ref(false)
</script>

<style scoped>
.pui-field-label {
  width: 16rem;
}
</style>
