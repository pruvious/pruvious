<template>
  <div>
    <div
      class="relative flex items-end px-4 pt-4 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gray-200"
    >
      <span v-for="(tab, i) of tabs" class="relative flex overflow-hidden pb-px">
        <button
          :title="tab.label"
          @click="activeTab = i"
          type="button"
          class="flex h-9 items-center gap-2 overflow-hidden border-r border-t px-3 text-sm transition"
          :class="{
            'cursor-default': i === activeTab,
            'text-gray-400 hocus:text-primary-700': i !== activeTab,
            'rounded-tl-md border-l': i === 0,
            'rounded-tr-md': i === tabs.length - 1,
          }"
        >
          <span class="truncate">
            {{ tab.label }}
          </span>

          <span
            v-if="tabErrors[i]"
            v-pruvious-tooltip="__('pruvious-dashboard', '$count $errors found', { count: tabErrors[i] })"
            class="errors"
          >
            {{ tabErrors[i] }}
          </span>
        </button>

        <span
          v-if="i === activeTab"
          class="absolute bottom-0 right-px h-px bg-white"
          :class="{
            'left-px': i === 0,
            'left-0': i > 0,
          }"
        ></span>
      </span>
    </div>

    <template v-for="(tab, i) of tabs">
      <PruviousFieldLayout
        v-if="i === activeTab"
        :canUpdate="canUpdate"
        :collectionRecord="collectionRecord"
        :compact="compact"
        :errors="errors"
        :fieldLayout="tab.fields"
        :fieldsDeclaration="fieldsDeclaration"
        :history="history"
        :isEditing="isEditing"
        :keyPrefix="keyPrefix"
        :record="record"
        :resolvedConditionalLogic="resolvedConditionalLogic"
        :tabbed="true"
        @update:errors="$emit('update:errors', $event)"
        @update:record="$emit('update:record', $event)"
        class="w-full !border-t-0 children:bg-transparent"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { type Field, type FieldLayout } from '#pruvious'
import { dashboardMiscComponent, fields } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { History } from '../../utils/dashboard/history'

const props = defineProps({
  /**
   * The current record containing the fields that are being edited.
   */
  record: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },

  /**
   * The top level collection record.
   */
  collectionRecord: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  tabs: {
    type: Object as PropType<
      {
        label: string
        fields: FieldLayout[]
        fieldKeys: string[]
      }[]
    >,
    required: true,
  },
  fieldsDeclaration: {
    type: Object as PropType<Record<string, Pick<Field, 'options' | 'type'>>>,
    required: true,
  },
  resolvedConditionalLogic: {
    type: Object as PropType<Record<string, boolean>>,
    required: true,
  },
  history: {
    type: Object as PropType<History>,
    required: true,
  },
  errors: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },
  keyPrefix: {
    type: String,
    default: '',
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  isEditing: {
    type: Boolean,
    default: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  'update:record': [Record<string, any>]
  'update:errors': [Record<string, string>]
}>()

const Field = Object.fromEntries(
  Object.entries(fields).map(([fieldName, fieldComponent]) => [fieldName, fieldComponent()]),
)

const activeTab = ref<number>(0)
const tabErrors = ref<number[]>([])

const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.errors,
  () => {
    tabErrors.value = props.tabs.map(
      (tab) =>
        Object.keys(props.errors).filter((fieldKey) =>
          tab.fieldKeys.some((_fieldKey) => _fieldKey === fieldKey || fieldKey.startsWith(`${_fieldKey}.`)),
        ).length,
    )
  },
  { immediate: true },
)
</script>
