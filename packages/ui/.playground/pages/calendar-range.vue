<template>
  <Showcase>
    <PUICalendarRange
      v-model="value"
      :clearable="clearable"
      :disabled="disabled"
      :error="state.hasErrors"
      :max="max"
      :maxRange="maxRange"
      :min="min"
      :minRange="minRange"
      :size="state.size"
      :timezone="timezone"
      :withTime="withTime"
      iconFrom="plane-departure"
      iconTo="plane-arrival"
      id="calendar"
      placeholderFrom="Departure"
      placeholderTo="Arrival"
      class="pui-calendar-range"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="timezone">Timezone</label>
          </PUIFieldLabel>
          <PUIInput v-model="timezone" :size="-2" id="timezone" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="withTime">With time</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="withTime"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="withTime"
          />
        </PUIField>

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

        <PUIField>
          <PUIFieldLabel>
            <label for="minRange">Minimum range</label>
          </PUIFieldLabel>
          <PUINumber v-model="minRange" :size="-2" id="minRange" suffix="ms" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="maxRange">Maximum range</label>
          </PUIFieldLabel>
          <PUINumber v-model="maxRange" :size="-2" id="maxRange" suffix="ms" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="clearable">Clearable</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="clearable"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="clearable"
          />
        </PUIField>

        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type { PUITimezone } from '../../pui/timezone'

const state = useShowcase()
const timezone = ref<PUITimezone | 'local'>('America/New_York')
const withTime = ref(true)
const min = ref(-59011459200000)
const max = ref(8640000000000000)
const minRange = ref(86400000)
const maxRange = ref(864000000)
const clearable = ref(true)
const disabled = ref(false)
const value = ref<[number, number]>([1742996220000, 1743379200000])
</script>

<style scoped>
.pui-calendar-range {
  width: 20rem;
  max-width: 100%;
}
</style>
