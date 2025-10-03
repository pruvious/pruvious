<template>
  <div>
    <Transition name="fade">
      <div
        v-if="isDragging"
        @click="input?.click()"
        @dragleave.prevent="
          () => {
            if (isReady) {
              isDragging = false
            }
          }
        "
        @dragover.prevent
        @drop.prevent="handleDrop"
        @mouseleave="isDragging = false"
        class="p-drop-uploader pui-allow-interaction"
      >
        <div class="p-drop-uploader-content">
          <Icon mode="svg" name="tabler:upload" />
          <p>{{ __('pruvious-dashboard', 'Drop files anywhere to upload') }}</p>
        </div>
      </div>
    </Transition>

    <input @change="uploadFromInput()" multiple name="p-drop-uploader-input" ref="input" type="file" />
  </div>
</template>

<script lang="ts" setup>
import { __, useUpload } from '#pruvious/client'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { useEventListener } from '@vueuse/core'
import { onMounted, ref } from 'vue'

interface FileWithRelativePath extends File {
  readonly webkitRelativePath: string
}

interface UploadPayload {
  file: File
  directory: string
}

const input = useTemplateRef('input')
const isDragging = ref(false)
const isReady = ref(false)
const overlayCounter = usePUIOverlayCounter()

let transitionTimeout: NodeJS.Timeout | undefined

watch(isDragging, (value) => {
  clearTimeout(transitionTimeout)
  if (value) {
    overlayCounter.value++
    document.body.classList.add('pui-overlay-active')
    const potd = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
    const transitionDuration = potd.endsWith('ms') ? parseInt(potd) : potd.endsWith('s') ? parseFloat(potd) * 1000 : 300
    transitionTimeout = setTimeout(() => {
      isReady.value = true
    }, transitionDuration)
  } else if (--overlayCounter.value === 0) {
    document.body.classList.remove('pui-overlay-active')
    isReady.value = false
  }
})

onMounted(() => {
  useEventListener('dragenter', handleDragEnter)
  useEventListener('dragover', (e) => e.preventDefault())
  useEventListener('drop', (e) => e.preventDefault())
  useEventListener('blur', () => (isDragging.value = false))
})

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  const items = event.dataTransfer?.items

  if (!items) {
    return
  }

  const uploadPayloads: UploadPayload[] = []
  const queue: FileSystemEntry[] = []

  for (const item of items) {
    const entry = item.webkitGetAsEntry()
    if (entry) {
      queue.push(entry)
    }
  }

  while (queue.length > 0) {
    const entry = queue.shift()
    if (entry?.isFile) {
      const file = (await getFile(entry as FileSystemFileEntry)) as FileWithRelativePath
      const fullPath = entry.fullPath
      const lastSlashIndex = fullPath.lastIndexOf('/')
      let directory = ''

      if (lastSlashIndex > 0) {
        directory = fullPath.substring(1, lastSlashIndex)
      }

      uploadPayloads.push({ file, directory })
    } else if (entry?.isDirectory) {
      const subEntries = await readAllDirectoryEntries((entry as FileSystemDirectoryEntry).createReader())
      queue.push(...subEntries)
    }
  }

  if (uploadPayloads.length > 0) {
    return useUpload(uploadPayloads)
  }
}

function getFile(fileEntry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => resolve(file),
      (err) => reject(err),
    )
  })
}

async function readAllDirectoryEntries(directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = []
  let readEntries = await readEntriesPromise(directoryReader)
  while (readEntries.length > 0) {
    entries.push(...readEntries)
    readEntries = await readEntriesPromise(directoryReader)
  }
  return entries
}

function readEntriesPromise(directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    directoryReader.readEntries(
      (entries) => resolve(entries),
      (err) => reject(err),
    )
  })
}

async function uploadFromInput() {
  if (input.value?.files) {
    return useUpload([...input.value.files])
  }
}
</script>

<style scoped>
.p-drop-uploader {
  position: fixed;
  z-index: 100000;
  top: 0;
  left: 0;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: hsl(var(--pui-background) / 0.9);
}

.p-drop-uploader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: hsl(var(--pui-foreground));
  text-align: center;
  pointer-events: none;
}

.p-drop-uploader-content svg {
  font-size: 4rem;
}

.p-drop-uploader-content p {
  font-size: 1.5rem;
  margin-top: 1rem;
  font-weight: 500;
}

input {
  display: none;
}

.fade-enter-active,
.fade-leave-active {
  transition-property: opacity;
  transition-duration: var(--pui-overlay-transition-duration);
  transition-timing-function: var(--pui-transition);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .p-drop-uploader-content svg {
    font-size: 3rem;
  }

  .p-drop-uploader-content p {
    font-size: 1.125rem;
  }
}
</style>
