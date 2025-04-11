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
            <span v-if="permissions[code].id === id" class="pui-row pui-muted pui-truncate">
              <span>-</span>
              <span class="pui-truncate">
                {{ currentlyEditingLabel ?? __('pruvious-dashboard', 'currently editing') }}
              </span>
            </span>
          </div>

          <div class="pui-row">
            <PUIButton
              v-if="!permissions[code].id"
              v-pui-tooltip="__('pruvious-dashboard', 'New translation')"
              :disabled="!permissions[code].canCreate"
              :size="-2"
              :variant="!permissions[code].canCreate ? 'ghost' : 'primary'"
              @click="
                $emit('close', async () =>
                  popup!.close().then(() => {
                    navigateTo(
                      dashboardBasePath +
                        `collections/${slugify(collection.name)}/new?translationOf=${id}&language=${code}`,
                    )
                  }),
                )
              "
            >
              <Icon mode="svg" name="tabler:note" />
            </PUIButton>

            <PUIButton
              v-else-if="permissions[code].id !== id || showEditCurrentButton"
              v-pui-tooltip="
                permissions[code].canUpdate
                  ? __('pruvious-dashboard', 'Edit translation')
                  : __('pruvious-dashboard', 'View translation')
              "
              :disabled="!permissions[code].canRead"
              :size="-2"
              :variant="!permissions[code].canUpdate ? 'ghost' : 'outline'"
              @click="
                $emit('close', async () => {
                  popup!.close().then(() => {
                    navigateTo(dashboardBasePath + `collections/${slugify(collection.name)}/${permissions[code].id}`)
                  })
                })
              "
            >
              <Icon v-if="permissions[code].canUpdate" mode="svg" name="tabler:pencil" />
              <Icon v-else mode="svg" name="tabler:list-search" />
            </PUIButton>

            <PUIButton
              v-if="collection.definition.copyTranslation && (code !== contentLanguage || showEditCurrentButton)"
              v-pui-tooltip="
                __('pruvious-dashboard', 'Copy $from to $to', {
                  from: contentLanguage.toUpperCase(),
                  to: code.toUpperCase(),
                })
              "
              :disabled="
                (!permissions[code].id && !permissions[code].canCreate) ||
                (!!permissions[code].id && !permissions[code].canUpdate)
              "
              :size="-2"
              :variant="
                (!permissions[code].id && !permissions[code].canCreate) ||
                (permissions[code].id && !permissions[code].canUpdate)
                  ? 'ghost'
                  : 'outline'
              "
              @click="copyTranslation(code)"
              :class="{ 'pui-invisible': code === contentLanguage }"
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
  dashboardBasePath,
  languages,
  pruviousDashboardGet,
  pruviousDashboardPost,
  QueryBuilder,
  resolveCollectionRecordPermissions,
  useDashboardContentLanguage,
  type ResolvedCollectionRecordPermissions,
} from '#pruvious/client'
import type { Collections, LanguageCode, SerializableCollection } from '#pruvious/server'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isEmpty, lockAndLoad, slugify } from '@pruvious/utils'

const props = defineProps({
  /**
   * The unique identifier for the current record being operated on.
   */
  id: {
    type: Number,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },

  /**
   * Represents the resolved user permissions for a collection record identified by its `id`.
   * Contains permission settings for all available languages in the CMS.
   * If not provided, the permissions will be resolved automatically.
   */
  resolvedPermissions: {
    type: Object as PropType<ResolvedCollectionRecordPermissions>,
  },

  /**
   * The label to display when a translation is currently being edited.
   */
  currentlyEditingLabel: {
    type: String,
  },

  /**
   * Specifies whether to enable the edit button for the item currently being edited.
   *
   * @default false
   */
  showEditCurrentButton: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  close: [close: () => Promise<void>]
  keydown: [event: KeyboardEvent]
}>()

const contentLanguage = useDashboardContentLanguage()
const popup = useTemplateRef('popup')
const permissions = ref(
  props.resolvedPermissions ?? (await resolveCollectionRecordPermissions(props.id, props.collection)),
)
const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const lock = ref(false)

const copyTranslation = lockAndLoad(lock, async (targetLanguage: LanguageCode) => {
  const operation = permissions.value[targetLanguage].id ? 'update' : 'create'
  const copy = await pruviousDashboardGet(
    `collections/${slugify(props.collection.name)}/${props.id}/copy-translation` as any,
    { query: { targetLanguage, operation } },
  )

  if (copy.success) {
    const query =
      operation === 'create'
        ? await queryBuilder.insertInto(props.collection.name).values(copy.data).run()
        : await queryBuilder
            .update(props.collection.name)
            .set(copy.data)
            .where('id', '=', permissions.value[targetLanguage].id!)
            .run()

    if (query.success) {
      permissions.value = await resolveCollectionRecordPermissions(props.id, props.collection)
      puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
    } else if (!isEmpty(query.inputErrors)) {
      puiToast(__('pruvious-dashboard', 'Error'), {
        type: 'error',
        description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
      })
    } else if (!query.runtimeError) {
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
