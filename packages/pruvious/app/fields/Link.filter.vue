<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="pui-row">
      <PUIDynamicSelect
        :choicesResolver="choicesResolver"
        :id="id"
        :initialKeyword="externalKeyword"
        :modelValue="selectedUrl"
        :name="id"
        :noResultsLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="__('pruvious-dashboard', 'Empty')"
        :searchLabel="__('pruvious-dashboard', 'Search...')"
        :selectedChoiceResolver="selectedChoiceResolver"
        @update:modelValue="onSelect($event as string | null)"
      />

      <PUIButton
        v-if="selectedUrl"
        v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
        @click="onSelect(null)"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:x" />
      </PUIButton>
    </div>
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, languages, primaryLanguage } from '#pruvious/app'
import { useDashboardContentLanguage, type FilterOperator, type WhereField } from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicSelectChoiceModel,
  PUIDynamicSelectPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicSelect.vue'
import { isArray, isNull, isRelURL, isString, parseRelURL } from '@pruvious/utils'

interface LinkChoice {
  value: string
  label: string
  detail: string
  editUrl: string
  isPublic: boolean
  languages: Record<string, string | null>
}

interface LinkChoicesResult {
  data: LinkChoice[]
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

const props = defineProps({
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  options: {
    type: Object as PropType<SerializableFieldOptions<'link'>>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const contentLanguage = useDashboardContentLanguage()
const JSON_KEY = '"url":"'

function buildPattern(url: string): string {
  return isRelURL(url) ? `${JSON_KEY}${url}` : `${JSON_KEY}${url}"`
}

function extractUrl(value: unknown): string | null {
  if (!isString(value) || !value.startsWith(JSON_KEY)) {
    return null
  }
  const rest = value.slice(JSON_KEY.length)
  return rest.endsWith('"') ? rest.slice(0, -1) : rest
}

const selectedUrl = computed(() => extractUrl(props.modelValue.value))

const operatorChoices = computed<{ value: FilterOperator; label: string }[]>(() => {
  if (selectedUrl.value === null) {
    return [
      { value: 'eq', label: __('pruvious-dashboard', 'Equals') },
      { value: 'ne', label: __('pruvious-dashboard', 'Does not equal') },
    ]
  }
  return [
    { value: 'contains', label: __('pruvious-dashboard', 'Equals') },
    { value: 'notContains', label: __('pruvious-dashboard', 'Does not equal') },
  ]
})

const allowExternal = computed(() => (props.options as any).allowExternal !== false)
const allowDrafts = computed(() => (props.options as any).allowDrafts !== false)
const allowedReferences = computed(() => (props.options as any).allowedReferences ?? '*')

const uiLanguages = computed<string[]>(() => {
  const option = (props.options.ui as any).languages ?? 'current'
  if (option === 'all') {
    return languages.map(({ code }) => code)
  }
  if (isArray(option)) {
    return option as string[]
  }
  return [contentLanguage.value]
})

const externalKeyword = computed(() => {
  const url = selectedUrl.value
  return url && !isRelURL(url) ? url : ''
})

function isNegative(operator: FilterOperator): boolean {
  return operator === 'ne' || operator === 'notContains'
}

function onSelect(url: string | null) {
  const negative = isNegative(props.modelValue.operator)

  const next: WhereField = isNull(url)
    ? { ...props.modelValue, operator: negative ? 'ne' : 'eq', value: null }
    : { ...props.modelValue, operator: negative ? 'notContains' : 'contains', value: buildPattern(url) }

  emit('update:modelValue', next)
  emit('commit', next)
}

watch(
  () => props.modelValue.value,
  (value) => {
    if (!isNull(value) && extractUrl(value) === null) {
      onSelect(null)
    }
  },
  { immediate: true },
)

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicSelectPaginatedChoices> {
  const trimmed = (keyword ?? '').trim()

  if (allowExternal.value && /^https?:\/\//i.test(trimmed)) {
    return {
      choices: [{ value: trimmed, label: trimmed, detail: __('pruvious-dashboard', 'Use external URL') }],
      currentPage: 1,
      lastPage: 1,
      perPage: 1,
      total: 1,
    }
  }

  try {
    const res = await $fetch<LinkChoicesResult>('/api/pruvious/link-choices', {
      query: {
        q: keyword,
        languages: uiLanguages.value.join(','),
        page,
        perPage: 50,
        allowDrafts: allowDrafts.value,
        allowedReferences: isArray(allowedReferences.value)
          ? allowedReferences.value.join(',')
          : allowedReferences.value,
      },
    })
    const tagLanguage = uiLanguages.value.length > 1
    return {
      choices: res.data.map((choice) => {
        const code = parseRelURL(choice.value, primaryLanguage)?.language ?? primaryLanguage
        return {
          value: choice.value,
          label: choice.label,
          detail: tagLanguage ? `${code.toUpperCase()} · ${choice.detail}` : choice.detail,
          badge: choice.isPublic ? undefined : __('pruvious-dashboard', 'Draft'),
        }
      }),
      currentPage: res.currentPage,
      lastPage: res.lastPage,
      perPage: res.perPage,
      total: res.total,
    }
  } catch {
    return { choices: [], currentPage: 1, lastPage: 1, perPage: 50, total: 0 }
  }
}

async function selectedChoiceResolver(value: unknown): Promise<PUIDynamicSelectChoiceModel | null> {
  if (!isString(value) || !value) {
    return null
  }

  if (!isRelURL(value)) {
    return { value, label: value, detail: __('pruvious-dashboard', 'External link') }
  }

  try {
    const res = await $fetch<LinkChoicesResult>('/api/pruvious/link-choices', { query: { value } })
    const choice = res.data[0]
    if (choice) {
      return {
        value,
        label: choice.label,
        detail: choice.detail,
        badge: choice.isPublic ? undefined : __('pruvious-dashboard', 'Draft'),
      }
    }
  } catch {}

  return { value, label: value, detail: __('pruvious-dashboard', 'Broken link') }
}
</script>
