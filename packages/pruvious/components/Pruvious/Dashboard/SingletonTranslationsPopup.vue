<template>
  <PUIPopup @close="$emit('close', $event)" @keydown="$emit('keydown', $event)" ref="popup">
    <template #header>
      <div class="pui-row">
        <span class="p-title">{{ __('pruvious-dashboard', 'Translations') }}</span>
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

    <div>
      <template v-for="({ code, name }, i) of languages">
        <hr v-if="i > 0" />

        <div class="p-row pui-justify-between">
          <div class="pui-row">
            <div class="pui-uppercase pui-shrink-0">{{ code }}</div>
            <span class="pui-muted pui-truncate">({{ name }})</span>
            <span v-if="code === contentLanguage" class="pui-row pui-muted pui-truncate">
              <span>-</span>
              <span class="pui-truncate">
                {{ __('pruvious-dashboard', 'currently editing') }}
              </span>
            </span>
          </div>

          <div class="pui-row">
            <PUIButton
              v-if="code !== contentLanguage"
              v-pui-tooltip="canUpdate ? __('pruvious-dashboard', 'Edit') : __('pruvious-dashboard', 'View')"
              :size="-2"
              :variant="!canUpdate ? 'ghost' : 'outline'"
              @click="
                $emit('close', async () => {
                  popup!.close().then(() => {
                    contentLanguage = code
                  })
                })
              "
            >
              <Icon v-if="canUpdate" mode="svg" name="tabler:pencil" />
              <Icon v-else mode="svg" name="tabler:list-search" />
            </PUIButton>

            <PUIButton
              v-if="singleton.definition.copyTranslation"
              v-pui-tooltip="
                __('pruvious-dashboard', 'Copy $from to $to', {
                  from: contentLanguage.toUpperCase(),
                  to: code.toUpperCase(),
                })
              "
              :disabled="!canUpdate"
              :size="-2"
              :variant="!canUpdate ? 'ghost' : 'outline'"
              @click="copyTranslation(code)"
            >
              <Icon mode="svg" name="tabler:file-import" />
            </PUIButton>
          </div>
        </div>
      </template>
    </div>
  </PUIPopup>
</template>

<script lang="ts" setup>
import {
  __,
  hasPermission,
  languages,
  pruviousDashboardGet,
  SingletonUpdateQueryBuilder,
  useDashboardContentLanguage,
} from '#pruvious/client'
import type { LanguageCode, Permission, SerializableSingleton, Singletons } from '#pruvious/server'
import { isEmpty, lockAndLoad, slugify } from '@pruvious/utils'

const props = defineProps({
  /**
   * The name and definition of the current translatable singleton.
   */
  singleton: {
    type: Object as PropType<{ name: keyof Singletons; definition: SerializableSingleton }>,
    required: true,
  },
})

defineEmits<{
  close: [close: () => Promise<void>]
  keydown: [event: KeyboardEvent]
}>()

const contentLanguage = useDashboardContentLanguage()
const popup = useTemplateRef('popup')
const canUpdate =
  props.singleton.definition.api.update &&
  hasPermission(`singleton:${slugify(props.singleton.name)}:update` as Permission)
const lock = ref(false)

const copyTranslation = lockAndLoad(lock, async (targetLanguage: LanguageCode) => {
  const copy = await pruviousDashboardGet(`singletons/${slugify(props.singleton.name)}/copy-translation` as any, {
    query: { language: contentLanguage.value, targetLanguage },
  })

  if (copy.success) {
    const query = await new SingletonUpdateQueryBuilder(props.singleton.name)
      .set(copy.data)
      .language(targetLanguage as never)
      .run()

    if (query.success) {
      puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
    } else if (query.runtimeError) {
      puiToast(query.runtimeError)
    } else if (!isEmpty(query.inputErrors)) {
      puiToast(__('pruvious-dashboard', 'Error'), {
        type: 'error',
        description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
      })
    } else {
      puiToast(__('pruvious-dashboard', 'An error occurred while copying the translation'), { type: 'error' })
    }
  } else {
    puiToast(copy.error.message ?? __('pruvious-dashboard', 'An error occurred while copying the translation'), {
      type: 'error',
    })
  }
})
</script>

<style scoped>
.p-title {
  font-weight: 500;
}
</style>

<style scoped>
hr {
  width: calc(100% + 1.5rem);
  margin: 0.75rem -0.75rem;
}

:deep(.pui-button:disabled) {
  opacity: 0.24;
}
</style>
