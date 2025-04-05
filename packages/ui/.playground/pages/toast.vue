<template>
  <Showcase>
    <PUIButton :size="state.size" @click="showToast()">Show toast</PUIButton>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="type">Type</label>
          </PUIFieldLabel>
          <PUISelect
            v-model:modelValue="type"
            :choices="[
              { label: 'Default', value: 'default' },
              { label: 'Success', value: 'success' },
              { label: 'Error', value: 'error' },
              { label: 'Info', value: 'info' },
              { label: 'Warning', value: 'warning' },
            ]"
            @update:modelValue="showToast()"
            id="type"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="action-button">Action button</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="actionButton"
            :choices="[
              { label: 'Hide', value: false },
              { label: 'Show', value: true },
            ]"
            :size="-2"
            @update:modelValue="showToast()"
            id="action-button"
          />
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import { puiToast } from '../../pui/toast'

const state = useShowcase()
const type = ref<'default' | 'success' | 'error' | 'info' | 'warning'>('default')
const actionButton = ref(false)

function showToast() {
  puiToast('Hello!', {
    action: actionButton.value ? { label: 'Close' } : undefined,
    description:
      'This message is created using the `toast()` function from [Vue Sonner](https://github.com/xiaoluoboding/vue-sonner).',
    duration: actionButton.value ? Infinity : undefined,
    type: type.value,
  })
}
</script>
