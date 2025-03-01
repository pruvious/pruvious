<template>
  <Showcase>
    <PUISwitch
      v-model="marketing"
      :disabled="disabled"
      :error="state.hasErrors"
      :size="state.size"
      :variant="variant"
      class="pui-switch"
    >
      Marketing
    </PUISwitch>

    <PUISwitch
      v-model="analytics"
      :disabled="disabled"
      :error="state.hasErrors"
      :size="state.size"
      :variant="variant"
      class="pui-switch"
    >
      Analytics
    </PUISwitch>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="marketing" label="Marketing" />
        <ShowcaseValue :value="analytics" label="Analytics" />

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
const marketing = ref(false)
const analytics = ref(false)
const disabled = ref(false)
const variant = ref<Props['variant']>('primary')
</script>

<style scoped>
.pui-switch {
  width: 20rem;
}
</style>
