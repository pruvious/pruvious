<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="label || description" class="flex w-full items-end justify-between gap-4">
      <label v-if="label" @click="onClickLabel()" class="whitespace-nowrap text-vs font-medium text-gray-900">
        {{ __('pruvious-dashboard', label as any) }}
      </label>

      <PruviousIconHelp
        v-if="description"
        v-pruvious-tooltip="__('pruvious-dashboard', description as any)"
        class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
    </div>

    <div
      ref="containerEl"
      class="w-full space-y-2 rounded-md border bg-white px-2.5 py-[7px] transition"
      :class="{ 'focus-within:border-primary-700 focus-within:ring hover:border-primary-700': label }"
    >
      <div v-for="{ code, name } of languageLabels" class="flex items-center justify-between gap-2">
        <span class="truncate">
          <span>{{ __('pruvious-dashboard', name as any) }}</span>
        </span>

        <span v-if="code === record.language" class="text-gray-400">
          {{ __('pruvious-dashboard', '(current)') }}
        </span>

        <div v-if="code !== record.language" class="flex gap-2">
          <button
            v-if="canCreate && collection.mode === 'multi' && !translations[code]"
            v-pruvious-tooltip="__('pruvious-dashboard', 'Create translation')"
            @click="create(code as any)"
            type="button"
            class="button button-white button-square-xs"
          >
            <PruviousIconPlus />
          </button>

          <button
            v-if="canUpdate && (collection.mode as any === 'single' || translations[code])"
            v-pruvious-tooltip="__('pruvious-dashboard', 'Mirror content to this translation')"
            @click="mirror(code as any)"
            type="button"
            class="button button-white button-square-xs"
          >
            <PruviousIconCopy />
          </button>

          <button
            v-if="collection.mode as any === 'single' || translations[code]"
            v-pruvious-tooltip="
              canUpdate ? __('pruvious-dashboard', 'Edit translation') : __('pruvious-dashboard', 'View translation')
            "
            @click="$emit('changeLanguage', code as any)"
            type="button"
            class="button button-white button-square-xs"
          >
            <PruviousIconPencil v-if="canUpdate" />
            <PruviousIconEye v-if="!canUpdate" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { languageLabels, type SupportedLanguage } from '#pruvious'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { pruviousDialog } from '../../composables/dashboard/dialog'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { pruviousFetch } from '../../utils/fetch'
import { isObject } from '../../utils/object'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  record: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
})

defineEmits<{
  changeLanguage: [SupportedLanguage]
}>()

const dashboard = usePruviousDashboard()
const user = useUser()

const collection = dashboard.value.collections[dashboard.value.collection!]
const containerEl = ref<HTMLElement>()
const translations = ref<Record<string, number | null>>({})
const userCapabilities = getCapabilities(user.value)

const canCreate = user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-create`]
const canUpdate = user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-update`]

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.record.id,
  () => refreshTranslations(),
)

await refreshTranslations()

async function refreshTranslations() {
  if (props.record.id && collection.mode === 'multi') {
    const response = await pruviousFetch<{ translations: Record<string, number | null> }>(
      `collections/${collection.name}/${props.record.id}`,
      {
        query: { select: 'translations', populate: true },
      },
    )

    if (response.success) {
      translations.value = response.data.translations
    } else {
      translations.value = {}
    }
  } else {
    translations.value = {}
  }
}

async function create(language: SupportedLanguage) {
  const response = await pruviousFetch<Record<string, any>>(
    `collections/${collection.name}/${props.record.id}/mirror?to=${language}`,
    { method: 'post' },
  )

  if (response.success) {
    pruviousToasterShow({ message: __('pruvious-dashboard', 'Translation created') })
    translations.value[language] = response.data.id
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

async function mirror(language: SupportedLanguage) {
  if (
    await pruviousDialog(
      __('pruvious-dashboard', 'This action will overwrite the content in the **$language** translation.', {
        language: __('pruvious-dashboard', languageLabels.find(({ code }) => code === language)!.name as any),
      }),
      {
        resolve: __('pruvious-dashboard', 'Continue'),
        reject: __('pruvious-dashboard', 'Cancel'),
      },
    )
  ) {
    const response = await pruviousFetch(
      (collection.mode as any) === 'single'
        ? `collections/${collection.name}/mirror?from=${props.record.language}&to=${language}`
        : `collections/${collection.name}/${props.record.id}/mirror?to=${language}`,
      { method: 'post' },
    )

    if (response.success) {
      pruviousToasterShow({ message: __('pruvious-dashboard', 'Content copied') })
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
}

function onClickLabel() {
  ;(containerEl.value?.querySelector('a, button') as any)?.focus()
}
</script>
