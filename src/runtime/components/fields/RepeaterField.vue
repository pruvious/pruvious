<template>
  <div ref="containerEl" class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <div
        v-if="options.label"
        @click="onClickLabel()"
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

    <div ref="sortableEl" class="w-full -space-y-px">
      <div
        v-for="(item, i) of modelValue"
        :data-index="i + 1"
        :key="`${sortableKey[i] ?? 0}-${i}`"
        class="relative flex"
      >
        <div
          class="sortable-handle relative flex shrink-0 cursor-move items-center justify-center border border-r-0 bg-gray-50 py-4 text-xs text-gray-400"
          :class="{
            'pointer-events-none': disabled,
            'rounded-tl-md': i === 0,
            'rounded-bl-md': i === modelValue.length - 1,
            'w-4': compact,
            'w-6': !compact,
          }"
        >
          <span class="text-upright parent-hocus:hidden sorting:block">{{ i + 1 }}</span>
          <PruviousIconGripVertical class="hidden h-4 w-4 parent-hocus:block sorting:hidden" />

          <div
            class="absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 -translate-y-1/2 parent-hocus:flex sorting:!hidden"
            :class="{ 'parent-hocus:hidden': i === 0 }"
          >
            <button
              v-if="!disabled"
              v-pruvious-tooltip="__('pruvious-dashboard', 'Move up')"
              @click="moveItem(i, -1)"
              type="button"
              class="button button-white button-circle-xs !text-gray-400 hocus:!text-primary-700"
            >
              <PruviousIconChevronUp />
            </button>
          </div>

          <div
            class="absolute -bottom-px left-1/2 z-10 hidden -translate-x-1/2 translate-y-1/2 parent-hocus:flex sorting:!hidden"
            :class="{ 'parent-hocus:hidden': i === modelValue.length - 1 }"
          >
            <button
              v-if="!disabled"
              v-pruvious-tooltip="__('pruvious-dashboard', 'Move down')"
              @click="moveItem(i, 1)"
              type="button"
              class="button button-white button-circle-xs !text-gray-400 hocus:!text-primary-700"
            >
              <PruviousIconChevronDown />
            </button>
          </div>
        </div>

        <PruviousFieldLayout
          :canUpdate="!disabled"
          :collectionRecord="record"
          :compact="compact"
          :errors="errors ?? {}"
          :fieldLayout="fieldLayout"
          :fieldsDeclaration="(options.subfields as any)"
          :history="history"
          :keyPrefix="`${fieldKey}.${i}.`"
          :record="item"
          :resolvedConditionalLogic="resolvedConditionalLogic"
          @update:errors="$emit('update:errors', $event)"
          @update:record="$emit('update:modelValue', [...modelValue.slice(0, i), $event, ...modelValue.slice(i + 1)])"
          class="min-w-0 children:rounded-none parent-hover:rounded-none parent-hover:children:rounded-none"
          :class="{
            'rounded-tr-md children:rounded-tr-md': i === 0,
            'rounded-br-md children:rounded-br-md': i === modelValue.length - 1,
            'border bg-white p-4': compact,
          }"
        />

        <div
          v-if="!disabled"
          class="hidden shrink-0 flex-col items-center justify-center border border-l-0 bg-gray-50 py-2 parent-hocus:flex sorting:hidden"
          :class="{
            'w-4 gap-1.5': compact,
            'w-6 gap-2': !compact,
            'rounded-tr-md': i === 0,
            'rounded-br-md': i === modelValue.length - 1,
          }"
        >
          <button
            v-pruvious-tooltip="__('pruvious-dashboard', 'Duplicate')"
            @click="duplicateItem(i)"
            type="button"
            class="text-gray-400 transition hocus:text-primary-700"
            :class="{
            'hidden': modelValue.length >= options.max!,
            'h-3.5 w-3.5': compact,
            'h-4 w-4': !compact
          }"
          >
            <PruviousIconCopy />
          </button>

          <button
            v-pruvious-tooltip="{
              content:
                clickConfirmation?.id === `delete-repeater-item-${fieldKey}-${i}`
                  ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                  : __('pruvious-dashboard', 'Delete'),
              showOnCreate: clickConfirmation?.id === `delete-repeater-item-${fieldKey}-${i}`,
            }"
            @click="deleteItem(i, $event)"
            type="button"
            class="h-4 w-4 text-gray-400 transition hocus:text-red-500"
            :class="{
              'h-3.5 w-3.5': compact,
              'h-4 w-4': !compact,
            }"
          >
            <PruviousIconTrash />
          </button>
        </div>

        <div
          class="absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 -translate-y-1/2 parent-hocus:flex sorting:!hidden"
          :class="{ 'parent-hocus:hidden': modelValue.length >= options.max! }"
        >
          <button
            v-if="!disabled"
            v-pruvious-tooltip="__('pruvious-dashboard', '$add before', {add: options.addLabel!})"
            @click="addItem(i)"
            type="button"
            class="button button-white button-circle-xs !text-gray-400 hocus:!text-primary-700"
          >
            <PruviousIconPlus />
          </button>
        </div>

        <div
          class="absolute bottom-px left-1/2 z-10 hidden -translate-x-1/2 translate-y-1/2 parent-hocus:flex sorting:!hidden"
          :class="{ 'parent-hocus:hidden': modelValue.length >= options.max! }"
        >
          <button
            v-if="!disabled"
            v-pruvious-tooltip="__('pruvious-dashboard', '$add after', {add: options.addLabel!})"
            @click="addItem(i + 1)"
            type="button"
            class="button button-white button-circle-xs !text-gray-400 hocus:!text-primary-700"
          >
            <PruviousIconPlus />
          </button>
        </div>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />

    <div
      class="flex w-full"
      :class="{
        'mt-1.5': modelValue.length && compact,
        'mt-2': modelValue.length && !compact,
      }"
    >
      <button
        :disabled="( modelValue.length >= options.max!) || disabled"
        @click="addItem()"
        type="button"
        class="button button-white"
      >
        <span>{{ options.addLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from '#imports'
import type { FieldLayout, StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent, defaultFieldValues } from '#pruvious/dashboard'
import type { UseSortableReturn } from '@vueuse/integrations/useSortable'
import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { startMoving } from '../../composables/dashboard/move'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isDefined, isUndefined } from '../../utils/common'
import { defaultSortableOptions } from '../../utils/dashboard/defaults'
import type { History } from '../../utils/dashboard/history'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: any[]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['repeater']

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
   * The current collection record as a reactive key-value object, containing all field names and their values.
   */
  record: Record<string, any>

  /**
   * Indicates whether the field is in compact mode.
   * By default, the field is not in compact mode.
   */
  compact?: boolean

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean

  /**
   * The resolved conditional logic for all fields.
   */
  resolvedConditionalLogic: Record<string, boolean>

  /**
   * The `History` instance for the current record.
   */
  history: History
}>()

const emit = defineEmits<{
  'update:modelValue': [any[]]
  'update:errors': [Record<string, string>]
}>()

const clickConfirmation = useClickConfirmation()

const containerEl = ref<HTMLElement>()
const fieldLayout = ref<FieldLayout[]>([])
const sortableEl = ref<HTMLElement>()
const sortableKey = ref<number[]>([])

const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()
const PruviousInputError = dashboardMiscComponent.InputError()

let sortableReturn: UseSortableReturn | undefined

watch(
  () => props.modelValue,
  () => refreshSortable(),
  { immediate: true },
)

watch(
  () => props.options,
  () => {
    fieldLayout.value = props.options.fieldLayout ?? Object.keys(props.options.subfields).map((fieldName) => fieldName)
  },
  { immediate: true },
)

onMounted(refreshSortable)

await loadTranslatableStrings('pruvious-dashboard')

function onClickLabel() {
  if (!props.disabled) {
    ;(
      containerEl.value?.querySelector(
        'a:not([disabled]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ) as HTMLElement
    )?.focus()
  }
}

function addItem(index?: number) {
  const newItem: Record<string, any> = {}
  const array = [...props.modelValue]

  for (const [subfieldName, subfield] of Object.entries(props.options.subfields)) {
    newItem[subfieldName] = JSON.parse(
      JSON.stringify(
        isDefined(subfield.options.default) ? subfield.options.default : defaultFieldValues[subfield.type],
      ),
    )
  }

  if (isUndefined(index)) {
    array.push(newItem)
  } else {
    array.splice(index, 0, newItem)
  }

  emit('update:modelValue', array)
  refreshSortable()
}

function duplicateItem(index: number) {
  props.modelValue.splice(index + 1, 0, JSON.parse(JSON.stringify(props.modelValue[index])))
  emit('update:modelValue', props.modelValue)
  refreshSortable()

  if (props.errors) {
    emit(
      'update:errors',
      Object.fromEntries(Object.entries(props.errors).filter(([key]) => !key.startsWith(`${props.fieldKey}.`))),
    )
  }
}

function moveItem(index: number, offset: number) {
  const item = props.modelValue[index]
  props.modelValue[index] = props.modelValue[index + offset]
  props.modelValue[index + offset] = item
  emit('update:modelValue', props.modelValue)

  if (props.errors) {
    emit(
      'update:errors',
      Object.fromEntries(
        Object.entries(props.errors).map(([key, value]) => [
          key.startsWith(`${props.fieldKey}.${index}.`)
            ? key.replace(`${props.fieldKey}.${index}.`, `${props.fieldKey}.${index + offset}.`)
            : key.startsWith(`${props.fieldKey}.${index + offset}.`)
            ? key.replace(`${props.fieldKey}.${index + offset}.`, `${props.fieldKey}.${index}.`)
            : key,
          value,
        ]),
      ),
    )
  }

  refreshSortable()
}

function deleteItem(index: number, event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: `delete-repeater-item-${props.fieldKey}-${index}`,
    success: () => {
      props.modelValue.splice(index, 1)
      emit('update:modelValue', props.modelValue)
      refreshSortable()

      if (props.errors) {
        emit(
          'update:errors',
          Object.fromEntries(Object.entries(props.errors).filter(([key]) => !key.startsWith(`${props.fieldKey}.`))),
        )
      }
    },
  })
}

function refreshSortable() {
  setTimeout(() => {
    sortableReturn?.stop()

    sortableReturn = useSortable(() => sortableEl.value, props.modelValue, {
      ...defaultSortableOptions,
      handle: '.sortable-handle',
      onUpdate: (e: any) => {
        moveArrayElement(props.modelValue, e.oldIndex, e.newIndex)

        sortableKey.value[e.oldIndex] = (sortableKey.value[e.oldIndex] ?? 0) + 1
        sortableKey.value[e.newIndex] = (sortableKey.value[e.newIndex] ?? 0) + 1

        setTimeout(() => {
          emit('update:modelValue', props.modelValue)

          if (props.errors) {
            emit(
              'update:errors',
              Object.fromEntries(
                Object.entries(props.errors).map(([key, value]) => [
                  key.startsWith(`${props.fieldKey}.${e.oldIndex}.`)
                    ? key.replace(`${props.fieldKey}.${e.oldIndex}.`, `${props.fieldKey}.${e.newIndex}.`)
                    : key.startsWith(`${props.fieldKey}.${e.newIndex}.`)
                    ? key.replace(`${props.fieldKey}.${e.newIndex}.`, `${props.fieldKey}.${e.oldIndex}.`)
                    : key,
                  value,
                ]),
              ),
            )
          }
        })
      },
      setData: (dataTransfer: DataTransfer, el: HTMLDivElement) => {
        startMoving({ dragImageLabel: `#${el.dataset.index}` })
        dataTransfer.setDragImage(document.getElementById('pruvious-drag-image')!, -16, 10)
        dataTransfer.effectAllowed = 'move'
      },
    })
  })
}
</script>
