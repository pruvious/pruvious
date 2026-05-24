<template>
  <ul class="pui-row">
    <template v-for="{ code, path, isPublic } of otherLanguages">
      <PUIBadge
        v-pui-tooltip="
          path === null
            ? undefined
            : code !== primaryLanguage || prefixPrimaryLanguage
              ? `/${code}` + (path === '/' ? '' : path)
              : path
        "
        :textColor="path === null || !isPublic ? 'inherit' : undefined"
        color="secondary"
        class="p-language-code pui-truncate"
      >
        {{ formatLanguageCode(code) }}
      </PUIBadge>
    </template>
  </ul>
</template>

<script lang="ts" setup>
import { languages, primaryLanguage } from '#pruvious/app'
import { useDashboardContentLanguage } from '#pruvious/dashboard'
import { formatLanguageCode, langSuffix } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current record data from a collection.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
  },
})

const contentLanguage = useDashboardContentLanguage()
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const otherLanguages = languages
  .filter(({ code }) => code !== contentLanguage.value)
  .map(({ code }) => {
    const suffix = langSuffix(code)
    return { code, path: props.data![`path${suffix}`], isPublic: props.data![`isPublic${suffix}`] }
  })
</script>

<style scoped>
.pui-row {
  flex-wrap: wrap;
}

.p-language-code {
  flex-shrink: 1;
}
</style>
