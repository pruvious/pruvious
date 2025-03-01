<template>
  <Showcase>
    <PUIBadge :color="color" :size="state.size">Badge</PUIBadge>

    <template #config>
      <ShowcaseConfig>
        <PUIField>
          <PUIFieldLabel>
            <label for="color">Color</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="color"
            :choices="[
              { label: 'Primary', value: 'primary' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Accent', value: 'accent' },
              { label: 'Destructive', value: 'destructive' },
            ]"
            id="color"
          />
        </PUIField>

        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type PUIButton from '../../components/PUIButton.vue'

type Props = InstanceType<typeof PUIButton>['$props']

const state = useShowcase()
const color = ref<Props['variant']>('primary')
</script>
