<template>
  <div class="flex-1">
    <div v-if="stickyTopBorder" class="sticky top-[6.25rem] z-20 w-full border-t"></div>

    <div
      class="flex min-h-[3.625rem]"
      :class="{
        'gap-4': compact,
        'rounded-b-md bg-white': !compact,
        'border': !compact && !stacked && !tabbed,
        'divide-y': !compact && !stacked,
        'border-t-0': stickyTopBorder,
        'flex-wrap': stacked,
        'divide-x': stacked && !compact,
        'flex-col': !stacked,
      }"
    >
      <slot />

      <template v-for="item of resolvedFieldLayout">
        <PruviousFieldLayout
          v-if="item?.type === 'stack' && item.fields.some((field) => resolvedConditionalLogic[keyPrefix + field])"
          :canUpdate="canUpdate"
          :collectionRecord="collectionRecord"
          :compact="compact"
          :errors="errors"
          :fieldLayout="item.fields"
          :fieldsDeclaration="fieldsDeclaration"
          :history="history"
          :isEditing="isEditing"
          :keyPrefix="keyPrefix"
          :record="record"
          :resolvedConditionalLogic="resolvedConditionalLogic"
          :stacked="true"
          @update:errors="$emit('update:errors', $event)"
          @update:record="$emit('update:record', $event)"
          class="children:bg-transparent"
        />

        <PruviousFieldLayoutTabs
          v-if="item?.type === 'tabs'"
          :canUpdate="canUpdate"
          :collectionRecord="collectionRecord"
          :compact="compact"
          :errors="errors"
          :fieldsDeclaration="fieldsDeclaration"
          :history="history"
          :isEditing="isEditing"
          :keyPrefix="keyPrefix"
          :record="record"
          :resolvedConditionalLogic="resolvedConditionalLogic"
          :tabs="item.tabs"
          @update:errors="$emit('update:errors', $event)"
          @update:record="$emit('update:record', $event)"
        />

        <div
          v-if="
            item?.type === 'field' &&
            !fieldsDeclaration[item.fieldName]?.additional?.hidden &&
            resolvedConditionalLogic[keyPrefix + item.fieldName] &&
            (keyPrefix + item.fieldName !== 'translations' ||
              (collection.mode === 'multi' && record.id && collection.translatable && supportedLanguages.length > 1))
          "
          class="max-w-full"
          :class="{
            'w-full': compact,
            'p-4': !compact,
            'flex-1': stacked && !item.minWidth,
          }"
          :style="{ minWidth: item.minWidth ?? '10rem' }"
        >
          <component
            v-if="fieldsDeclaration[item.fieldName] && keyPrefix + item.fieldName !== 'translations'"
            :compact="compact"
            :disabled="isEditing && (!canUpdate || fieldsDeclaration[item.fieldName].additional?.immutable)"
            :errors="errors"
            :fieldKey="keyPrefix + item.fieldName"
            :history="history"
            :is="Field[fieldsDeclaration[item.fieldName].type]"
            :modelValue="record[item.fieldName]"
            :options="(fieldsDeclaration[item.fieldName].options as any)"
            :record="collectionRecord"
            :resolvedConditionalLogic="resolvedConditionalLogic"
            @update:errors="$emit('update:errors', $event as any)"
            @update:modelValue="$emit('update:record', { ...record, [item.fieldName]: $event })"
          />

          <PruviousCollectionTranslations
            v-if="fieldsDeclaration[item.fieldName] && keyPrefix + item.fieldName === 'translations'"
            :label="(fieldsDeclaration[item.fieldName].options as any).label"
            :record="collectionRecord"
            @changeLanguage="$emit('changeLanguage', $event)"
          />
        </div>

        <component
          v-if="item?.type === 'component'"
          :compact="compact"
          :disabled="isEditing && !canUpdate"
          :errors="errors"
          :history="history"
          :is="CustomFieldLayoutComponents[item.component]"
          :keyPrefix="keyPrefix"
          :record="collectionRecord"
          :resolvedConditionalLogic="resolvedConditionalLogic"
          @update:errors="$emit('update:errors', $event)"
          @update:record="$emit('update:record', $event)"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { supportedLanguages, type Field, type FieldLayout, type SupportedLanguage } from '#pruvious'
import { customFieldLayoutComponents, dashboardMiscComponent, fields } from '#pruvious/dashboard'
import { usePruviousDashboard, type DashboardCollectionFields } from '../../composables/dashboard/dashboard'
import { isArray } from '../../utils/array'
import { extractFieldKeys } from '../../utils/dashboard/extract-field-keys'
import type { History } from '../../utils/dashboard/history'
import { isObject } from '../../utils/object'
import { isString } from '../../utils/string'

type ResolvedFieldLayout =
  | {
      type: 'stack'
      fields: string[]
    }
  | {
      type: 'field'
      fieldName: string
      minWidth?: string
    }
  | {
      type: 'tabs'
      tabs: {
        label: string
        fields: FieldLayout[]
        fieldKeys: string[]
      }[]
    }
  | {
      type: 'component'
      component: any
    }

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
  fieldLayout: {
    type: Array as PropType<FieldLayout[]>,
    required: true,
  },
  fieldsDeclaration: {
    type: Object as PropType<
      Record<
        string,
        Required<Pick<Field, 'options' | 'type'>> & {
          additional?: DashboardCollectionFields[string]['additional']
          default?: any
        }
      >
    >,
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
  stacked: {
    type: Boolean,
    default: false,
  },
  tabbed: {
    type: Boolean,
    default: false,
  },
  stickyTopBorder: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  'update:record': [Record<string, any>]
  'update:errors': [Record<string, string>]
  'changeLanguage': [SupportedLanguage]
}>()

const Field = Object.fromEntries(
  Object.entries(fields).map(([fieldName, fieldComponent]) => [fieldName, fieldComponent()]),
)

const dashboard = usePruviousDashboard()

const collection = dashboard.value.collections[dashboard.value.collection!]
const CustomFieldLayoutComponents: Record<string, any> = {}
const resolvedFieldLayout = ref<(ResolvedFieldLayout | null)[]>([])

const PruviousCollectionTranslations = dashboardMiscComponent.CollectionTranslations()
const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()
const PruviousFieldLayoutTabs = dashboardMiscComponent.FieldLayoutTabs()

watch(
  () => props.fieldLayout,
  () => {
    resolvedFieldLayout.value = props.fieldLayout.map((item) => {
      if (isString(item)) {
        if (item.startsWith('<') && item.endsWith('>')) {
          CustomFieldLayoutComponents[item] ??= (customFieldLayoutComponents as any)[item]()
          return { type: 'component', component: item }
        } else if (!item.startsWith('#')) {
          const parts = item.split('|').map((part) => part.trim())
          return { type: 'field', fieldName: parts[0], minWidth: parts[1] }
        }
      } else if (isArray(item)) {
        return { type: 'stack', fields: item }
      } else if (isObject(item)) {
        return {
          type: 'tabs',
          tabs: Object.entries(item).map(([label, fields]) => ({ label, fields, fieldKeys: extractFieldKeys(fields) })),
        }
      }

      return null
    })
  },
  { immediate: true },
)
</script>
