<template>
  <PUIPopup :size="-1" @close="$emit('close', $event)" ref="popup" width="26rem">
    <template #header>
      <div class="pui-row">
        <span class="pui-medium">
          {{ initialHref ? __('pruvious-dashboard', 'Edit link') : __('pruvious-dashboard', 'Insert link') }}
        </span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="$emit('close', popup!.close)"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

    <PUIField>
      <PUIFieldLabel>
        <label :for="urlId">{{ __('pruvious-dashboard', 'URL') }}</label>
      </PUIFieldLabel>
      <PUIDynamicSelect
        :choicesResolver="choicesResolver"
        :disabled="disabled"
        :id="urlId"
        :initialKeyword="externalKeyword"
        :modelValue="draftBase"
        :noResultsLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="__('pruvious-dashboard', 'Select a page or enter a URL')"
        :searchLabel="__('pruvious-dashboard', 'Search...')"
        :selectedChoiceResolver="selectedChoiceResolver"
        @update:modelValue="onSelect($event as string | null)"
      />
      <div v-if="resolvedDetail" class="p-resolved-path">
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
    </PUIField>

    <PUIField v-if="showTarget">
      <PUIFieldLabel>
        <label :for="targetId">{{ __('pruvious-dashboard', 'Target') }}</label>
      </PUIFieldLabel>
      <PUISelect
        :choices="targetChoices"
        :disabled="disabled"
        :id="targetId"
        :modelValue="draftTarget"
        @update:modelValue="draftTarget = ($event as string) ?? ''"
      />
      <PruviousFieldMessage :options="targetOptions" name="target" />
    </PUIField>

    <PUIField v-if="showRel">
      <PUIFieldLabel>
        <label :for="relId">{{ __('pruvious-dashboard', 'Relationship (rel)') }}</label>
      </PUIFieldLabel>
      <PUIInput
        :disabled="disabled"
        :id="relId"
        :modelValue="draftRel"
        :spellcheck="false"
        @update:modelValue="draftRel = $event"
        autocomplete="off"
        placeholder="noopener noreferrer"
      >
        <template #suffix>
          <PUIButton
            v-if="!draftRel && !disabled"
            v-pui-tooltip="__('pruvious-dashboard', 'Apply `nofollow noopener noreferrer`')"
            @click="draftRel = 'nofollow noopener noreferrer'"
            tabindex="-1"
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:wand" />
          </PUIButton>
        </template>
      </PUIInput>
      <PruviousFieldMessage :options="relOptions" name="rel" />
    </PUIField>

    <PUIField v-if="showQuery">
      <PUIFieldLabel>
        <label :for="queryId">{{ __('pruvious-dashboard', 'Query string') }}</label>
      </PUIFieldLabel>
      <PUIInput
        :disabled="disabled"
        :id="queryId"
        :modelValue="draftQuery"
        :spellcheck="false"
        @update:modelValue="draftQuery = normalizeQuery($event)"
        autocomplete="off"
        placeholder="foo=bar&baz=qux"
      />
      <PruviousFieldMessage :options="queryOptions" name="query" />
    </PUIField>

    <PUIField v-if="showHash">
      <PUIFieldLabel>
        <label :for="hashId">{{ __('pruvious-dashboard', 'Hash') }}</label>
      </PUIFieldLabel>
      <PUIInput
        :disabled="disabled"
        :id="hashId"
        :modelValue="draftHash"
        :spellcheck="false"
        @update:modelValue="draftHash = normalizeHash($event)"
        autocomplete="off"
        placeholder="section"
      />
      <PruviousFieldMessage :options="hashOptions" name="hash" />
    </PUIField>

    <template #footer>
      <div class="pui-row pui-justify-between">
        <PUIButton @click="$emit('close', popup!.close)" variant="outline">
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>

        <div class="pui-row">
          <PUIButton v-if="initialHref" :disabled="disabled" @click="remove()" destructiveHover variant="outline">
            {{ __('pruvious-dashboard', 'Remove') }}
          </PUIButton>
          <PUIButton
            :disabled="disabled || !draftBase"
            :variant="isApplyEnabled ? 'primary' : 'outline'"
            @click="save()"
          >
            {{ __('pruvious-dashboard', 'Apply') }}
          </PUIButton>
        </div>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, languages, primaryLanguage } from '#pruvious/app'
import type {
  PUIDynamicSelectChoiceModel,
  PUIDynamicSelectPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicSelect.vue'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { isArray, isRelURL, isString, parseRelURL, type Primitive } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'
import type { LinksOptions } from '../../../../server/fields/richText'

interface LinkChoice {
  value: string
  label: string
  detail: string
  isPublic: boolean
}

interface LinkChoicesResult {
  data: LinkChoice[]
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

const props = defineProps({
  /**
   * The committed `href` attribute value. Use `''` when inserting a new link.
   */
  href: {
    type: String,
    default: '',
  },

  /**
   * The committed `target` attribute value.
   */
  target: {
    type: String,
    default: '',
  },

  /**
   * The committed `rel` attribute value.
   */
  rel: {
    type: String,
    default: '',
  },

  /**
   * Link restrictions (mirrors the `links` option on the `richText` field).
   */
  options: {
    type: Object as PropType<LinksOptions>,
    default: () => ({}),
  },

  /**
   * Whether the inputs are disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  save: [value: { href: string; target: string; rel: string }]
  close: [close: () => Promise<void>]
}>()

defineExpose({ close })

const popup = useTemplateRef('popup')
const urlId = useId()
const targetId = useId()
const relId = useId()
const queryId = useId()
const hashId = useId()

const allowExternal = computed(() => props.options.allowExternal !== false)
const allowHash = computed(() => props.options.allowHash !== false)
const allowQuery = computed(() => props.options.allowQuery !== false)
const allowDrafts = computed(() => props.options.allowDrafts !== false)
const allowedReferences = computed(() => props.options.allowedReferences ?? '*')
const showTarget = computed(() => props.options.showTarget !== false)
const showRel = computed(() => props.options.showRel !== false)

const uiLanguages = computed<string[]>(() => {
  const option = props.options.languages ?? 'current'
  if (option === 'all') {
    return languages.map(({ code }) => code)
  }
  if (isArray(option)) {
    return option as string[]
  }
  return [primaryLanguage]
})

const initialHref = props.href
const initial = splitHref(props.href)

const draftBase = ref<string | null>(initial.base)
const draftQuery = ref(initial.query)
const draftHash = ref(initial.hash)
const draftTarget = ref(props.target)
const draftRel = ref(props.rel)

const externalKeyword = computed(() => (draftBase.value && !isRelURL(draftBase.value) ? draftBase.value : ''))

const isInternal = computed(() => !!draftBase.value && isRelURL(draftBase.value))

const resolvedLink = computedAsync(async () => {
  if (!draftBase.value || !isRelURL(draftBase.value)) {
    return null
  }
  try {
    const res = await $fetch<LinkChoicesResult>('/api/pruvious/link-choices', { query: { value: draftBase.value } })
    const choice = res.data[0]
    return choice ? { detail: choice.detail, isPublic: choice.isPublic } : null
  } catch {
    return null
  }
}, null)

const resolvedDetail = computed(() => resolvedLink.value?.detail ?? null)

const showQuery = computed(() => isInternal.value && allowQuery.value)
const showHash = computed(() => isInternal.value && allowHash.value)

const isApplyEnabled = computed(
  () =>
    !!draftBase.value &&
    (draftBase.value !== initial.base ||
      draftQuery.value !== initial.query ||
      draftHash.value !== initial.hash ||
      draftTarget.value !== props.target ||
      draftRel.value !== props.rel),
)

const targetChoices = [
  { value: '', label: __('pruvious-dashboard', 'Default') },
  { value: '_blank', label: '_blank' },
  { value: '_self', label: '_self' },
  { value: '_parent', label: '_parent' },
  { value: '_top', label: '_top' },
]

const targetOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Determines where the linked page opens. For example, `_blank` opens it in a new browser tab.',
    ),
  },
} as any
const relOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Sets the `rel` attribute of the link. Separate multiple tokens with spaces, e.g. `noopener noreferrer`.',
    ),
  },
} as any
const queryOptions = {
  ui: {
    description: __('pruvious-dashboard', 'Added to the end of the URL after a `?`, for example `page=2&sort=asc`.'),
  },
} as any
const hashOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Added to the end of the URL after a `#` to scroll to a section on the target page.',
    ),
  },
} as any

const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popup.value?.root,
  listen: false,
})

let transitionDuration = 300

onMounted(() => {
  setTimeout(() =>
    setTimeout(() =>
      setTimeout(() => {
        const potd = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
        transitionDuration = potd.endsWith('ms') ? parseInt(potd) : potd.endsWith('s') ? parseFloat(potd) * 1000 : 300
        setTimeout(
          () =>
            popup.value?.root
              ?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [tabindex="0"]')
              ?.focus(),
          transitionDuration,
        )
      }),
    ),
  )
  setTimeout(() => {
    isListening.value = true
    listen('save', (event) => {
      event.preventDefault()
      save()
    })
  })
})

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
  draftBase.value = value
  if (!value || !isRelURL(value)) {
    draftQuery.value = ''
    draftHash.value = ''
  }
}

function recombine(): string {
  if (!draftBase.value) {
    return ''
  }

  let url = draftBase.value

  if (isRelURL(draftBase.value)) {
    if (allowQuery.value && draftQuery.value) {
      url += `?${draftQuery.value}`
    }
    if (allowHash.value && draftHash.value) {
      url += `#${draftHash.value}`
    }
  }

  return url
}

function save() {
  if (props.disabled || !draftBase.value) {
    return
  }

  emit('save', { href: recombine(), target: draftTarget.value, rel: draftRel.value })
  emit('close', popup.value!.close)
}

function remove() {
  if (props.disabled) {
    return
  }

  emit('save', { href: '', target: '', rel: '' })
  emit('close', popup.value!.close)
}

function close() {
  emit('close', popup.value!.close)
}

function splitHref(href: string): { base: string | null; query: string; hash: string } {
  if (!href) {
    return { base: null, query: '', hash: '' }
  }

  if (isRelURL(href)) {
    const parsed = parseRelURL(href, primaryLanguage)
    if (parsed) {
      return {
        base: href.split('#')[0]!.split('?')[0]!,
        query: parsed.query ?? '',
        hash: parsed.hash ?? '',
      }
    }
  }

  return { base: href, query: '', hash: '' }
}

function normalizeQuery(value: string): string {
  return value.replace(/^\?+/, '')
}

function normalizeHash(value: string): string {
  return value.replace(/^#+/, '')
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
