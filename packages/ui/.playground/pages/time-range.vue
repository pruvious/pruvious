<template>
  <Showcase>
    <PUITimeRange
      v-model="value"
      :disabled="disabled"
      :error="state.hasErrors"
      :max="max"
      :maxRange="maxRange"
      :min="min"
      :minRange="minRange"
      :size="state.size"
      id="time"
      class="pui-time-range"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="min">Minimum</label>
          </PUIFieldLabel>
          <PUINumber v-model="min" :size="-2" id="min" suffix="s" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="max">Maximum</label>
          </PUIFieldLabel>
          <PUINumber v-model="max" :size="-2" id="max" suffix="s" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="minRange">Minimum range</label>
          </PUIFieldLabel>
          <PUINumber v-model="minRange" :size="-2" id="minRange" suffix="s" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="maxRange">Maximum range</label>
          </PUIFieldLabel>
          <PUINumber v-model="maxRange" :size="-2" id="maxRange" suffix="s" />
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
const max = ref(86399)
const minRange = ref(0)
const maxRange = ref(86399)
const disabled = ref(false)
const value = ref<[number, number]>([0, 86399])
</script>

<style scoped>
.pui-time-range {
  width: 20rem;
  max-width: 100%;
}
</style>
