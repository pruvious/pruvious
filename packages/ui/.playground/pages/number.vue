<template>
  <Showcase>
    <PUINumber
      v-model="value"
      :autoWidth="autoWidth"
      :decimals="decimals"
      :disabled="disabled"
      :dragDirection="dragDirection"
      :error="state.hasErrors"
      :max="max"
      :min="min"
      :showDragButton="showDragButton"
      :showSteppers="showSteppers"
      :size="state.size"
      id="number"
      placeholder="Placeholder..."
      suffix="px"
      :style="{ width: autoWidth ? undefined : '16rem' }"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="size">Minimum</label>
          </PUIFieldLabel>
          <PUINumber v-model="min" :size="-2" id="min" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="size">Maximum</label>
          </PUIFieldLabel>
          <PUINumber v-model="max" :size="-2" id="max" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="size">Decimals</label>
          </PUIFieldLabel>
          <PUINumber v-model="decimals" :min="0" :size="-2" id="decimals" />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="auto-width">Auto width</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="autoWidth"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="auto-width"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="show-drag-button">Show drag button</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="showDragButton"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="show-drag-button"
          />
        </PUIField>

        <PUIField v-if="showDragButton">
          <PUIFieldLabel>
            <label for="drag-direction">Drag direction</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="dragDirection"
            :choices="[
              { label: 'Horizontal', value: 'horizontal' },
              { label: 'Vertical', value: 'vertical' },
            ]"
            :size="-2"
            id="drag-direction"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="show-steppers">Show steppers</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="showSteppers"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="show-steppers"
          />
        </PUIField>

        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type PUINumber from '../../components/PUINumber.vue'

type Props = InstanceType<typeof PUINumber>['$props']

const state = useShowcase()
const min = ref(-65353)
const max = ref(65353)
const decimals = ref(0)
const autoWidth = ref(false)
const showDragButton = ref(false)
const showSteppers = ref(false)
const dragDirection = ref<Props['dragDirection']>('horizontal')
const disabled = ref(false)
const value = ref(0)
</script>
