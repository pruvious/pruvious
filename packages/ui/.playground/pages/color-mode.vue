<template>
  <Showcase>
    <PUIColorMode
      :disabled="disabled"
      :size="state.size"
      :variant="variant"
      :withSystem="withSystem"
      id="color-mode-2"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue label="Color mode">
          <ColorScheme placeholder="...">
            {{ $colorMode.value }}
          </ColorScheme>
        </ShowcaseValue>
        <ShowcaseValue :value="$colorMode.preference" label="Color preference" />

        <PUIField>
          <PUIFieldLabel>
            <label for="with-system">With system</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="withSystem"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="with-system"
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
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type PUIColorMode from '../../components/PUIColorMode.vue'

type Props = InstanceType<typeof PUIColorMode>['$props']

const state = useShowcase()
const withSystem = ref(true)
const variant = ref<Props['variant']>('primary')
const disabled = ref(false)
</script>
