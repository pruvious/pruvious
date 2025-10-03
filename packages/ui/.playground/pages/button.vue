<template>
  <Showcase>
    <div class="container">
      <PUIButton :destructiveHover="destructiveHover" :disabled="disabled" :size="state.size" :variant="variant">
        Button
      </PUIButton>

      <PUIButton :destructiveHover="destructiveHover" :disabled="disabled" :size="state.size" :variant="variant">
        <Icon mode="svg" name="tabler:power" />
        <template v-if="bubble" #bubble>
          <PUIBubble :size="state.size" :variant="variant === 'primary' ? 'destructive' : 'primary'" />
        </template>
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

        <PUIField>
          <PUIFieldLabel>
            <label for="destructiveHover">Destructive on hover</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="destructiveHover"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            id="destructiveHover"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="bubble">Bubble</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="bubble"
            :choices="[
              { label: 'Hide', value: false },
              { label: 'Show', value: true },
            ]"
            id="bubble"
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
const destructiveHover = ref(false)
const bubble = ref(false)
const disabled = ref(false)
</script>

<style scoped>
.container {
  display: flex;
  gap: 0.5em;
}
</style>
