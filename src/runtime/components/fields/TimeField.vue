<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <div
        v-if="options.label"
        @click="picker.open()"
        @mouseenter="labelHovered = true"
        @mouseleave="labelHovered = false"
        class="flex cursor-default gap-1 whitespace-nowrap text-vs font-medium text-gray-900"
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

    <div
      class="min-h-9 w-full rounded-md border bg-white text-sm transition focus-within:border-primary-700 focus-within:ring"
      :class="{
        'hover:border-primary-700': !disabled,
        'border-primary-700': labelHovered && !disabled,
      }"
    >
      <div
        @keydown="onKeyDown"
        class="relative h-[2.125rem] w-full"
        :class="{
          'form-control:pr-9': options.clearable && !options.required && modelValue !== null && !disabled,
          'form-control:pointer-events-none form-control:text-gray-400': disabled,
        }"
      >
        <input
          :disabled="disabled"
          :id="id"
          :name="name"
          :placeholder="options.placeholder"
          :required="options.required"
          autocomplete="off"
          ref="inputEl"
          spellcheck="false"
          type="text"
          class="h-full w-full truncate rounded-md bg-white px-2.5 text-sm outline-none transition placeholder:text-gray-300"
        />

        <button
          v-if="options.clearable && !options.required && modelValue !== null && !disabled"
          v-pruvious-tooltip="{ content: __('pruvious-dashboard', 'Clear'), offset: [0, 8] }"
          @click="picker.clear(), update()"
          type="button"
          class="absolute right-2.5 top-1/2 -mt-2 h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconX />
        </button>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import flatpickr from 'flatpickr'
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance'
import { getHotkeyAction } from '../../composables/dashboard/hotkeys'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { useUser } from '../../composables/user'
import { isNull } from '../../utils/common'
import { dayjs } from '../../utils/dashboard/dayjs'
import { blurActiveElement } from '../../utils/dom'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: number | null

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['time']

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
  'update:modelValue': [number | null]
}>()

const user = useUser()

const format = user.value ? user.value.timeFormat : 'HH:mm:ss'
const id = pruviousUnique('time-field')
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'time-field')
const inputEl = ref<HTMLInputElement>()

const PruviousInputError = dashboardMiscComponent.InputError()

let picker: FlatpickrInstance

await loadTranslatableStrings('pruvious-dashboard')

onMounted(() => {
  picker = flatpickr(inputEl.value!, {
    altInput: true,
    altFormat: format,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    disableMobile: true,
    enableTime: true,
    enableSeconds: true,
    formatDate: (date, format) => {
      return dayjs(date).format(format)
    },
    minuteIncrement: 1,
    noCalendar: true,
    parseDate: (date, format) => {
      let dayjsDate: dayjs.Dayjs = dayjs(date, format)
      dayjsDate = dayjsDate.subtract(dayjsDate.utcOffset() * 60000)
      return dayjsDate.toDate()
    },
    minDate: dayjs(props.options.min)
      .subtract(dayjs(props.options.min).utcOffset() * 60000)
      .toDate(),
    maxDate: dayjs(props.options.max)
      .subtract(dayjs(props.options.max).utcOffset() * 60000)
      .toDate(),
    onClose: () => {
      blurActiveElement()
      update()
    },
    static: true,
    time_24hr: format.includes('H'),
  })

  watch(
    () => props.modelValue,
    (value) => {
      if (isNull(value)) {
        picker.clear()
      } else {
        picker.setDate(dayjs(value).toISOString())
      }
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  picker?.destroy()
})

function update() {
  if (inputEl.value!.value) {
    let date = dayjs(inputEl.value!.value, format)
    date = date.add(date.utcOffset() * 60000)
    emit('update:modelValue', getTime(date.toDate()))
  } else {
    emit('update:modelValue', null)
    setTimeout(() => picker.clear())
  }
}

function getTime(date: Date) {
  return (
    (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) * 1000 + date.getUTCMilliseconds()
  )
}

function onKeyDown(event: KeyboardEvent) {
  const action = getHotkeyAction(event)

  if (action === 'save') {
    picker.close()
    event.preventDefault()
    event.stopPropagation()
  }
}
</script>
