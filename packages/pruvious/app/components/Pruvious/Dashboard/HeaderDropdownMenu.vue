<template>
  <PUIButton
    :title="__('pruvious-dashboard', 'Open user menu')"
    :variant="isVisible ? 'primary' : 'outline'"
    @click="isVisible = true"
    ref="button"
  >
    <Icon mode="svg" name="tabler:dots-vertical" />
  </PUIButton>
  <PUIDropdown v-if="isVisible" :reference="button?.$el" @click="isVisible = false" @close="isVisible = false">
    <template v-for="(items, i) of groups">
      <hr v-if="i > 0" />
      <PUIDropdownItem
        v-for="({ label, action, icon, to }, i) of items"
        :destructive="to === dashboardBasePath + 'logout'"
        :to="to"
        @click="(action?.($event), (isVisible = false))"
      >
        <Icon v-if="typeof icon === 'string'" :name="`tabler:${icon}`" mode="svg" />
        <component v-else-if="icon" :is="icon" />
        <span>{{ label }}</span>
      </PUIDropdownItem>
    </template>
  </PUIDropdown>
</template>

<script lang="ts" setup>
import {
  __,
  applyFilters,
  dashboardBasePath,
  hasPermission,
  loadFilters,
  prepareDashboardMenu,
  type DashboardMenuItem,
} from '#pruvious/client'
import type { PUIColorMode } from '@pruvious/ui/components/PUIColorMode.vue'
import { computedAsync } from '@vueuse/core'

await loadFilters('dashboard:menu:header:dropdown')

const route = useRoute()
const colorMode = useColorMode()
const _colorMode = ref<PUIColorMode>()
const button = useTemplateRef('button')
const isVisible = ref(false)
const groups = computedAsync<Omit<DashboardMenuItem, 'active' | 'submenu'>[][]>(async () => {
  const _groups: Omit<DashboardMenuItem, 'active' | 'submenu'>[][] = [
    [
      {
        action: () => (_colorMode.value === 'light' ? changeColorMode('dark') : changeColorMode('light')),
        label:
          _colorMode.value === 'light' ? __('pruvious-dashboard', 'Dark mode') : __('pruvious-dashboard', 'Light mode'),
        icon: _colorMode.value === 'light' ? 'moon' : 'sun',
      },
    ],
    [
      ...(hasPermission('update-own-account')
        ? [{ to: 'me', label: __('pruvious-dashboard', 'My account'), icon: 'user' } as const]
        : []),
      {
        to: 'logout',
        label: __('pruvious-dashboard', 'Sign out'),
        icon: 'logout',
      },
    ],
  ]

  return applyFilters('dashboard:menu:header:dropdown', _groups, {}).then((_groups) =>
    _groups.map((items) => prepareDashboardMenu(items, route)),
  )
})

let prefersColorScheme: MediaQueryList | undefined

onMounted(() => {
  prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)')
  prefersColorScheme.addEventListener('change', updateColorMode)
  watch(() => colorMode.preference, updateColorMode, { immediate: true })
})

onUnmounted(() => {
  prefersColorScheme?.removeEventListener('change', updateColorMode)
})

function updateColorMode() {
  let newValue = colorMode.preference as PUIColorMode

  if (colorMode.preference === 'system') {
    newValue = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  _colorMode.value = newValue
}

function changeColorMode(mode: PUIColorMode) {
  document.body.classList.add('pui-no-transition')
  colorMode.preference = mode
  setTimeout(() => document.body.classList.remove('pui-no-transition'), 150)
}
</script>
