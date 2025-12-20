<template>
  <div class="p-media-directory-item" :class="{ 'p-media-directory-item-highlighted': isMoving && highlighted }">
    <NuxtLink
      :to="dashboardBasePath + 'media' + upload.path"
      @dragenter.prevent="highlighted = true"
      @dragleave="highlighted = false"
      @dragover.prevent
      @drop.prevent="onMoveDrop()"
      class="p-media-directory-item-button pui-raw"
    >
      <Icon mode="svg" name="tabler:folder-open" class="p-media-directory-item-icon" />
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import {
  $pfetchDashboard,
  __,
  dashboardBasePath,
  selectFrom,
  usePruviousDashboardIsMoving,
  type DashboardMediaLibraryState,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/client'
import type { MoveUploadResult } from '#pruvious/server'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiToast } from '@pruvious/ui/pui/toast'
import { basename, join } from 'pathe'

const props = defineProps({
  upload: {
    type: Object as PropType<UploadItem>,
    required: true,
  },
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  resolvedPermissions: {
    type: Object as PropType<ResolvedCollectionRecordPermissions>,
  },
})

const runtimeConfig = useRuntimeConfig()
const isMoving = usePruviousDashboardIsMoving()
const highlighted = ref(false)

async function onMoveDrop() {
  highlighted.value = false

  if (!isMoving.value) {
    return
  }

  if (!props.state.selectedUploads.some(({ id }) => id === props.upload.id)) {
    for (let i = 0; i < props.state.selectedUploads.length; i += 50) {
      const pathsToCheck = props.state.selectedUploads
        .slice(i, i + 50)
        .map(({ path }) => {
          const newPath = join(props.upload.path, basename(path))
          return newPath === path ? '' : newPath
        })
        .filter(Boolean)

      if (!pathsToCheck.length) {
        continue
      }

      const existsQuery = await selectFrom('Uploads').select('id').where('path', 'in', pathsToCheck).first()

      if (existsQuery.data) {
        const action = await puiDialog({
          content: __(
            'pruvious-dashboard',
            'Some uploads already exist in the target directory. Do you want to overwrite them?',
          ),
          actions: [
            { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
            { name: 'move', label: __('pruvious-dashboard', 'OK'), variant: 'primary' },
          ],
        })

        if (action === 'move') {
          break
        } else {
          return
        }
      }
    }

    let count = 0
    let type: 'files' | 'directories' | 'mixed' | 'none' = 'none'

    const pathsToMove = props.state.selectedUploads.map(({ path }) => path).sort((a, b) => b.length - a.length)

    for (let i = 0; i < pathsToMove.length; i += 50) {
      const queries: Promise<any>[] = []
      const batch = pathsToMove.slice(i, i + 50)

      for (const path of batch) {
        queries.push(
          $pfetchDashboard(runtimeConfig.public.pruvious.apiBasePath + 'uploads/move/path' + path, {
            method: 'patch',
            body: {
              path: join(props.upload.path, basename(path)),
            },
            query: { overwrite: true },
          })
            .then((results) => {
              const moved = (results as MoveUploadResult<any, false>[]).filter(({ success }) => success)
              const movedFiles = moved.filter(({ details }) => details.type === 'file').length
              const movedDirectories = moved.filter(({ details }) => details.type === 'directory').length
              const movedType =
                movedFiles > 0 && movedDirectories > 0
                  ? 'mixed'
                  : movedDirectories > 0
                    ? 'directories'
                    : movedFiles > 0
                      ? 'files'
                      : 'none'
              count += moved.length
              if (type === 'none') {
                type = movedType
              } else if (type !== movedType && movedType !== 'none') {
                type = 'mixed'
              }
            })
            .catch(() => null),
        )
      }

      await Promise.all(queries)
    }

    if (count) {
      window.dispatchEvent(new CustomEvent('pruvious:move-upload-complete'))
      puiToast(__('pruvious-dashboard', 'Moved $count $uploads', { count, type }), {
        type: 'success',
      })
    } else {
      puiToast(__('pruvious-dashboard', 'No uploads were moved'))
    }
  }
}
</script>

<style scoped>
.p-media-directory-item {
  aspect-ratio: 1;
}

.p-media-directory-item-button {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-border));
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, border-color, color;
}

.p-media-directory-item-icon {
  pointer-events: none;
  font-size: 1.75rem;
}

.p-media-directory-item-icon :deep([stroke]) {
  stroke-width: 1;
}
</style>

<style>
.p-media-item-selected .p-media-directory-item-button,
.p-media-item-box:hover .p-media-directory-item-button,
.p-media-item-box:focus-within .p-media-directory-item-button,
.p-media-directory-item-highlighted .p-media-directory-item-button {
  background-color: hsl(var(--pui-card));
  color: hsl(var(--pui-card-foreground));
}

.p-media-item-selected .p-media-directory-item-button {
  border-color: hsl(var(--pui-accent));
}
</style>
