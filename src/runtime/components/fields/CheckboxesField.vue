<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full cursor-default items-end justify-between gap-4">
      <div
        v-if="options.label"
        @click="onFocus()"
        class="flex gap-1 whitespace-nowrap text-vs font-medium text-gray-900"
      >
        <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
        <span>{{ __('pruvious-dashboard', options.label as any) }}</span>
      </div>

      <PruviousIconHelp
        v-if="options.description"
        v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
        class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
    </div>

    <div ref="containerEl" class="flex flex-col items-start gap-1">
      <component
        v-for="choice of choices"
        :disabled="disabled"
        :ignoreAutofocus="ignoreAutofocus"
        :is="CheckboxField"
        :isSortable="options.sortable"
        :key="choice.value"
        :modelValue="choice.selected"
        :options="{ label: choice.label, name }"
        @update:modelValue="$event ? select(choice) : deselect(choice)"
      />
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />

    <DevOnly>
      <PruviousDump>
        <div>Choices (options): {{ Object.keys(options.choices) }}</div>
      </PruviousDump>

      <PruviousDump>
        <div>Choices (generated): {{ choices.map(({ value }) => value) }}</div>
      </PruviousDump>
    </DevOnly>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { checkboxFieldComponent, dashboardMiscComponent } from '#pruvious/dashboard'
import type { UseSortableReturn } from '@vueuse/integrations/useSortable'
import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { defaultSortableOptions } from '../../utils/dashboard/defaults'

interface Choice {
  value: string
  label: string
  selected: boolean
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string[]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['checkboxes']

  /**
   * Represents the unique identifier of the field within the form.
   * If not provided, a unique identifier will be automatically generated.
   */
  fieldKey?: string

  /**
   * Represents a dictionary of all errors, where the key is the complete field name and the value is the associated error message.
   * The field name is represented in dot-notation (e.g., `repeater.0.subfieldName`).
   */
  errors?: Record<string, string>

  /**
   * Indicates whether the field is disabled.
   * By default, the field is enabled.
   */
  disabled?: boolean

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [string[]]
  'updateChoices': [Record<string, string>]
}>()

const choices = ref<Choice[]>([])
const containerEl = ref<HTMLElement>()
const name = props.options.name || pruviousUnique(props.fieldKey || 'checkboxes-field')

const CheckboxField = checkboxFieldComponent()
const PruviousInputError = dashboardMiscComponent.InputError()

let sortableReturn: UseSortableReturn | undefined

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => refresh(),
  { immediate: true },
)

watch(
  () => props.options.choices,
  () => refresh(),
)

watch(
  () => props.options.sortable,
  () => {
    sortableReturn?.stop()

    if (props.options.sortable) {
      sortableReturn = useSortable(() => containerEl.value, choices.value, {
        ...defaultSortableOptions,
        onUpdate: (e: any) => {
          moveArrayElement(choices.value, e.oldIndex, e.newIndex)

          setTimeout(() => {
            emit(
              'updateChoices',
              Object.fromEntries(
                choices.value.map(({ value }) => [
                  value,
                  __('pruvious-dashboard', props.options.choices[value] as any),
                ]),
              ),
            )
            emitModelValue()
          })
        },
      })
    }
  },
  { immediate: true },
)

function onFocus() {
  containerEl.value?.querySelector('input')?.focus()
}

function select(choice: Choice) {
  choice.selected = true
  emitModelValue()
}

function deselect(choice: Choice) {
  choice.selected = false
  emitModelValue()
}

function emitModelValue() {
  emit(
    'update:modelValue',
    choices.value.filter(({ selected }) => selected).map(({ value }) => value),
  )
}

function refresh() {
  choices.value = Object.entries(props.options.choices)
    .map(([value, label]) => ({
      value,
      label: __('pruvious-dashboard', label as any),
      selected: props.modelValue.includes(value),
    }))
    .sort((a, b) => {
      if (props.options.sortable) {
        if (a.selected && b.selected) {
          return props.modelValue.indexOf(a.value) - props.modelValue.indexOf(b.value)
        } else if (a.selected) {
          return -1
        } else if (b.selected) {
          return 1
        }
      }

      return 0
    })
}
</script>
