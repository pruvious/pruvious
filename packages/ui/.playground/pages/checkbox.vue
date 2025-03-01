<template>
  <Showcase>
    <PUICheckbox
      v-model="value"
      :disabled="disabled"
      :error="state.hasErrors"
      :indeterminate="indeterminate"
      :size="state.size"
      :variant="variant"
      class="pui-checkbox"
    >
      Accept terms and conditions
      <template #description>You agree to our Terms of Service and Privacy Policy.</template>
    </PUICheckbox>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="value" />

        <PUIField>
          <PUIFieldLabel>
            <label for="indeterminate">Indeterminate</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="indeterminate"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            id="indeterminate"
          />
        </PUIField>

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
import type PUICheckbox from '../../components/PUICheckbox.vue'

type Props = InstanceType<typeof PUICheckbox>['$props']

const state = useShowcase()
const value = ref(false)
const indeterminate = ref(false)
const variant = ref<Props['variant']>('primary')
const disabled = ref(false)
</script>

<style scoped>
.pui-checkbox {
  width: 20rem;
}
</style>
