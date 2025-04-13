<template>
  <div class="p-table-settings-bookmarks">
    <PUIField>
      <PUIFieldLabel>
        <span class="pui-label pui-muted">{{ __('pruvious-dashboard', 'Predefined') }}</span>
      </PUIFieldLabel>

      <PUIStructure :modelValue="[{}]">
        <template #item>
          <div class="pui-row">
            <span class="pui-truncate pui-mr-auto">{{ __('pruvious-dashboard', 'Default settings') }}</span>
            <PUIButton
              v-pui-tooltip="
                isDefaultApplied ? __('pruvious-dashboard', 'Currently applied') : __('pruvious-dashboard', 'Apply')
              "
              :size="-3"
              :variant="isDefaultApplied ? 'accent' : 'outline'"
              @click="$emit('restore', true)"
            >
              <Icon mode="svg" name="tabler:check" />
            </PUIButton>

            <PUIButton
              v-pui-tooltip="
                !defaultBookmarkId
                  ? __('pruvious-dashboard', 'Currently default')
                  : __('pruvious-dashboard', 'Set as default')
              "
              :size="-3"
              :variant="!defaultBookmarkId ? 'accent' : 'outline'"
              @click="setDefaultBookmark(null)"
            >
              <Icon mode="svg" name="tabler:star" />
            </PUIButton>

            <PUIButton
              v-if="!isDefault"
              v-pui-tooltip="__('pruvious-dashboard', 'Load configuration')"
              :size="-3"
              @click="
                () => {
                  $emit('restore', false)
                  puiToast(__('pruvious-dashboard', 'Loaded'), { type: 'success' })
                }
              "
              variant="outline"
            >
              <Icon mode="svg" name="tabler:arrow-bar-to-down" />
            </PUIButton>
          </div>
        </template>
      </PUIStructure>
    </PUIField>

    <PUIField>
      <PUIFieldLabel>
        <span class="pui-label pui-muted">{{ __('pruvious-dashboard', 'My bookmarks') }}</span>
      </PUIFieldLabel>

      <div v-if="myBookmarks.length" class="pui-relative">
        <PUIStructure :modelValue="myBookmarks">
          <template #item="{ item }">
            <div class="pui-row">
              <span class="pui-row pui-mr-auto">
                <span class="pui-truncate">{{ item.name }}</span>
                <span v-if="item.shared" class="pui-muted pui-shrink-0">
                  ({{ __('pruvious-dashboard', 'shared') }})
                </span>
              </span>

              <PUIButton
                v-pui-tooltip="
                  item.data === appliedBookmarkString
                    ? __('pruvious-dashboard', 'Currently applied')
                    : __('pruvious-dashboard', 'Apply')
                "
                :size="-3"
                :variant="item.data === appliedBookmarkString ? 'accent' : 'outline'"
                @click="
                  () => {
                    $emit('update:modelValue', JSON.parse(item.data))
                    $emit('apply')
                  }
                "
              >
                <Icon mode="svg" name="tabler:check" />
              </PUIButton>

              <PUIButton
                v-pui-tooltip="
                  item.id === defaultBookmarkId
                    ? __('pruvious-dashboard', 'Currently default')
                    : __('pruvious-dashboard', 'Set as default')
                "
                :size="-3"
                :variant="item.id === defaultBookmarkId ? 'accent' : 'outline'"
                @click="setDefaultBookmark(item.id)"
              >
                <Icon mode="svg" name="tabler:star" />
              </PUIButton>

              <div v-if="canUpdate || canDelete || item.data !== currentBookmarkString" class="pui-row pui-shrink-0">
                <PUIButton
                  v-pui-tooltip="__('pruvious-dashboard', 'More actions')"
                  :ref="(el) => (actionButtons[item.id] = el)"
                  :size="-3"
                  :variant="visibleActions?.id === item.id ? 'primary' : 'outline'"
                  @click="visibleActions = visibleActions?.id === item.id ? null : item"
                >
                  <Icon mode="svg" name="tabler:dots-vertical" />
                </PUIButton>
              </div>
            </div>
          </template>
        </PUIStructure>

        <PUIDropdown
          v-if="visibleActions"
          :reference="actionButtons?.[visibleActions.id]?.$el"
          :restoreFocus="false"
          @click="visibleActions = null"
          @close="visibleActions = null"
          placement="end"
        >
          <PUIDropdownItem
            v-if="visibleActions.data !== currentBookmarkString"
            :title="__('pruvious-dashboard', 'Load configuration')"
            @click="
              () => {
                if (visibleActions) {
                  $emit('update:modelValue', JSON.parse(visibleActions.data))
                  puiToast(__('pruvious-dashboard', 'Loaded'), { type: 'success' })
                }
              }
            "
          >
            <Icon mode="svg" name="tabler:arrow-bar-to-down" />
            <span>{{ __('pruvious-dashboard', 'Load configuration') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="canUpdate && visibleActions.data !== currentBookmarkString"
            :title="__('pruvious-dashboard', 'Sync configuration')"
            @click="syncBookmark(visibleActions.id)"
          >
            <Icon mode="svg" name="tabler:device-floppy" />
            <span>{{ __('pruvious-dashboard', 'Sync configuration') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="canUpdate && !visibleActions.shared"
            :title="__('pruvious-dashboard', 'Share')"
            @click="updateBookmarkSharing(visibleActions.id, true)"
          >
            <Icon mode="svg" name="tabler:users-plus" />
            <span>{{ __('pruvious-dashboard', 'Share') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="canUpdate && visibleActions.shared"
            :title="__('pruvious-dashboard', 'Stop sharing')"
            @click="updateBookmarkSharing(visibleActions.id, false)"
          >
            <Icon mode="svg" name="tabler:users-minus" />
            <span>{{ __('pruvious-dashboard', 'Stop sharing') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="canUpdate"
            :title="__('pruvious-dashboard', 'Rename')"
            @click="
              () => {
                if (visibleActions) {
                  bookmarkName = visibleActions.name
                  bookmarkPopupState = visibleActions.id
                }
              }
            "
          >
            <Icon mode="svg" name="tabler:pencil" />
            <span>{{ __('pruvious-dashboard', 'Rename') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="canDelete"
            :title="__('pruvious-dashboard', 'Delete')"
            @click="deleteBookmark(visibleActions.id)"
            destructive
          >
            <Icon mode="svg" name="tabler:trash-x" />
            <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
          </PUIDropdownItem>
        </PUIDropdown>
      </div>

      <PUIButton
        v-if="canCreate"
        @click="
          () => {
            bookmarkName = ''
            bookmarkPopupState = 'new'
          }
        "
        variant="outline"
      >
        <Icon mode="svg" name="tabler:plus" />
        <span>{{ __('pruvious-dashboard', 'Bookmark') }}</span>
      </PUIButton>
    </PUIField>

    <PUIField v-if="sharedBookmarks.length">
      <PUIFieldLabel>
        <span class="pui-label pui-muted">{{ __('pruvious-dashboard', 'Shared bookmarks') }}</span>
      </PUIFieldLabel>

      <PUIStructure :modelValue="sharedBookmarks">
        <template #item="{ item }">
          <div class="pui-row">
            <span class="pui-row pui-mr-auto pui-truncate">{{ item.name }}</span>

            <PUIButton
              v-pui-tooltip="
                item.data === appliedBookmarkString
                  ? __('pruvious-dashboard', 'Currently applied')
                  : __('pruvious-dashboard', 'Apply')
              "
              :size="-3"
              :variant="item.data === appliedBookmarkString ? 'accent' : 'outline'"
              @click="
                () => {
                  $emit('update:modelValue', JSON.parse(item.data))
                  $emit('apply')
                }
              "
            >
              <Icon mode="svg" name="tabler:check" />
            </PUIButton>

            <PUIButton
              v-pui-tooltip="
                item.id === defaultBookmarkId
                  ? __('pruvious-dashboard', 'Currently default')
                  : __('pruvious-dashboard', 'Set as default')
              "
              :size="-3"
              :variant="item.id === defaultBookmarkId ? 'accent' : 'outline'"
              @click="setDefaultBookmark(item.id)"
            >
              <Icon mode="svg" name="tabler:star" />
            </PUIButton>

            <PUIButton
              v-if="item.data !== currentBookmarkString"
              v-pui-tooltip="__('pruvious-dashboard', 'Load configuration')"
              :size="-3"
              @click="
                () => {
                  $emit('update:modelValue', JSON.parse(item.data))
                  puiToast(__('pruvious-dashboard', 'Loaded'), { type: 'success' })
                }
              "
              variant="outline"
            >
              <Icon mode="svg" name="tabler:arrow-bar-to-down" />
            </PUIButton>
          </div>
        </template>
      </PUIStructure>
    </PUIField>

    <PUIPopup
      v-if="bookmarkPopupState"
      :size="-1"
      @close="$event().then(() => (bookmarkPopupState = false))"
      ref="bookmarkPopup"
      width="26rem"
    >
      <template #header>
        <div class="pui-row">
          <span v-if="bookmarkPopupState === 'new'">{{ __('pruvious-dashboard', 'New bookmark') }}</span>
          <span v-else>{{ __('pruvious-dashboard', 'Rename bookmark') }}</span>

          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="bookmarkPopup?.close().then(() => (bookmarkPopupState = false))"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <PUIField>
        <PUIFieldLabel required>
          <label v-if="bookmarkPopupState === 'new'" for="name">{{ __('pruvious-dashboard', 'Name') }}</label>
          <label v-else for="name">{{ __('pruvious-dashboard', 'New name') }}</label>
        </PUIFieldLabel>

        <PUIInput
          v-model="bookmarkName"
          :placeholder="__('pruvious-dashboard', 'e.g. Recently updated')"
          @keydown.enter="bookmarkPopupState === 'new' ? createBookmark() : renameBookmark(bookmarkPopupState)"
          autofocus
          id="name"
          name="name"
        />
      </PUIField>

      <div class="p-table-settings-bookmarks-popup-buttons pui-row">
        <PUIButton @click="bookmarkPopup?.close().then(() => (bookmarkPopupState = false))" variant="outline">
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>

        <PUIButton
          :disabled="!bookmarkName.trim()"
          @click="bookmarkPopupState === 'new' ? createBookmark() : renameBookmark(bookmarkPopupState)"
        >
          {{ __('pruvious-dashboard', bookmarkPopupState === 'new' ? 'Create' : 'Rename') }}
        </PUIButton>
      </div>
    </PUIPopup>
  </div>
</template>

<script lang="ts" setup>
import {
  __,
  hasPermission,
  pruviousDashboardPatch,
  pruviousDashboardPost,
  QueryBuilder,
  refreshAuthState,
  useAuth,
} from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import { puiToast } from '@pruvious/ui/pui/toast'
import { sortNaturallyByProp } from '@pruvious/utils'
import type { TableSettings } from './TableSettingsPopup.vue'

type Bookmark = Collections['Bookmarks']['TCastedTypes'] & { id: number }

const props = defineProps({
  /**
   * The current `TableSettings`.
   */
  modelValue: {
    type: Object as PropType<TableSettings>,
    required: true,
  },

  /**
   * The currently applied `TableSettings`.
   */
  appliedSettings: {
    type: Object as PropType<TableSettings>,
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
   * Indicates whether the default `TableSettings` are matching the current `modelValue`.
   */
  isDefault: {
    type: Boolean,
    required: true,
  },

  /**
   * Indicates whether the default `TableSettings` are currently applied.
   */
  isDefaultApplied: {
    type: Boolean,
    required: true,
  },
})

defineEmits<{
  'update:modelValue': [settings: TableSettings]
  'apply': []
  'restore': [apply: boolean]
}>()

const auth = useAuth()
const canCreate = hasPermission('collection:bookmarks:create')
const canUpdate = hasPermission('collection:bookmarks:update')
const canDelete = hasPermission('collection:bookmarks:delete')
const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const allBookmarks = sortNaturallyByProp(
  (await queryBuilder
    .selectFrom('Bookmarks')
    .where('collection', '=', props.collection.name)
    .all()
    .then((res) => res.data ?? [])) as Bookmark[],
  'name',
).map((bookmark) => ({ ...bookmark, $key: bookmark.id }))
const myBookmarks = ref(allBookmarks.filter((bookmark) => bookmark.user === auth.value.user?.id))
const sharedBookmarks = ref(allBookmarks.filter((bookmark) => bookmark.user !== auth.value.user?.id))
const defaultBookmarkId = computed(
  () => auth.value.user?.bookmarks.find(({ collection }) => collection === props.collection.name)?.id,
)
const currentBookmarkString = computed(() =>
  JSON.stringify({
    where: props.modelValue.where,
    columns: props.modelValue.columns,
    orderBy: props.modelValue.orderBy,
  }),
)
const appliedBookmarkString = computed(() =>
  JSON.stringify({
    where: props.appliedSettings.where,
    columns: props.appliedSettings.columns,
    orderBy: props.appliedSettings.orderBy,
  }),
)
const bookmarkPopupState = ref<'new' | number | false>(false)
const bookmarkPopup = useTemplateRef('bookmarkPopup')
const bookmarkName = ref('')
const actionButtons = ref<Record<number | string, any>>({})
const visibleActions = ref<Bookmark | null>(null)

async function createBookmark() {
  if (!bookmarkName.value.trim()) {
    return
  }

  const query = await queryBuilder
    .insertInto('Bookmarks')
    .values({
      name: bookmarkName.value,
      data: currentBookmarkString.value,
      collection: props.collection.name,
    })
    .returningAll()
    .run()

  if (query.success) {
    myBookmarks.value.push({ ...query.data[0], $key: query.data[0]!.id } as any)
    sortNaturallyByProp(myBookmarks.value, 'name')
    bookmarkPopupState.value = false
    puiToast(__('pruvious-dashboard', 'Created'), { type: 'success' })
  } else if (query.inputErrors) {
    puiToast(__('pruvious-dashboard', 'Error'), {
      type: 'error',
      description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
    })
  }
}

async function renameBookmark(id: number) {
  if (!bookmarkName.value.trim()) {
    return
  }

  const query = await queryBuilder
    .update('Bookmarks')
    .set({ name: bookmarkName.value } as any)
    .where('id', '=', id)
    .returningAll()
    .run()

  if (query.success) {
    const index = myBookmarks.value.findIndex((bookmark) => bookmark.id === id)
    myBookmarks.value.splice(index, 1, { ...query.data[0], $key: query.data[0]!.id } as any)
    sortNaturallyByProp(myBookmarks.value, 'name')
    bookmarkPopupState.value = false
    puiToast(__('pruvious-dashboard', 'Updated'), { type: 'success' })
  } else if (query.inputErrors) {
    puiToast(__('pruvious-dashboard', 'Error'), {
      type: 'error',
      description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
    })
  }
}

async function syncBookmark(id: number) {
  const query = await queryBuilder
    .update('Bookmarks')
    .set({ data: currentBookmarkString.value } as any)
    .where('id', '=', id)
    .returningAll()
    .run()

  if (query.success) {
    const index = myBookmarks.value.findIndex((bookmark) => bookmark.id === id)
    myBookmarks.value.splice(index, 1, { ...query.data[0], $key: query.data[0]!.id } as any)
    puiToast(__('pruvious-dashboard', 'Updated'), { type: 'success' })
    await refreshAuthState(true)
  } else if (query.inputErrors) {
    puiToast(__('pruvious-dashboard', 'Error'), {
      type: 'error',
      description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
    })
  }
}

async function updateBookmarkSharing(id: number, shared: boolean) {
  const query = await queryBuilder
    .update('Bookmarks')
    .set({ shared } as any)
    .where('id', '=', id)
    .returningAll()
    .run()

  if (query.success) {
    const index = myBookmarks.value.findIndex((bookmark) => bookmark.id === id)
    myBookmarks.value.splice(index, 1, { ...query.data[0], $key: query.data[0]!.id } as any)
    puiToast(__('pruvious-dashboard', 'Updated'), { type: 'success' })
  } else if (query.inputErrors) {
    puiToast(__('pruvious-dashboard', 'Error'), {
      type: 'error',
      description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
    })
  }
}

async function deleteBookmark(id: number) {
  const query = await queryBuilder.deleteFrom('Bookmarks').where('id', '=', id).run()

  if (query.success) {
    const index = myBookmarks.value.findIndex((bookmark) => bookmark.id === id)
    myBookmarks.value.splice(index, 1)
    puiToast(__('pruvious-dashboard', 'Deleted'), { type: 'success' })
    await refreshAuthState(true)
  }
}

async function setDefaultBookmark(id: number | null) {
  if (auth.value.isLoggedIn) {
    const ids = auth.value.user.bookmarks
      .filter(({ collection }) => collection !== props.collection.name)
      .map(({ id }) => id)

    if (id) {
      ids.push(id)
    }

    const response = await pruviousDashboardPatch('me', { body: { bookmarks: ids } })

    if (response.success) {
      puiToast(__('pruvious-dashboard', 'Updated'), { type: 'success' })
      await refreshAuthState(true)
    }
  }
}
</script>

<style scoped>
.p-table-settings-bookmarks :deep(.pui-field > * + *) {
  margin-top: 0.75rem;
}

.p-table-settings-bookmarks :deep(.pui-field:first-child) {
  margin-top: 1rem;
}

.p-table-settings-bookmarks :deep(.pui-field:not([hidden]) ~ .pui-field:not([hidden])) {
  margin-top: 1.5rem;
}

.p-table-settings-bookmarks :deep(.pui-structure-items) {
  gap: 0;
}

.p-table-settings-bookmarks :deep(.pui-structure-item:not(:first-child)) {
  margin-top: -1px;
  border-top-right-radius: 0;
  border-top-left-radius: 0;
}

.p-table-settings-bookmarks :deep(.pui-structure-item:not(:last-child)) {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.p-table-settings-bookmarks-popup-buttons {
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
