<template>
  <div class="pui-row pui-medium">
    <span
      v-if="!breadcrumbs.length"
      :href="dashboardBasePath + 'media' + queryString"
      @dragenter.prevent="highlighted = '/'"
      @dragleave="highlighted = null"
      @dragover.prevent
      @drop.prevent="onMoveDrop('/')"
      class="p-media-breadcrumb p-media-breadcrumb-active pui-shrink-0"
      :class="{ 'p-media-breadcrumb-highlighted': isMoving && highlighted === '/' }"
    >
      {{ __('pruvious-dashboard', 'Media') }}
    </span>
    <component
      v-else="!breadcrumbs.length"
      :href="dashboardBasePath + 'media' + queryString"
      :is="linkHandler ? 'a' : NuxtLink"
      :target="linkHandler ? '_blank' : undefined"
      @click="
        (event: MouseEvent) => {
          if (linkHandler && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            event.preventDefault()
            linkHandler('/')
          }
        }
      "
      @dragenter.prevent="highlighted = '/'"
      @dragleave="highlighted = null"
      @dragover.prevent
      @drop.prevent="onMoveDrop('/')"
      class="p-media-breadcrumb pui-shrink-0"
      :class="{ 'p-media-breadcrumb-highlighted': isMoving && highlighted === '/' }"
    >
      {{ __('pruvious-dashboard', 'Media') }}
    </component>
    <template v-for="(breadcrumb, index) in breadcrumbs" :key="index">
      <span class="p-media-breadcrumb-separator pui-shrink-0">/</span>
      <span
        v-if="index === breadcrumbs.length - 1"
        :title="breadcrumb"
        @dragenter.prevent="highlighted = breadcrumb"
        @dragleave="highlighted = null"
        @dragover.prevent
        @drop.prevent="onMoveDrop(breadcrumb)"
        class="p-media-breadcrumb p-media-breadcrumb-active pui-shrink-0"
        :class="{ 'p-media-breadcrumb-highlighted': isMoving && highlighted === breadcrumb }"
      >
        {{ breadcrumb }}
      </span>
      <component
        v-else
        :href="dashboardBasePath + 'media/' + breadcrumbs.slice(0, index + 1).join('/') + queryString"
        :is="linkHandler ? 'a' : NuxtLink"
        :target="linkHandler ? '_blank' : undefined"
        :title="breadcrumb"
        @click="
          (event: MouseEvent) => {
            if (linkHandler && !event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              linkHandler('/' + breadcrumbs.slice(0, index + 1).join('/'))
            }
          }
        "
        @dragenter.prevent="highlighted = breadcrumb"
        @dragleave="highlighted = null"
        @dragover.prevent
        @drop.prevent="onMoveDrop(breadcrumb)"
        class="p-media-breadcrumb"
        :class="{ 'p-media-breadcrumb-highlighted': isMoving && highlighted === breadcrumb }"
      >
        <span class="pui-truncate">{{ breadcrumb }}</span>
      </component>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { NuxtLink } from '#components'
import { __ } from '#pruvious/app'
import {
  $pfetchDashboard,
  dashboardBasePath,
  selectFrom,
  useIsMoving,
  type DashboardMediaLibraryState,
} from '#pruvious/dashboard'
import type { MoveUploadResult } from '#pruvious/server'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isStringInteger } from '@pruvious/utils'
import { basename, join } from 'pathe'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  linkHandler: {
    type: Function as PropType<(path: string) => any>,
  },
})

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const isMoving = useIsMoving()
const highlighted = ref<string | null>(null)
const breadcrumbs = computed(() =>
  props.state.currentDirectory === '/' ? [] : props.state.currentDirectory.split('/').filter(Boolean),
)
const queryString = computed(() => {
  const params = { ...route.query }
  const page = isStringInteger(params.page) ? +params.page : 1
  if (page > 1) {
    delete params.page
  }
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  return qs ? `?${qs}` : ''
})

async function onMoveDrop(targetDirectory: string) {
  highlighted.value = null

  if (!isMoving.value) {
    return
  }

  if (!props.state.selectedUploads.some(({ path }) => path === targetDirectory)) {
    for (let i = 0; i < props.state.selectedUploads.length; i += 50) {
      const pathsToCheck = props.state.selectedUploads
        .slice(i, i + 50)
        .map(({ path }) => {
          const newPath = join(targetDirectory, basename(path))
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
              path: join(targetDirectory, basename(path)),
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
.p-media-breadcrumb {
  position: relative;
  display: flex;
  width: auto;
  text-decoration: none;
}

.p-media-breadcrumb:not(.p-media-breadcrumb-active),
.p-media-breadcrumb-separator {
  color: hsl(var(--pui-muted-foreground));
}

.p-media-breadcrumb:not(.p-media-breadcrumb-active):hover,
.p-media-breadcrumb:not(.p-media-breadcrumb-active):focus {
  color: hsl(var(--pui-foreground));
}

.p-media-breadcrumb::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: -0.125rem;
  right: -0.375rem;
  bottom: -0.125rem;
  left: -0.375rem;
  background-color: hsl(var(--pui-accent));
  border-radius: var(--pui-radius);
  opacity: 0;
  visibility: hidden;
  transition: var(--pui-transition);
  transition-property: opacity, visibility;
}

.p-media-breadcrumb * {
  pointer-events: none;
}

.p-media-breadcrumb-highlighted {
  color: hsl(var(--pui-accent-foreground)) !important;
}

.p-media-breadcrumb-highlighted::before {
  opacity: 1;
  visibility: visible;
}
</style>
