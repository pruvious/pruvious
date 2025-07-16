<template>
  <span v-if="showContentLanguageSwitcher && languages.length > 1">
    <PUIButton
      v-pui-tooltip="__('pruvious-dashboard', 'Content language')"
      :variant="isVisible ? 'primary' : 'outline'"
      @click="isVisible = true"
      ref="button"
      :class="{ 'p-button-disabled': disableContentLanguageSwitcher }"
    >
      <span class="p-label pui-uppercase">{{ contentLanguage }}</span>
      <Icon v-if="!disableContentLanguageSwitcher" mode="svg" name="tabler:chevron-down" class="p-icon" />
    </PUIButton>
    <PUIDropdown
      v-if="isVisible"
      :reference="button?.$el"
      :restoreFocus="false"
      @click="isVisible = false"
      @close="isVisible = false"
    >
      <PUIDropdownItem
        v-for="language in languages"
        :indent="contentLanguage !== language.code"
        :key="language.code"
        @click="contentLanguage = language.code"
      >
        <Icon v-if="contentLanguage === language.code" mode="svg" name="tabler:check" />
        <span>{{ language.name }}</span>
      </PUIDropdownItem>
    </PUIDropdown>
  </span>
</template>

<script lang="ts" setup>
import {
  __,
  hasPermission,
  languages,
  pruviousDashboardPatch,
  useAuth,
  useDashboardContentLanguage,
} from '#pruvious/client'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import { isUndefined } from '@pruvious/utils'

const showContentLanguageSwitcher = inject('showContentLanguageSwitcher', false)
const disableContentLanguageSwitcher = inject('disableContentLanguageSwitcher', false)
const silentContentLanguageSwitcher = inject('silentContentLanguageSwitcher', false)
const auth = useAuth()
const contentLanguage = useDashboardContentLanguage()
const button = useTemplateRef('button')
const isVisible = ref(false)

let preferredContentLanguage = hasPermission('update-account')
  ? auth.value.user?.contentLanguage
  : localStorage.getItem('contentLanguage')

const stop = watch(
  contentLanguage,
  async (contentLanguage, oldValue) => {
    if (preferredContentLanguage !== contentLanguage) {
      preferredContentLanguage = contentLanguage

      if (!silentContentLanguageSwitcher || isUndefined(oldValue)) {
        if (hasPermission('update-account')) {
          const query = await pruviousDashboardPatch('me', { body: { contentLanguage } })

          if (query.success) {
            Object.assign(auth.value.user ?? {}, query.data)
          }
        } else {
          localStorage.setItem('contentLanguage', contentLanguage)
        }

        puiQueueToast(
          __('pruvious-dashboard', 'Switched content language to `$language`', {
            language: contentLanguage.toUpperCase(),
          }),
        )
      }
    }
  },
  { immediate: true },
)

onBeforeRouteLeave(stop)
</script>

<style scoped>
.p-label,
.p-icon {
  font-size: 1em;
}

.p-button-disabled {
  pointer-events: none;
}
</style>
