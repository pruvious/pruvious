<template>
  <Teleport to="body">
    <div class="p-widget-wrapper">
      <div
        :data-side="collapsible ? side : null"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
        @mouseenter="hovered = true"
        @mouseleave="hovered = false"
        ref="widgetEl"
        :class="['p-widget', { 'p-widget-collapsed': collapsible && collapsed }]"
      >
        <span aria-hidden="true" class="p-widget-logo">
          <PruviousDashboardLogoMark />
        </span>
        <a :href="dashboardHref" :title="__('pruvious-dashboard', 'Dashboard')">
          <Icon mode="svg" name="tabler:adjustments-horizontal" />
        </a>
        <a v-if="editHref" :href="editHref" :title="__('pruvious-dashboard', 'Edit')">
          <Icon mode="svg" name="tabler:pencil" />
        </a>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { __, hasPermission, preloadTranslatableStrings, useLanguage, usePruviousRoute } from '#pruvious/app'
import { dashboardBasePath } from '#pruvious/dashboard/base'
import type { Permission } from '#pruvious/server'
import { slugify, withTrailingSlash } from '@pruvious/utils'

type CollapseSide = 'top' | 'right' | 'bottom' | 'left'

const COLLAPSE_DELAY_MS = 3000

const proute = usePruviousRoute()
const language = useLanguage()

await preloadTranslatableStrings('pruvious-dashboard', language.value as any)

const dashboardHref = withTrailingSlash(dashboardBasePath)

const editHref = computed(() => {
  const ref = proute.value?.ref
  if (!ref) {
    return null
  }
  const name = slugify(ref.replace(/:Singleton$/, ''))
  const recordId = proute.value?.recordId
  const base = withTrailingSlash(dashboardBasePath)
  if (recordId === undefined) {
    return hasPermission(`singleton:${name}:update` as Permission) ? `${base}singletons/${name}` : null
  }
  return hasPermission(`collection:${name}:update` as Permission) ? `${base}collections/${name}/${recordId}` : null
})

const widgetEl = ref<HTMLElement>()
const hovered = ref(false)
const focused = ref(false)
const collapsed = ref(false)
const collapsible = ref(false)
const side = ref<CollapseSide | null>(null)

let collapseTimer: ReturnType<typeof setTimeout> | null = null

function clearCollapseTimer() {
  if (collapseTimer) {
    clearTimeout(collapseTimer)
    collapseTimer = null
  }
}

function detectSide() {
  if (!widgetEl.value) {
    return
  }

  const styles = getComputedStyle(widgetEl.value)
  const isZero = (value: string) => parseFloat(value) === 0

  if (isZero(styles.right)) {
    side.value = 'right'
  } else if (isZero(styles.left)) {
    side.value = 'left'
  } else if (isZero(styles.bottom)) {
    side.value = 'bottom'
  } else if (isZero(styles.top)) {
    side.value = 'top'
  } else {
    side.value = null
  }
  collapsible.value = side.value !== null
}

function onFocusIn() {
  focused.value = true
}

function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null
  if (next && widgetEl.value?.contains(next)) {
    return
  }
  focused.value = false
}

watch([hovered, focused, collapsible], ([h, f, c]) => {
  clearCollapseTimer()
  if (!c) {
    collapsed.value = false
    return
  }
  if (h || f) {
    collapsed.value = false
  } else {
    collapseTimer = setTimeout(() => {
      collapsed.value = true
      collapseTimer = null
    }, COLLAPSE_DELAY_MS)
  }
})

onMounted(() => {
  detectSide()
})

onUnmounted(() => {
  clearCollapseTimer()
})
</script>

<style scoped>
.p-widget-wrapper {
  position: fixed;
  inset: 0;
  z-index: var(--p-widget-z-index, 99999);
  overflow: hidden;
  pointer-events: none;
}

.p-widget {
  position: absolute;
  top: var(--p-widget-top, auto);
  right: var(--p-widget-right, 0);
  bottom: var(--p-widget-bottom, 4rem);
  left: var(--p-widget-left, auto);
  display: flex;
  overflow: clip;
  pointer-events: auto;
  background-color: var(--p-widget-background, hsl(210 22.2% 96.5%));
  color: var(--p-widget-color, hsl(228 11% 44%));
  border-top-left-radius: var(--p-widget-radius-tl, 1rem);
  border-top-right-radius: var(--p-widget-radius-tr, 0);
  border-bottom-right-radius: var(--p-widget-radius-br, 0);
  border-bottom-left-radius: var(--p-widget-radius-bl, 1rem);
  box-shadow:
    0 0 0 1px var(--p-widget-glow-color, hsl(217 91% 60% / 0.22)),
    0 0 32px 8px var(--p-widget-glow-color, hsl(217 91% 60% / 0.18)),
    0 0 64px 16px var(--p-widget-glow-color, hsl(217 91% 60% / 0.1)),
    var(--p-widget-shadow, 0 1px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.1));
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.p-widget-collapsed {
  box-shadow:
    0 0 0 1px transparent,
    0 0 32px 8px transparent,
    0 0 64px 16px transparent,
    var(--p-widget-shadow, 0 1px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.1));
}

.p-widget-collapsed[data-side='right'] {
  transform: translateX(calc(100% - 2rem));
}

.p-widget-collapsed[data-side='left'] {
  transform: translateX(calc(-100% + 2rem));
}

.p-widget-collapsed[data-side='bottom'] {
  transform: translateY(calc(100% - 2rem));
}

.p-widget-collapsed[data-side='top'] {
  transform: translateY(calc(-100% + 2rem));
}

.p-widget a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: inherit;
  transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.p-widget a:not(:last-child) {
  border-right: 1px solid var(--p-widget-divider, hsl(210 8% 90.2%));
}

.p-widget a:hover,
.p-widget a:focus-visible {
  color: var(--p-widget-color-accent, hsl(324 49% 10%));
}

.p-widget :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.p-widget-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-right: 1px solid var(--p-widget-divider, hsl(210 8% 90.2%));
}

.p-widget-logo :deep(svg) {
  width: auto;
  height: 0.875rem;
  opacity: 0.64;
}
</style>

<style>
.dark .p-widget {
  background-color: var(--p-widget-background, hsl(234 16.7% 11.8%));
  color: var(--p-widget-color, hsl(228 11% 65%));
}

.dark .p-widget a:not(:last-child) {
  border-right-color: var(--p-widget-divider, hsl(231 16.7% 24%));
}

.dark .p-widget a:hover,
.dark .p-widget a:focus-visible {
  color: var(--p-widget-color-accent, hsl(0 0% 98%));
}

.dark .p-widget-logo {
  border-right-color: var(--p-widget-divider, hsl(231 16.7% 24%));
}
</style>
