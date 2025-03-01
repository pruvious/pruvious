<template>
  <Showcase>
    <div class="container">
      <PUIButton :disabled="disabled" :size="state.size" :variant="variant">Button</PUIButton>
      <PUIButton :disabled="disabled" :size="state.size" :variant="variant">
        <Icon mode="svg" name="tabler:power" />
      </PUIButton>
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
              { label: 'Outline', value: 'outline' },
              { label: 'Ghost', value: 'ghost' },
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
import type PUIButton from '../../components/PUIButton.vue'

type Props = InstanceType<typeof PUIButton>['$props']

const state = useShowcase()
const variant = ref<Props['variant']>('primary')
const disabled = ref(false)
</script>

<style scoped>
.container {
  display: flex;
  gap: 0.5em;
}
</style>
