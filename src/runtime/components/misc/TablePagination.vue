<template>
  <div v-if="table.total.value" class="mt-4 flex items-center justify-between">
    <div class="flex flex-1 items-center justify-between gap-4">
      <div>
        <p
          v-html="
            __('pruvious-dashboard', 'Showing $from to $to of $total $items', {
              from: (table.currentPage.value - 1) * (table.filter.perPageOption.value ?? 50) + 1,
              to: (table.currentPage.value - 1) * (table.filter.perPageOption.value ?? 50) + table.data.value.length,
              total: table.total.value,
              items: table.total.value === 1 ? collection.label.record.singular : collection.label.record.plural,
            }).replace(/([0-9]+)/g, '<strong>$1</strong>')
          "
          class="text-sm text-gray-400 children:text-gray-500"
        ></p>
      </div>

      <div v-if="table.lastPage.value > 1">
        <div class="flex h-9 -space-x-px">
          <button
            :disabled="table.currentPage.value === 1"
            :title="__('pruvious-dashboard', 'Previous page')"
            @click="table.filter.page(table.currentPage.value - 1), table.updateLocation()"
            type="button"
            class="inline-flex h-full shrink-0 items-center rounded-l-md border bg-white px-2 text-sm text-gray-500 hover:text-primary-700 focus-visible:relative focus-visible:z-10 disabled:pointer-events-none disabled:text-gray-300"
            :class="{
              'pointer-events-none !text-gray-300': table.currentPage.value === 1,
              'text-gray-500': table.currentPage.value !== 1,
            }"
          >
            <PruviousIconChevronLeft class="h-4 w-4" />
          </button>

          <template v-for="i of pages">
            <button
              v-if="i !== '...'"
              :disabled="i === table.currentPage.value"
              :title="
                i !== table.currentPage.value ? __('pruvious-dashboard', 'Go to page $page', { page: i }) : undefined
              "
              @click="table.filter.page(i), table.updateLocation()"
              type="button"
              class="group inline-flex border transition-none focus-visible:relative focus-visible:z-10"
              :class="{
                'relative border-primary-500 bg-primary-50 text-primary-700 ': i === table.currentPage.value,
                'bg-white text-gray-500 hover:text-primary-700': i !== table.currentPage.value,
              }"
            >
              <span class="flex h-full items-center px-4 text-sm transition group-hover:text-primary-700">
                {{ i }}
              </span>
            </button>

            <span
              v-if="i === '...'"
              class="inline-flex h-full items-center border bg-white px-4 text-sm font-medium text-gray-500"
            >
              ...
            </span>
          </template>

          <button
            :disabled="table.currentPage.value === table.lastPage.value"
            :title="__('pruvious-dashboard', 'Next page')"
            @click="table.filter.page(table.currentPage.value + 1), table.updateLocation()"
            type="button"
            class="inline-flex h-full shrink-0 items-center rounded-r-md border bg-white px-2 text-sm hover:text-primary-700 focus-visible:relative focus-visible:z-10"
            :class="{
              'pointer-events-none !text-gray-300': table.currentPage.value === table.lastPage.value,
              'text-gray-500': table.currentPage.value !== table.lastPage.value,
            }"
          >
            <PruviousIconChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { CollectionOverview } from '../../utils/dashboard/collection-overview'

const props = defineProps({
  table: {
    type: Object as PropType<CollectionOverview<any>>,
    required: true,
  },
})

const dashboard = usePruviousDashboard()
const pages = ref<(number | '...')[]>([])

const collection = dashboard.value.collections[dashboard.value.collection!]

await loadTranslatableStrings('pruvious-dashboard')

watch(props.table.data, () => refresh(), { immediate: true })

function refresh() {
  pages.value = []

  const currentPage = props.table.currentPage.value
  const lastPage = props.table.lastPage.value

  for (let i = Math.max(1, currentPage - 3); i <= Math.min(lastPage, currentPage + 3); i++) {
    pages.value.push(i)
  }

  if (lastPage > 0 && pages.value[0] !== 1) {
    if (currentPage - 4 > 1) {
      pages.value.unshift('...')
    }

    pages.value.unshift(1)
  }

  if (lastPage > 1 && pages.value[pages.value.length - 1] !== lastPage) {
    if (currentPage + 4 < lastPage) {
      pages.value.push('...')
    }

    pages.value.push(lastPage)
  }
}
</script>
