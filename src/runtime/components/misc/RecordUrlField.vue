<template>
  <div
    v-if="history.original.value.id"
    class="max-w-full"
    :class="{
      'w-full': compact,
      'p-4': !compact,
    }"
  >
    <div class="relative flex w-full flex-col items-start gap-1">
      <div class="flex w-full items-end">
        <span class="whitespace-nowrap text-vs font-medium text-gray-900">
          {{ isPublic ? __('pruvious-dashboard', 'Public URL') : __('pruvious-dashboard', 'Draft URL') }}
        </span>
      </div>
      <div class="flex w-full gap-1.5">
        <button
          v-pruvious-tooltip="__('pruvious-dashboard', 'Copy link to clipboard')"
          @click="copyToClipboard()"
          type="button"
          class="-mt-px h-5 w-5 shrink-0 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconClipboardCopy />
        </button>
        <a
          :href="url"
          :title="__('pruvious-dashboard', 'Open in new tab')"
          target="_blank"
          class="truncate text-sm text-gray-400 transition hocus:text-primary-700"
        >
          {{ url }}
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { primaryLanguage } from '#pruvious'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { type History } from '../../utils/dashboard/history'
import { joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'

const props = defineProps<{
  history: History
  compact: boolean
}>()

const dashboard = usePruviousDashboard()

const collection = dashboard.value.collections[dashboard.value.collection!]
const isPublic = ref(true)
const url = ref('')

await loadTranslatableStrings('pruvious-dashboard')

watch(
  props.history.original,
  () => {
    if (collection.publicPages) {
      let baseUrl = joinRouteParts(
        (props.history.original.value.language === primaryLanguage ? '' : props.history.original.value.language) +
          '/' +
          resolveCollectionPathPrefix(collection as any, props.history.original.value.language, primaryLanguage) +
          '/' +
          props.history.original.value[collection.publicPages.pathField ?? 'path'],
      )

      if (baseUrl[0] === '/') {
        baseUrl = window.location.origin + baseUrl
      }

      baseUrl = baseUrl.replace(/\/$/, '')

      if (collection.publicPages.publicField && !props.history.original.value[collection.publicPages.publicField]) {
        isPublic.value = false
        url.value = collection.publicPages.draftTokenField
          ? `${baseUrl}?__d=${props.history.original.value[collection.publicPages.draftTokenField]}`
          : baseUrl
      } else {
        isPublic.value = true
        url.value = baseUrl
      }
    }
  },
  { immediate: true },
)

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(url.value)
    pruviousToasterShow({ message: __('pruvious-dashboard', 'Copied') })
  } catch (_) {
    pruviousToasterShow({
      message: __('pruvious-dashboard', 'You must first allow the app access to the clipboard'),
      type: 'error',
    })
  }
}
</script>
