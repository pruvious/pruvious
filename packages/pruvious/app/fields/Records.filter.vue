<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'includes', label: __('pruvious-dashboard', 'Includes all') },
      { value: 'includesAny', label: __('pruvious-dashboard', 'Includes any') },
      { value: 'excludes', label: __('pruvious-dashboard', 'Excludes all') },
      { value: 'excludesAny', label: __('pruvious-dashboard', 'Excludes any') },
    ]"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="pui-row">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Table overview')"
        @click="isDataTablePopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:table" />
      </PUIButton>

      <PUIDynamicChips
        :choicesResolver="choicesResolver"
        :enforceUniqueItems="options.enforceUniqueItems"
        :id="id"
        :maxItems="options.maxItems"
        :minItems="options.minItems"
        :modelValue="(modelValue as any).value"
        :name="id"
        :noResultsFoundLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :removeItemLabel="__('pruvious-dashboard', 'Remove')"
        :selectedChoicesResolver="selectedChoicesResolver"
        :variant="options.ui.variant"
        @dblclick="open(+$event!)"
        @update:modelValue="
          (value: any) => {
            $emit('update:modelValue', { ...modelValue, value })
            $emit('commit', { ...modelValue, value })
          }
        "
      />
    </div>

    <PruviousDashboardDataTablePopup
      v-if="isDataTablePopupVisible"
      :collectionName="options.collection"
      :languages="options.languages"
      :modelValue="modelValue.value ? (modelValue.value as any) : []"
      :title="label"
      @close="$event().then(() => (isDataTablePopupVisible = false))"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', { ...modelValue, value })
          $emit('commit', { ...modelValue, value })
        }
      "
      multiSelect
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import {
  batchSelectIn,
  dashboardBasePath,
  maybeTranslate,
  resolveFieldLabel,
  selectFrom,
  usePruviousDashboard,
  type WhereField,
} from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicChipsChoiceModel,
  PUIDynamicChipsPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicChips.vue'
import { isArray, isDefined, slugify, toArray } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'records'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

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
const choicesCache: Record<number, PUIDynamicChipsChoiceModel> = {}

provide('openLinksInNewTab', true)
provide('hideViewConfiguration', true)
provide('hideEditableFieldCellActions', true)

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicChipsPaginatedChoices> {
  const displayFields = toArray(props.options.ui.displayFields!)
  const searchFields = toArray(props.options.ui.searchFields!)
  const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
  const query = await selectFrom(collection.name)
    .select(['id', ...select] as any)
    .search(keyword, searchFields as any)
    .cache(3000)
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
  const ids = [...(props.modelValue.value as number[])]

  if (ids.length) {
    const displayFields = toArray(props.options.ui.displayFields!)
    const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
    const missingIds = ids.filter((id) => !choicesCache[id])
    const records = missingIds.length
      ? await batchSelectIn(missingIds, (batch) =>
          selectFrom(collection.name)
            .select(['id', ...select] as any)
            .where('id', 'in', batch)
            .cache(3000)
            .all()
            .then(({ data }) => data ?? []),
        )
      : []

    records.forEach((record: Record<string, any>) => {
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
          label: __('pruvious-dashboard', 'Record not found') + ` (#${id})`,
          detail: isDefined(displayFields[1]) ? '' : undefined,
        }
      }
      return choicesCache[id]
    }) as PUIDynamicChipsChoiceModel[]
  }

  return []
}

function open(id: number) {
  window.open(`${dashboardBasePath}collections/${collection.slug}/${id}`, '_blank')
}
</script>
