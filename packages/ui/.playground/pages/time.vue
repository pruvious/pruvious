<template>
  <Showcase>
    <PUITime
      v-model="value"
      :disabled="disabled"
      :error="state.hasErrors"
      :max="max"
      :min="min"
      :size="state.size"
      id="time"
      class="pui-time"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="min">Minimum</label>
          </PUIFieldLabel>
          <PUINumber v-model="min" :size="-2" id="min" suffix="ms" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="max">Maximum</label>
          </PUIFieldLabel>
          <PUINumber v-model="max" :size="-2" id="max" suffix="ms" />
        </PUIField>

        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const min = ref(0)
const max = ref(86399000)
const disabled = ref(false)
const value = ref(0)
</script>

<style scoped>
.pui-time {
  width: 20rem;
  max-width: 100%;
}
</style>
