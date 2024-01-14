<template>
  <button
    v-if="sortable"
    :title="
      table.filter.orderOption.value[0] === `${fieldName}:asc`
        ? __('pruvious-dashboard', 'Sort in descending order')
        : __('pruvious-dashboard', 'Sort in ascending order')
    "
    @click="sort()"
    type="button"
    :class="{
      active:
        table.filter.orderOption.value[0] === `${fieldName}:asc` ||
        table.filter.orderOption.value[0] === `${fieldName}:desc`,
    }"
  >
    <PruviousIconArrowsSort
      v-if="
        table.filter.orderOption.value[0] !== `${fieldName}:asc` &&
        table.filter.orderOption.value[0] !== `${fieldName}:desc`
      "
    />

    <PruviousIconSortAscendingLetters
      v-if="
        fieldTypes[props.fieldDeclaration.type] === 'string' && table.filter.orderOption.value[0] === `${fieldName}:asc`
      "
    />

    <PruviousIconSortDescendingLetters
      v-if="
        fieldTypes[props.fieldDeclaration.type] === 'string' &&
        table.filter.orderOption.value[0] === `${fieldName}:desc`
      "
    />

    <PruviousIconSortAscendingNumbers
      v-if="
        fieldTypes[props.fieldDeclaration.type] !== 'string' && table.filter.orderOption.value[0] === `${fieldName}:asc`
      "
    />

    <PruviousIconSortDescendingNumbers
      v-if="
        fieldTypes[props.fieldDeclaration.type] !== 'string' &&
        table.filter.orderOption.value[0] === `${fieldName}:desc`
      "
    />
  </button>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import type { Field } from '#pruvious'
import { fieldTypes } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { CollectionOverview } from '../../utils/dashboard/collection-overview'

const props = defineProps({
  defaultOrder: {
    type: String,
    required: true,
  },
  fieldDeclaration: {
    type: Object as PropType<Pick<Field, 'type' | 'options'>>,
    required: true,
  },
  fieldName: {
    type: String,
    required: true,
  },
  table: {
    type: Object as PropType<CollectionOverview<any>>,
    required: true,
  },
})

const sortable = ref(false)

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.fieldName,
  () => {
    sortable.value = fieldTypes[props.fieldDeclaration.type] !== 'object'
  },
  { immediate: true },
)

async function sort() {
  props.table.filter.page(1)

  const order = props.table.filter.orderOption.value || [props.defaultOrder]

  if (order.length === 1 && order[0] === `${props.fieldName}:asc`) {
    props.table.filter.order(`${props.fieldName}:desc`)
  } else {
    props.table.filter.order(`${props.fieldName}:asc`)
  }

  await props.table.updateLocation()
}
</script>
