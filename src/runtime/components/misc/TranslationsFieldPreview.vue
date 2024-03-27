<template>
  <div v-if="value" class="flex gap-2 truncate">
    <template v-for="{ id, label } of translations">
      <NuxtLink
        v-if="id"
        v-pruvious-tooltip="{ content: __('pruvious-dashboard', 'Edit translation'), offset: [0, 8] }"
        :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection.name}/${id}`"
        class="text-vs uppercase transition hocus:text-primary-700"
      >
        {{ label }}
      </NuxtLink>

      <button
        v-if="!id"
        v-pruvious-tooltip="{ content: __('pruvious-dashboard', 'Create translation'), offset: [0, 8] }"
        @click="createTranslation(label)"
        class="text-vs uppercase text-gray-300 transition hocus:text-primary-700"
      >
        {{ label }}
      </button>
    </template>
  </div>

  <PruviousStringFieldPreview
    v-if="!value"
    :canUpdate="canUpdate"
    :options="{}"
    :value="(value as any)"
    @refresh="$emit('refresh')"
    name="translations"
  />
</template>

<script lang="ts" setup>
import { ref, useRuntimeConfig, watch } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousFetch } from '../../utils/fetch'
import { isObject } from '../../utils/object'

const props = defineProps({
  id: {
    type: Number,
  },
  value: {
    type: String,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  language: {
    type: String,
  },
})

const emit = defineEmits<{
  refresh: []
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const translations = ref<{ label: string; id: number }[]>([])

const collection = dashboard.value.collections[dashboard.value.collection!]

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.id || props.value || props.canUpdate || props.language,
  async () => {
    translations.value = []

    const response = await pruviousFetch<{ translations: Record<string, number | null> | null }>(
      `collections/${collection.name}/${props.id}?select=translations&populate=true`,
    )

    if (response.success && response.data.translations) {
      for (const [languageCode, id] of Object.entries(response.data.translations)) {
        if (languageCode !== props.language) {
          translations.value.push({ label: languageCode, id: Number(id) })
        }
      }
    }
  },
  { immediate: true },
)

async function createTranslation(language: string) {
  const response = await pruviousFetch<Record<string, any>>(
    `collections/${collection.name}/${props.id}/mirror?to=${language}`,
    { method: 'post' },
  )

  if (response.success) {
    pruviousToasterShow({ message: __('pruvious-dashboard', 'Translation created'), afterRouteChange: true })
    await navigateToPruviousDashboardPath(`collections/${collection.name}/${response.data.id}`)
  } else if (isObject(response.error)) {
    pruviousToasterShow({
      message:
        '<ul><li>' +
        Object.entries(response.error)
          .map(([key, value]) => `**${key}:** ${value}`)
          .join('</li><li>') +
        '</li></ul>',
      type: 'error',
    })
  }
}
</script>
