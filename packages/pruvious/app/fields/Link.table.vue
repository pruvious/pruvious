<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <span class="p-cell">
        <component
          :is="resolved?.href ? NuxtLink : 'span'"
          :title="resolved?.label || undefined"
          :to="resolved?.href ?? undefined"
          target="_blank"
          class="p-link pui-truncate"
        >
          {{ resolved?.label || '-' }}
        </component>
        <span v-if="resolved && !resolved.isPublic" class="p-badge">
          {{ __('pruvious-dashboard', 'Draft') }}
        </span>
      </span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardEditTableFieldPopup
      v-if="isEditPopupVisible"
      :cell="cell"
      :collection="collection"
      :disabled="!editable"
      :modelValue="modelValue"
      :name="name"
      :options="options"
      @close="$event().then(() => (isEditPopupVisible = false))"
      @updated="refresh?.(true)"
    />
  </div>
</template>

<script lang="ts" setup>
import { NuxtLink } from '#components'
import { __ } from '#pruvious/app'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isRelURL, isString } from '@pruvious/utils'
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
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },
  modelValue: {
    type: [Object, null] as PropType<LinkValue | null>,
  },
  name: {
    type: String,
    required: true,
  },
  options: {
    type: Object as PropType<SerializableFieldOptions<'link'>>,
    required: true,
  },
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },
  refresh: {
    type: Function as PropType<(force?: boolean) => Promise<void>>,
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()

const resolved = computedAsync(async () => {
  const url = props.modelValue?.url
  if (!url) {
    return null
  }
  if (!isRelURL(url)) {
    return { label: url, href: url, isPublic: true }
  }
  try {
    const res = await $fetch<LinkChoicesResult>('/api/pruvious/link-choices', { query: { value: url } })
    const choice = res.data[0]
    if (choice) {
      return { label: choice.label, href: choice.detail, isPublic: choice.isPublic }
    }
  } catch {}
  return { label: url, href: undefined as string | undefined, isPublic: true }
})

const isEditPopupVisible = ref(false)

watch(
  () => route.query,
  () => {
    if (isString(route.query.edit)) {
      const [fieldName, id] = route.query.edit.split(':')
      if (fieldName === props.name && castToNumber(id) === props.cell.row.id) {
        isEditPopupVisible.value = true
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.p-cell {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.p-link {
  min-width: 0;
}

a.p-link {
  color: hsl(var(--pui-muted-foreground));
  text-decoration: none;
}

a.p-link:hover,
a.p-link:focus {
  color: hsl(var(--pui-foreground));
}

.p-badge {
  flex-shrink: 0;
  padding: 0 0.375em;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75em;
  line-height: 1.5;
}
</style>
