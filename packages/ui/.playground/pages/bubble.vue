<template>
  <Showcase>
    <div class="pui-bubble-wrapper">
      <PUIBubble :size="state.size" :variant="variant">64</PUIBubble>
    </div>

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
              { label: 'Secondary', value: 'secondary' },
              { label: 'Accent', value: 'accent' },
              { label: 'Destructive', value: 'destructive' },
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
import type PUIBubble from '../../components/PUIBubble.vue'

type Props = InstanceType<typeof PUIBubble>['$props']

const state = useShowcase()
const variant = ref<Props['variant']>('primary')
</script>

<style scoped>
.pui-bubble-wrapper {
  display: flex;
}
</style>
