<template>
  <ul v-if="chips.length" class="flex flex-wrap gap-1.5">
    <li
      v-for="{ label, value } of chips"
      v-pruvious-tooltip="options.tooltips ? value : ''"
      :title="options.tooltips ? undefined : value"
      class="whitespace-nowrap rounded-full bg-primary-100 px-2.5 py-0.5 text-vs"
    >
      {{ label ?? value }}
    </li>
  </ul>

  <PruviousStringFieldPreview
    v-if="!chips.length"
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="''"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { Choice } from '../fields/SelectField.vue'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Array<string>,
  },
  options: {
    type: Object,
    required: true,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object as PropType<Record<string, any>>,
  },
  language: {
    type: String,
  },
})

defineEmits<{
  refresh: []
}>()

const chips = ref<Choice[]>([])

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  () => {
    chips.value =
      props.value?.map((value) => ({
        value,
        label: __('pruvious-dashboard', props.options.choices[value] as any),
      })) ?? []
  },
  { immediate: true },
)
</script>
