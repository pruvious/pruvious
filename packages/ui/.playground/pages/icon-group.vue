<template>
  <Showcase>
    <PUIIconGroup
      v-model="value"
      :choices="choices"
      :disabled="disabled"
      :error="state.hasErrors"
      :showTooltips="showTooltips"
      :size="state.size"
      :variant="variant"
      id="icon-group"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="value" />
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="variant">Variant</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="variant"
            :choices="[
              { label: 'Primary', value: 'primary' },
              { label: 'Accent', value: 'accent' },
            ]"
            id="variant"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="showTooltips">Show tooltips</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="showTooltips"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            id="showTooltips"
          />
        </PUIField>

        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import type PUIIconGroup from '../../components/PUIIconGroup.vue'

type Props = InstanceType<typeof PUIIconGroup>['$props']

const choices: Props['choices'] = [
  { value: 'foo', icon: 'letter-case', title: 'Text' },
  { value: 1337, icon: 'number', title: 'Number' },
  { value: true, icon: h(Icon, { name: 'tabler:power' }), title: 'Boolean' },
]

const state = useShowcase()
const value = ref(1337)
const variant = ref<Props['variant']>('primary')
const showTooltips = ref(false)
const disabled = ref(false)
</script>
