<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <div
        v-if="options.label"
        @click="picker0.open()"
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
      <div @keydown="onKeyDown" class="relative h-[2.125rem] w-full">
        <div class="flex h-full divide-x">
          <div
            v-for="i in 2"
            class="relative flex-1"
            :class="{
              'pr-2': i === 1,
              'pl-2': i === 2,
              'form-control:pr-9':
                options.clearable &&
                (typeof options.clearable === 'boolean' || options.clearable[i - 1]) &&
                !options.required &&
                modelValue[i - 1] !== null &&
                !disabled,
              'form-control:pointer-events-none form-control:text-gray-400': disabled,
            }"
          >
            <input
              :disabled="disabled"
              :id="id"
              :name="name[i - 1]"
              :placeholder="__('pruvious-dashboard', (typeof options.placeholder === 'object' ? options.placeholder[i - 1] : options.placeholder) as any)"
              :required="options.required"
              autocomplete="off"
              ref="inputEls"
              spellcheck="false"
              type="text"
              class="h-full w-full truncate rounded-md bg-white px-2.5 text-sm outline-none transition placeholder:text-gray-300"
            />

            <button
              v-if="
                options.clearable &&
                (typeof options.clearable === 'boolean' || options.clearable[i - 1]) &&
                !options.required &&
                modelValue[i - 1] !== null &&
                !disabled
              "
              v-pruvious-tooltip="{ content: __('pruvious-dashboard', 'Clear'), offset: [0, 8] }"
              @click="i === 1 ? picker0.clear() : picker1.clear(), update()"
              type="button"
              class="absolute right-2.5 top-1/2 -mt-2 h-4 w-4 text-gray-400 transition hocus:text-primary-700"
              :class="{ 'mr-2': i === 1 }"
            >
              <PruviousIconX />
            </button>
          </div>
        </div>

        <div
          class="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white"
        >
          <PruviousIconArrowsHorizontal class="m-auto h-3 w-3" />
        </div>
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
import { isArray } from '../../utils/array'
import { isNull } from '../../utils/common'
import { dayjs } from '../../utils/dashboard/dayjs'
import { blurActiveElement } from '../../utils/dom'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: [number | null, number | null]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['date-range']

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
  'update:modelValue': [[number | null, number | null]]
}>()

const user = useUser()

const format = user.value ? user.value.dateFormat : 'YYYY-MM-DD'
const id = pruviousUnique('date-range-field')
const labelHovered = ref<boolean>(false)
const name = [
  pruviousUnique(
    (isArray(props.options.name) ? props.options.name[0] : props.options.name) || props.fieldKey || 'date-range-field',
  ),
  pruviousUnique(
    (isArray(props.options.name) ? props.options.name[1] : props.options.name) || props.fieldKey || 'date-range-field',
  ),
]
const inputEls = ref<HTMLInputElement[]>()

const PruviousInputError = dashboardMiscComponent.InputError()

let picker0: FlatpickrInstance
let picker1: FlatpickrInstance

await loadTranslatableStrings('pruvious-dashboard')

onMounted(() => {
  for (let i = 0; i < 2; i++) {
    const picker = flatpickr(inputEls.value![i], {
      altInput: true,
      altFormat: format,
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      disableMobile: true,
      enableTime: false,
      enableSeconds: false,
      formatDate: (date, format) => {
        return dayjs(date).format(format)
      },
      minuteIncrement: 1,
      noCalendar: false,
      parseDate: (date, format) => {
        let dayjsDate: dayjs.Dayjs = dayjs(date, format)
        dayjsDate = dayjsDate.subtract(dayjsDate.utcOffset() * 60000)
        return dayjsDate.toDate()
      },
      minDate: toMinMaxDate(props.options.min!),
      maxDate: toMinMaxDate(props.options.max!),
      onClose: () => {
        blurActiveElement()
        update()
      },
      static: true,
      position: ({ calendarContainer }) => {
        if (i === 1) {
          calendarContainer.style.right = '0'
        }
      },
    })

    if (i === 0) {
      picker0 = picker
    } else {
      picker1 = picker
    }
  }

  watch(
    () => props.modelValue,
    (value) => {
      picker1.set(
        'minDate',
        isNull(value[0]) ? toMinMaxDate(props.options.min!) : toMinMaxDate(Math.max(value[0], props.options.min!)),
      )

      picker0.set(
        'maxDate',
        isNull(value[1]) ? toMinMaxDate(props.options.max!) : toMinMaxDate(Math.min(value[1], props.options.max!)),
      )

      if (isNull(value[0])) {
        picker0.clear()
      } else {
        picker0.setDate(dayjs(value[0]).toISOString())
      }

      if (isNull(value[1])) {
        picker1.clear()
      } else {
        picker1.setDate(dayjs(value[1]).toISOString())
      }
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  picker0?.destroy()
  picker1?.destroy()
  inputEls.value = []
})

function update() {
  let date0 = inputEls.value![0].value ? dayjs(inputEls.value![0].value, format) : null
  let date1 = inputEls.value![1].value ? dayjs(inputEls.value![1].value, format) : null

  if (date0) {
    date0 = date0.add(date0.utcOffset() * 60000)
  }

  if (date1) {
    date1 = date1.add(date1.utcOffset() * 60000)
  }

  emit('update:modelValue', [date0?.toDate().getTime() ?? null, date1?.toDate().getTime() ?? null])
}

function toMinMaxDate(timestamp: number) {
  return dayjs(timestamp)
    .subtract(dayjs(timestamp).utcOffset() * 60000)
    .toDate()
}

function onKeyDown(event: KeyboardEvent) {
  const action = getHotkeyAction(event)

  if (action === 'save') {
    picker0.close()
    picker1.close()
    event.preventDefault()
    event.stopPropagation()
  }
}
</script>
