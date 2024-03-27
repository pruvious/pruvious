<template>
  <div>
    <div class="relative flex w-full flex-col items-start gap-1">
      <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
        <div v-if="options.label" class="flex gap-1 whitespace-nowrap text-vs font-medium text-gray-900">
          <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
          <span>{{ __('pruvious-dashboard', options.label as any) }}</span>
        </div>

        <PruviousIconHelp
          v-if="options.description"
          v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
          class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
        />
      </div>

      <div ref="containerEl" class="relative flex w-full gap-1.5">
        <button
          v-pruvious-tooltip="modelValue ? __('pruvious-dashboard', 'Change') : undefined"
          :disabled="disabled"
          @click="openPopup()"
          type="button"
          class="button button-white"
          :class="{
            'button-square after:absolute after:inset-0 after:bg-gray-900 after:opacity-0 after:transition hover:after:opacity-50':
              modelValue,
          }"
          :style="{ backgroundImage: modelValue ? `url(${backgroundImage})` : undefined }"
        >
          <span v-if="!modelValue">{{ __('pruvious-dashboard', 'Select icon') }}</span>
          <component
            v-if="modelValue && iconComponents[modelValue]"
            :is="iconComponents[modelValue]"
            class="relative z-10 h-4 w-4"
          />
        </button>

        <button
          v-if="modelValue"
          v-pruvious-tooltip="__('pruvious-dashboard', 'Remove')"
          :disabled="disabled"
          @click="clear()"
          type="button"
          class="button button-white-red button-square"
        >
          <PruviousIconX />
        </button>
      </div>

      <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
    </div>

    <PruviousPopup v-model:visible="popupVisible">
      <template #header>
        <h2 class="truncate text-sm">
          {{ popupTitle }}
        </h2>
      </template>

      <div v-if="choices.length" class="p-4 pb-0">
        <component
          v-model="search"
          :is="TextField"
          :options="{ placeholder: __('pruvious-dashboard', 'Search icons...'), clearable: true }"
          @update:modelValue="onSearch()"
        />
      </div>

      <div
        v-if="filteredChoices.length"
        class="grid gap-4 p-4 text-vs"
        :class="{
          'filtered': search,
          'grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]': filteredChoices.length,
        }"
      >
        <button
          v-for="{ label, name } of filteredChoices"
          v-pruvious-tooltip="label"
          @click="select(name), closePopup()"
          class="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border p-2 transition before:absolute before:inset-0 before:bg-gray-900 before:opacity-0 before:transition hover:before:opacity-50 hocus:border-primary-700"
          :style="{ backgroundImage: `url(${backgroundImage})` }"
        >
          <component :is="iconComponents[name]" class="relative !h-4/5 !w-full shrink-0" />
        </button>
      </div>

      <div v-if="!filteredChoices.length" class="p-4">
        <p class="text-sm text-gray-400">{{ __('pruvious-dashboard', 'No icons found') }}</p>
      </div>
    </PruviousPopup>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { icons, type Icon, type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent, textFieldComponent } from '#pruvious/dashboard'
import { iconImports } from '#pruvious/icons'
import backgroundImage from '../../assets/image-background.png'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isArray, searchByKeywords } from '../../utils/array'
import { titleCase } from '../../utils/string'

interface IconChoice {
  name: Icon
  label: string
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: Icon | null

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['icon']

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
  'update:modelValue': [Icon | null]
}>()

const TextField = textFieldComponent()

const choices = ref<IconChoice[]>([])
const containerEl = ref<HTMLElement>()
const filteredChoices = ref<IconChoice[]>([])
const iconComponents = Object.fromEntries(Object.entries(iconImports).map(([name, component]) => [name, component?.()]))
const popupTitle = ref('')
const popupVisible = ref(false)
const search = ref('')

const PruviousInputError = dashboardMiscComponent.InputError()
const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.options,
  () => {
    choices.value = icons
      .filter((icon) => {
        let allowed = true

        if (isArray(props.options.allow)) {
          allowed = props.options.allow.includes(icon as Icon)
        }

        if (allowed && isArray(props.options.exclude)) {
          allowed = !props.options.exclude.includes(icon as Icon)
        }

        return allowed
      })
      .map((icon) => ({ name: icon as Icon, label: titleCase(icon, false) }))

    filteredChoices.value = choices.value
  },
  { immediate: true },
)

function select(icon: Icon) {
  emit('update:modelValue', icon)
}

function onSearch() {
  filteredChoices.value = searchByKeywords(choices.value, search.value, 'label')
}

function clear() {
  emit('update:modelValue', null)
}

function openPopup() {
  popupTitle.value = props.modelValue
    ? __('pruvious-dashboard', 'Change icon')
    : __('pruvious-dashboard', 'Select icon')
  popupVisible.value = true
  search.value = ''
  onSearch()
}

function closePopup() {
  popupVisible.value = false
}
</script>
