<template>
  <div v-pruvious-tooltip="__('pruvious-dashboard', 'Open in new tab')" class="truncate">
    <a v-if="linked" :href="linked" :title="linked" target="_blank" class="truncate transition hocus:text-primary-700">
      {{ linked }}
    </a>
  </div>

  <PruviousStringFieldPreview
    v-if="!linked"
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="value"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { prefixPrimaryLanguage, primaryLanguage } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import type { PublicPagesOptions } from '../../collections/collection.definition'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { uniqueArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: String,
  },
  options: {
    type: Object,
    required: true,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object as PropType<Record<string, any>>,
  },
  language: {
    type: String,
  },
})

defineEmits<{
  refresh: []
}>()

const dashboard = usePruviousDashboard()

const linked = ref<string | null>(null)
const publicCollections = Object.values(dashboard.value.collections).filter((c) => c.publicPages)

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

let linkedCounter = 0

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  async (value) => {
    if (value) {
      const match = value.match(/^([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?$/)
      const c = match ? publicCollections.find((c) => c.name === match[1]) : null

      if (match && c) {
        const counter = ++linkedCounter
        const pathField = (c.publicPages as PublicPagesOptions).pathField ?? 'path'
        const response = await pruviousFetch<Record<string, any>>(`collections/${match[1]}/${match[2]}`, {
          query: { select: uniqueArray(['id', 'language', pathField]).filter(Boolean).join(',') },
          dispatchEvents: false,
        })

        if (response.success && counter === linkedCounter) {
          const path = joinRouteParts(
            response.data.language === primaryLanguage && !prefixPrimaryLanguage ? '' : response.data.language,
            resolveCollectionPathPrefix(c, response.data.language, primaryLanguage),
            response.data[pathField],
          )

          linked.value = window.location.origin + (path === '/' ? '' : path) + (match[3] ?? '')
        } else {
          linked.value = null
        }
      } else if (value.startsWith('http')) {
        linked.value = value
      } else if (value.startsWith('/')) {
        linked.value = window.location.origin + value
      } else {
        linked.value = null
      }
    } else {
      linked.value = null
    }
  },
  { immediate: true },
)
</script>
