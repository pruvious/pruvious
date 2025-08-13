<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div class="pui-row">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Table overview')"
        :disabled="disabled"
        @click="isDataTablePopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:table" />
      </PUIButton>

      <PUIDynamicChips
        :choicesResolver="choicesResolver"
        :disabled="disabled"
        :enforceUniqueItems="options.enforceUniqueItems"
        :error="!!error"
        :erroredItems="erroredItems"
        :id="id"
        :maxItems="options.maxItems"
        :minItems="options.minItems"
        :modelValue="modelValue"
        :name="path"
        :noResultsFoundLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :removeItemLabel="__('pruvious-dashboard', 'Remove')"
        :selectedChoicesResolver="selectedChoicesResolver"
        :variant="options.ui.variant"
        @dblclick="open(+$event!)"
        @update:modelValue="
          (value: any) => {
            $emit('update:modelValue', value)
            $emit('commit', value)
          }
        "
      />
    </div>

    <PruviousDashboardDataTablePopup
      v-if="isDataTablePopupVisible"
      :collectionName="options.collection"
      :languages="options.languages"
      :modelValue="modelValue"
      :title="label"
      @close="$event().then(() => (isDataTablePopupVisible = false))"
      @update:modelValue="
        (ids) => {
          $emit('update:modelValue', ids)
          $emit('commit', ids)
        }
      "
      multiSelect
    />

    <PruviousFieldMessage :error="fieldError" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import {
  __,
  dashboardBasePath,
  maybeTranslate,
  resolveFieldLabel,
  selectFrom,
  usePruviousDashboard,
} from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicChipsChoiceModel,
  PUIDynamicChipsPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicChips.vue'
import { castToNumber, isArray, isDefined, isInteger, isObject, isString, slugify, toArray } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as PropType<number[]>,
    required: true,
  },

  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'records'>>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  'commit': [value: number[]]
  'update:modelValue': [value: number[]]
}>()

provide('openLinksInNewTab', true)

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const placeholder = maybeTranslate(props.options.ui.placeholder)
const isDataTablePopupVisible = ref(false)
const dashboard = usePruviousDashboard()
const collection = {
  name: props.options.collection,
  slug: slugify(props.options.collection),
  definition: dashboard.value!.collections[props.options.collection]!,
}
const fieldError = computed(() => (isString(props.error) ? props.error : props.error?.[props.path]))
const erroredItems = computed<number[]>(() =>
  isObject(props.error) ? Object.keys(props.error).map(castToNumber).filter(isInteger) : [],
)
const choicesCache: Record<number, PUIDynamicChipsChoiceModel> = {}

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicChipsPaginatedChoices> {
  const displayFields = toArray(props.options.ui.displayFields!)
  const searchFields = toArray(props.options.ui.searchFields!)
  const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
  const query = await selectFrom(collection.name)
    .select(['id', ...select] as any)
    .search(keyword, searchFields as any)
    .paged(page, 50)
    .paginate()

  if (query.success) {
    const choices = query.data.records.map((record) => ({
      value: record.id,
      label: toArray(displayFields[0])!
        .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
        .join('')
        .trim(),
      detail: isDefined(displayFields[1])
        ? toArray(displayFields[1])!
            .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
            .join('')
            .trim()
        : undefined,
    }))

    for (const choice of choices) {
      choicesCache[choice.value] = choice
    }

    return {
      choices,
      currentPage: query.data.currentPage,
      lastPage: query.data.lastPage,
      perPage: query.data.perPage,
      total: query.data.total,
    }
  }

  return {
    choices: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 50,
    total: 0,
  }
}

async function selectedChoicesResolver(): Promise<PUIDynamicChipsChoiceModel[]> {
  const ids = [...props.modelValue]

  if (ids.length) {
    const displayFields = toArray(props.options.ui.displayFields!)
    const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
    const missingIds = ids.filter((id) => !choicesCache[id])
    const query = missingIds.length
      ? await selectFrom(collection.name)
          .select(['id', ...select] as any)
          .where('id', 'in', ids)
          .all()
      : { success: true, data: [] }

    if (query.success && query.data) {
      query.data.forEach((record: Record<string, any>) => {
        choicesCache[record.id] = {
          value: record.id,
          label: toArray(displayFields[0])!
            .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
            .join('')
            .trim(),
          detail: isDefined(displayFields[1])
            ? toArray(displayFields[1])!
                .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
                .join('')
                .trim()
            : undefined,
        }
      })

      return ids.map((id) => {
        if (!choicesCache[id]) {
          choicesCache[id] = {
            value: id,
            label: __('pruvious-dashboard', 'Deleted record') + ` (#${id})`,
            detail: isDefined(displayFields[1]) ? '' : undefined,
          }
        }
        return choicesCache[id]
      }) as PUIDynamicChipsChoiceModel[]
    }
  }

  return []
}

function open(id: number) {
  window.open(`${dashboardBasePath}collections/${collection.slug}/${id}`, '_blank')
}
</script>
