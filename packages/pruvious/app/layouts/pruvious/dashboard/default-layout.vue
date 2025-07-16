<template>
  <PruviousDashboardBase>
    <div
      @keydown.escape="dashboardLayout.sidebarExpanded && !puiIsEditingText() && toggleSidebar()"
      tabindex="-1"
      class="p-layout"
      :class="[
        `p-layout-${$slots.sidebar ? 's' : ''}m`,
        { 'p-sidebar-expanded': dashboardLayout.sidebarExpanded, 'p-layout-transition': transition },
      ]"
    >
      <div ref="header" class="p-header">
        <slot name="header" />
      </div>

      <PUIContainer v-if="$slots.sidebar" ref="sidebar" class="p-sidebar">
        <div ref="sidebarContent" class="p-sidebar-content">
          <slot name="sidebar" />
        </div>
      </PUIContainer>

      <PUIContainer
        @click="dashboardLayout.sidebarExpanded && toggleSidebar()"
        class="p-main"
        :class="{ 'p-main-no-padding': noMainPadding, 'p-main-no-scroll': noMainScroll }"
      >
        <div class="p-main-content">
          <slot />
        </div>
      </PUIContainer>
    </div>
  </PruviousDashboardBase>
</template>

<script lang="ts" setup>
import { getOverlayTransitionDuration, usePruviousDashboardLayout } from '#pruvious/client'
import { puiIsEditingText } from '@pruvious/ui/pui/hotkeys'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { useElementSize } from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'

defineProps({
  /**
   * Whether to remove the padding from the `main` slot.
   *
   * @default false
   */
  noMainPadding: {
    type: Boolean,
    default: false,
  },

  /**
   * Whether to disable scrolling on the `main` slot.
   *
   * @default false
   */
  noMainScroll: {
    type: Boolean,
    default: false,
  },
})

const dashboardLayout = usePruviousDashboardLayout()
const header = useTemplateRef('header')
const sidebar = useTemplateRef('sidebar')
const sidebarContent = useTemplateRef('sidebarContent')
const { height: sidebarContentHeight } = useElementSize(sidebarContent)
const transition = ref(false)
const overlayCounter = usePUIOverlayCounter()
const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } = useFocusTrap([header, sidebar], {
  allowOutsideClick: true,
  escapeDeactivates: false,
  initialFocus: false,
  returnFocusOnDeactivate: false,
})

let transitionTimeout: NodeJS.Timeout | undefined

defineExpose({ sidebar, toggleSidebar })

provide('sidebar', { el: sidebar, toggle: toggleSidebar })

onMounted(() => {
  nextTick(() => {
    if (sidebar.value) {
      sidebar.value.scroll.y.value = dashboardLayout.value.sidebarScrollY
      sidebarContentHeight.value = dashboardLayout.value.sidebarContentHeight

      nextTick(() => {
        if (dashboardLayout.value.sidebarExpanded) {
          toggleSidebar()
        }
      })
    }
  })
})

onBeforeUnmount(() => {
  if (sidebar.value) {
    dashboardLayout.value.sidebarScrollY = sidebar.value.scroll.y.value
    dashboardLayout.value.sidebarContentHeight = sidebarContentHeight.value
  }
  clearTimeout(transitionTimeout)
})

watch(
  () => dashboardLayout.value.sidebarExpanded,
  () => {
    if (dashboardLayout.value.sidebarExpanded) {
      activateFocusTrap()
    } else {
      deactivateFocusTrap()
    }
  },
  { immediate: true },
)

async function toggleSidebar() {
  clearTimeout(transitionTimeout)
  transition.value = true
  nextTick(() => {
    dashboardLayout.value.sidebarExpanded = !dashboardLayout.value.sidebarExpanded
    transitionTimeout = setTimeout(() => {
      transition.value = false
    }, getOverlayTransitionDuration())
  })
}
</script>

<style scoped>
.p-layout {
  position: relative;
  display: grid;
  grid-template-rows: 2.5rem 1fr;
  row-gap: calc(1rem + 1px);
  column-gap: 1rem;
  width: 100%;
  max-width: 108rem;
  height: 100dvh;
  margin: 0 -1rem;
  padding: 0.5rem 1.5rem 1.5rem;
  outline: none;
}

.p-layout-sm {
  grid-template-areas:
    'header header'
    'sidebar main';
  grid-template-columns: 16rem 1fr;
}

.p-layout-m {
  grid-template-areas:
    'header'
    'main';
  grid-template-columns: 1fr;
}

.p-layout::after {
  content: '';
  position: absolute;
  bottom: calc(1rem - 1px);
  right: -50vw;
  left: -50vw;
  height: 1px;
  background-color: hsl(var(--pui-border));
}

.p-header {
  grid-area: header;
  position: relative;
}

.p-header::after {
  content: '';
  position: absolute;
  right: -50vw;
  bottom: calc(-0.5rem - 1px);
  left: -50vw;
  height: 1px;
  background-color: hsl(var(--pui-border));
}

.p-sidebar {
  grid-area: sidebar;
  position: relative;
  display: flex;
  flex-direction: column;
  margin: -0.5rem;
  border-right: 1px solid hsl(var(--pui-border));
}

.p-sidebar-content {
  width: 100%;
  padding: 0.5rem;
}

.p-main {
  grid-area: main;
  position: relative;
  margin: -0.5rem;
  padding: 0.5rem;
}

.p-main-no-padding {
  padding: 0;
}

.p-main-no-scroll > :deep(.pui-container-content) {
  height: 100%;
}

.p-main-content {
  height: 100%;
}

:deep(.pui-base-content) {
  height: 100dvh;
  overflow: clip;
}

:deep(.p-wrapper::before),
:deep(.p-wrapper::after) {
  height: 150dvh;
  margin-top: -25dvh;
}

@media (max-width: 1024px) {
  .p-layout {
    grid-template-rows: 2.25rem 1fr;
  }

  .p-layout-sm {
    grid-template-areas:
      'header'
      'main';
    grid-template-columns: 1fr;
  }

  .p-sidebar {
    position: fixed;
    z-index: 99;
    top: calc(3.25rem + 1px);
    left: 0;
    bottom: 1rem;
    width: 17rem;
    max-width: 100%;
    margin: 0;
    background-color: hsl(var(--pui-background));
    visibility: hidden;
    transform: translateX(-100%);
  }

  .p-layout-transition .p-sidebar {
    transition: var(--pui-transition);
    transition-property: visibility transform;
    transition-duration: var(--pui-overlay-transition-duration);
  }

  .p-sidebar-expanded .p-sidebar {
    visibility: visible;
    transform: translateX(0);
  }

  .p-main {
    transform-origin: right;
    transform: translate3d(0, 0, 0);
  }

  .p-layout-transition .p-main {
    transition: var(--pui-transition);
    transition-property: opacity filter transform;
    transition-duration: var(--pui-overlay-transition-duration);
  }

  .p-sidebar-expanded .p-main {
    opacity: 0.36;
    filter: blur(1px);
    transform: translate3d(0, 0, 0) scale(0.97);
  }

  .p-sidebar-expanded .p-main-content {
    pointer-events: none;
  }
}

@media (max-width: 767px) {
  .p-layout {
    margin: 0;
    padding: 0.5rem;
  }

  .p-layout::after {
    display: none;
  }

  .p-header::after {
    right: -0.5rem;
    left: -0.5rem;
  }

  .p-sidebar {
    bottom: 0;
  }

  :deep(.p-wrapper::before),
  :deep(.p-wrapper::after) {
    display: none;
  }
}
</style>
