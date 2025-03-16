<template>
  <Showcase>
    <PUITabs :list="list" :size="state.size" :variant="variant">
      <PUITab :name="1">
        <PUICard>
          <p>Content for tab 1</p>
        </PUICard>
      </PUITab>
      <PUITab :name="2">
        <PUICard>
          <p>Content for tab 2</p>
        </PUICard>
      </PUITab>
      <PUITab :name="3">
        <PUICard>
          <p>Content for tab 3</p>
        </PUICard>
      </PUITab>
    </PUITabs>

    <template #config>
      <ShowcaseConfig>
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
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type { PUITabListItem } from '../../components/PUITabs.vue'

const state = useShowcase()
const list: PUITabListItem<number>[] = [
  { label: 'Tab 1', name: 1 },
  { label: 'Tab 2', name: 2 },
  { label: 'Tab 3', name: 3 },
]
const variant = ref<'primary' | 'accent'>('accent')
</script>

<style scoped>
.pui-tabs {
  width: 20rem;
}
</style>
