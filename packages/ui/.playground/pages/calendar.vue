<template>
  <Showcase>
    <PUICalendar
      v-model="value"
      :clearable="clearable"
      :disabled="disabled"
      :error="state.hasErrors"
      :max="max"
      :min="min"
      :size="state.size"
      :timezone="timezone"
      :withTime="withTime"
      id="calendar"
      placeholder="Placeholder..."
      class="pui-calendar"
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
const min = ref(1740960000000)
const max = ref(8640000000000000)
const clearable = ref(true)
const disabled = ref(false)
const value = ref(1742996220000)
</script>

<style scoped>
.pui-calendar {
  width: 20rem;
  max-width: 100%;
}
</style>
