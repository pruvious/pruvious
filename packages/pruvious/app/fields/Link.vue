<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div class="pui-row">
      <PUIDynamicSelect
        :choicesResolver="choicesResolver"
        :disabled="disabled"
        :error="!!urlError"
        :id="id"
        :initialKeyword="externalKeyword"
        :modelValue="base"
        :name="path"
        :noResultsLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :searchLabel="__('pruvious-dashboard', 'Search...')"
        :selectedChoiceResolver="selectedChoiceResolver"
        @update:modelValue="onSelect($event as string | null)"
      />

      <PUIButton
        v-if="editUrl && canUpdate"
        v-pui-tooltip="__('pruvious-dashboard', 'Edit')"
        :to="editUrl"
        target="_blank"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:pencil" />
      </PUIButton>

      <PUIButton
        v-else-if="editUrl && canRead"
        v-pui-tooltip="__('pruvious-dashboard', 'View')"
        :to="editUrl"
        target="_blank"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:list-search" />
      </PUIButton>

      <PUIButton
        v-if="base && hasPopupFields"
        v-pui-tooltip="__('pruvious-dashboard', 'Link options')"
        :disabled="disabled"
        @click="isPopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:settings" />
      </PUIButton>

      <PUIButton
        v-if="base"
        v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
        :disabled="disabled"
        @click="clear"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:x" />
      </PUIButton>
    </div>

    <PruviousDashboardLinkOptionsPopup
      v-if="isPopupVisible"
      :disabled="disabled"
      :hash="hash"
      :query="query"
      :rel="rel"
      :showHash="isInternal && allowHash"
      :showQuery="isInternal && allowQuery"
      :showRel="showRel"
      :showTarget="showTarget"
      :target="target"
      @close="$event().then(() => (isPopupVisible = false))"
      @save="applyOptions"
    />

    <div v-if="!urlError && resolvedDetail" class="p-resolved-path">
      <NuxtLink
        :title="__('pruvious-dashboard', 'Open in new tab')"
        :to="resolvedDetail ?? ''"
        target="_blank"
        class="p-resolved-path-link"
      >
        <span class="pui-truncate">{{ resolvedDetail }}</span>
        <Icon mode="svg" name="tabler:external-link" class="pui-shrink-0" />
      </NuxtLink>
    </div>
    <PruviousFieldMessage v-else :error="urlError" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, hasPermission, languages, primaryLanguage } from '#pruvious/app'
import {
  dashboardBasePath,
  maybeTranslate,
  resolveCollectionRecordPermissions,
  useDashboardContentLanguage,
  usePruviousDashboard,
} from '#pruvious/dashboard'
import type { Collections, Permission, SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicSelectChoiceModel,
  PUIDynamicSelectPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicSelect.vue'
import {
  isArray,
  isDefined,
  isObject,
  isRelURL,
  isString,
  kebabCase,
  parseRelURL,
  type Primitive,
} from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'

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

interface LinkValue {
  url: string
  target: string
  rel: string
}

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [Object, null] as PropType<LinkValue | null>,
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
    type: Object as PropType<SerializableFieldOptions<'link'>>,
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
    type: [String, Object] as PropType<string | Record<string, string>>,
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

const emit = defineEmits<{
  'commit': [value: LinkValue | null]
  'update:modelValue': [value: LinkValue | null]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
const contentLanguage = useDashboardContentLanguage()
const dashboard = usePruviousDashboard()

const showTarget = computed(() => (props.options.ui as any).showTarget !== false)
const showRel = computed(() => (props.options.ui as any).showRel !== false)
const allowExternal = computed(() => (props.options as any).allowExternal !== false)
const allowHash = computed(() => (props.options as any).allowHash !== false)
const allowQuery = computed(() => (props.options as any).allowQuery !== false)
const allowedReferences = computed(() => (props.options as any).allowedReferences ?? '*')
const allowDrafts = computed(() => (props.options as any).allowDrafts !== false)

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

const base = ref<string | null>(null)
const query = ref('')
const hash = ref('')
const target = ref('')
const rel = ref('')

const isPopupVisible = ref(false)

const isInternal = computed(() => !!base.value && isRelURL(base.value))
const externalKeyword = computed(() => (base.value && !isRelURL(base.value) ? base.value : ''))

const hasPopupFields = computed(
  () => showTarget.value || showRel.value || (isInternal.value && (allowQuery.value || allowHash.value)),
)

const urlError = computed(() => {
  if (isString(props.error)) {
    return props.error
  }
  if (isObject(props.error)) {
    const e = props.error as Record<string, string>
    return e.url || e[props.name] || Object.values(e)[0] || undefined
  }
  return undefined
})

const linkTarget = computed<{ collectionName: keyof Collections; recordId: number } | null>(() => {
  if (!base.value || !isRelURL(base.value)) {
    return null
  }
  const parsed = parseRelURL(base.value, primaryLanguage)
  if (!parsed) {
    return null
  }
  if (parsed.collection && isDefined(parsed.recordId)) {
    return { collectionName: parsed.collection as keyof Collections, recordId: parsed.recordId }
  }
  return { collectionName: 'Routes' as keyof Collections, recordId: parsed.routeId }
})

const editUrl = computed(() => {
  if (!linkTarget.value) {
    return undefined
  }
  const slug = kebabCase(linkTarget.value.collectionName as string)
  return `${dashboardBasePath}collections/${slug}/${linkTarget.value.recordId}`
})

const resolvedPermissions = computedAsync(async () => {
  if (!linkTarget.value) {
    return null
  }
  const definition = dashboard.value?.collections[linkTarget.value.collectionName]
  if (!definition) {
    return null
  }
  return resolveCollectionRecordPermissions(linkTarget.value.recordId, {
    name: linkTarget.value.collectionName,
    definition,
  })
}, null)

const canUpdate = computed(() => !!resolvedPermissions.value?.canUpdate)
const canRead = computed(() => {
  if (!linkTarget.value) {
    return false
  }
  return hasPermission(`collection:${kebabCase(linkTarget.value.collectionName as string)}:read` as Permission)
})

const resolvedLink = computedAsync(async () => {
  if (!base.value || !isRelURL(base.value)) {
    return null
  }
  try {
    const res = await $fetch<LinkChoicesResult>('/api/pruvious/link-choices', { query: { value: base.value } })
    const choice = res.data[0]
    return choice ? { detail: choice.detail, isPublic: choice.isPublic } : null
  } catch {
    return null
  }
}, null)

const resolvedDetail = computed(() => resolvedLink.value?.detail ?? null)

watch(
  () => props.modelValue,
  (value) => {
    target.value = value?.target ?? ''
    rel.value = value?.rel ?? ''

    const url = value?.url ?? ''

    if (!url) {
      base.value = null
      query.value = ''
      hash.value = ''
      return
    }

    if (isRelURL(url)) {
      const parsed = parseRelURL(url, primaryLanguage)
      if (parsed) {
        base.value = url.split('#')[0]!.split('?')[0]!
        query.value = parsed.query ?? ''
        hash.value = parsed.hash ?? ''
      } else {
        base.value = url
        query.value = ''
        hash.value = ''
      }
      return
    }

    base.value = url
    query.value = ''
    hash.value = ''
  },
  { immediate: true },
)

function recombine() {
  if (!base.value) {
    emit('update:modelValue', null)
    emit('commit', null)
    return
  }

  let url = base.value

  if (isRelURL(base.value)) {
    if (allowQuery.value && query.value) {
      url += `?${query.value}`
    }
    if (allowHash.value && hash.value) {
      url += `#${hash.value}`
    }
  }

  const next: LinkValue = { url, target: target.value, rel: rel.value }
  emit('update:modelValue', next)
  emit('commit', next)
}

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
    return {
      choices: res.data.map((choice) => ({
        value: choice.value,
        label: choice.label,
        detail: choice.detail,
        badge: choice.isPublic ? undefined : __('pruvious-dashboard', 'Draft'),
      })),
      currentPage: res.currentPage,
      lastPage: res.lastPage,
      perPage: res.perPage,
      total: res.total,
    }
  } catch {
    return { choices: [], currentPage: 1, lastPage: 1, perPage: 50, total: 0 }
  }
}

async function selectedChoiceResolver(value: Primitive): Promise<PUIDynamicSelectChoiceModel | null> {
  if (!isString(value) || !value) {
    return null
  }

  if (!isRelURL(value)) {
    return { value, label: value, detail: __('pruvious-dashboard', 'External link') }
  }

  try {
    const res = await $fetch<LinkChoicesResult>('/api/pruvious/link-choices', {
      query: { value },
    })
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

function onSelect(value: string | null) {
  base.value = value
  query.value = ''
  hash.value = ''
  recombine()
}

function clear() {
  base.value = null
  query.value = ''
  hash.value = ''
  target.value = ''
  rel.value = ''
  emit('update:modelValue', null)
  emit('commit', null)
}

function applyOptions(value: { target: string; rel: string; query: string; hash: string }) {
  target.value = value.target
  rel.value = value.rel
  query.value = value.query
  hash.value = value.hash
  recombine()
}
</script>

<style scoped>
.p-resolved-path {
  display: flex;
  align-items: flex-start;
  margin-top: 0.46875rem;
}

.p-resolved-path-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1rem;
  color: hsl(var(--pui-muted-foreground));
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-resolved-path-link:hover,
.p-resolved-path-link:focus {
  color: hsl(var(--pui-foreground));
}

.p-resolved-path-link svg {
  font-size: 0.875rem;
}
</style>
