<template>
  <PruviousDashboardPathField
    :disabled="disabled"
    :error="error"
    :modelValue="modelValue"
    :name="name"
    :options="options"
    :path="path"
    :prefix="prefix"
    :synced="synced"
    :translatable="translatable"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <template v-if="resolvedPaths?.length" #below>
      <div class="p-resolved-paths">
        <NuxtLink
          v-for="resolved in resolvedPaths"
          :key="resolved.routeId"
          :title="__('pruvious-dashboard', 'Open in new tab')"
          :to="resolved.fullPath"
          target="_blank"
          class="p-resolved-path-link"
        >
          <span class="pui-truncate">{{ resolved.fullPath }}</span>
          <Icon mode="svg" name="tabler:external-link" class="pui-shrink-0" />
        </NuxtLink>
      </div>
    </template>
  </PruviousDashboardPathField>
</template>

<script lang="ts" setup>
import { __, primaryLanguage } from '#pruvious/app'
import { usePruviousDashboard } from '#pruvious/dashboard'
import type { Collections, SerializableFieldOptions, Singletons } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null],
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
    type: Object as PropType<SerializableFieldOptions<'nullableText'>>,
    required: true,
  },

  /**
   * Defines whether this data container is a `collection` (manages multiple items) or a `singleton` (manages a single item).
   */
  dataContainerType: {
    type: String as PropType<'collection' | 'singleton'>,
    required: true,
  },

  /**
   * The name of the data container in PascalCase format.
   */
  dataContainerName: {
    type: String as PropType<keyof Collections | keyof Singletons>,
    required: true,
  },

  /**
   * The current record data from a collection or singleton.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
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
    type: String,
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

defineEmits<{
  'commit': [value: string | null]
  'update:modelValue': [value: string | null]
}>()

const dashboard = usePruviousDashboard()
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const translatableCollection =
  props.dataContainerType === 'collection' && !!dashboard.value?.collections[props.dataContainerName]?.translatable
const recordLanguage = (translatableCollection ? props.data?.language : primaryLanguage) ?? primaryLanguage
const prefix =
  translatableCollection && props.data?.language && (props.data.language !== primaryLanguage || prefixPrimaryLanguage)
    ? `/${props.data.language}/.../`
    : '/.../'

interface ResolvedSubpath {
  routeId: number
  routePath: string
  fullPath: string
  isPublic: boolean
}

const resolvedPaths = computedAsync<ResolvedSubpath[]>(async () => {
  if (props.dataContainerType !== 'collection' || !isString(props.modelValue)) {
    return []
  }

  try {
    const res = await $fetch<{ data: ResolvedSubpath[] }>('/api/pruvious/resolved-subpaths', {
      query: {
        collection: props.dataContainerName,
        subpath: props.modelValue,
        language: recordLanguage,
      },
    })
    return res.data
  } catch {
    return []
  }
}, [])
</script>

<style scoped>
.p-resolved-paths {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
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
