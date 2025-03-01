<template>
  <Showcase>
    <PUIButtonGroup
      v-model="value"
      :choices="choices"
      :disabled="disabled"
      :error="state.hasErrors"
      :size="state.size"
      :variant="variant"
      id="button-group"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="value" />

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

        <ShowcaseSize />
        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type PUIButtonGroup from '../../components/PUIButtonGroup.vue'

type Props = InstanceType<typeof PUIButtonGroup>['$props']

const state = useShowcase()
const choices = [
  { label: 'String', value: 'foo' },
  { label: 'Number', value: 1337 },
  { label: 'Boolean', value: true },
]
const value = ref('foo')
const variant = ref<Props['variant']>('primary')
const disabled = ref(false)
</script>
