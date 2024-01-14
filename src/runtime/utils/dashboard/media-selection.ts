import { ref, type Ref } from '#imports'
import type { MediaData, MediaUpload } from '../../composables/dashboard/media'
import { __ } from '../../composables/translatable-strings'
import { sortNatural, sortNaturalByProp } from '../array'

export class MediaSelection {
  directories: Ref<Record<string, true>> = ref({})

  uploads: Ref<Record<number, MediaUpload>> = ref({})

  origin: Ref<{ type: 'directory'; directory: string } | { type: 'upload'; uploadId: number } | null> = ref(null)

  count: Ref<number> = ref(0)

  type: Ref<{ singular: string; plural: string }> = ref({ singular: '', plural: '' })

  currentType: Ref<string> = ref('')

  constructor(private data: MediaData = { directories: [], uploads: [] }) {}

  setData(data: MediaData) {
    this.data = data

    for (const directory of Object.keys(this.directories.value)) {
      if (!data.directories.some(({ path }) => path === directory)) {
        delete this.directories.value[directory]
      }
    }

    for (const { id } of Object.values(this.uploads.value)) {
      if (!data.uploads.find((upload) => upload.id === id)) {
        delete this.uploads.value[id]
      }
    }

    this.refresh()
  }

  selectDirectory(directory: string, event?: MouseEvent) {
    if (event?.shiftKey && this.origin.value) {
      event.preventDefault()
      this.deselectAll()

      if (this.origin.value.type === 'directory') {
        let state: number = 0 // 0 - initial, 1 - start, 2 - end

        for (const { path } of this.data.directories) {
          if (path === directory) {
            state++
          }

          if (path === this.origin.value.directory) {
            state++
          }

          if (state) {
            this.directories.value[path] = true
          }

          if (state === 2) {
            break
          }
        }
      } else if (this.origin.value.type === 'upload') {
        let state: number = 0 // 0 - initial, 1 - start

        for (const { path } of this.data.directories) {
          if (path === directory) {
            state++
          }

          if (state) {
            this.directories.value[path] = true
          }
        }

        for (const upload of this.data.uploads) {
          this.uploads.value[upload.id] = upload

          if (upload.id === this.origin.value.uploadId) {
            break
          }
        }
      }
    } else {
      this.directories.value[directory] = true
    }

    this.refresh()
  }

  selectUpload(upload: MediaUpload, event?: MouseEvent) {
    if (event?.shiftKey && this.origin.value) {
      event.preventDefault()
      this.deselectAll()

      if (this.origin.value.type === 'directory') {
        let state: number = 0 // 0 - initial, 1 - start

        for (const { path } of this.data.directories) {
          if (path === this.origin.value.directory) {
            state++
          }

          if (state) {
            this.directories.value[path] = true
          }
        }

        for (const _upload of this.data.uploads) {
          this.uploads.value[_upload.id] = _upload

          if (_upload.id === upload.id) {
            break
          }
        }
      } else if (this.origin.value.type === 'upload') {
        let state: number = 0 // 0 - initial, 1 - start, 2 - end

        for (const _upload of this.data.uploads) {
          if (_upload.id === upload.id) {
            state++
          }

          if (_upload.id === this.origin.value.uploadId) {
            state++
          }

          if (state) {
            this.uploads.value[_upload.id!] = _upload
          }

          if (state === 2) {
            break
          }
        }
      }
    } else {
      this.uploads.value[upload.id] = upload
    }

    this.refresh()
  }

  deselectDirectory(directory: string, event?: MouseEvent) {
    if (event?.shiftKey && this.origin.value) {
      this.selectDirectory(directory, event)
    } else {
      delete this.directories.value[directory]
    }

    this.refresh()
  }

  deselectUpload(upload: MediaUpload, event?: MouseEvent) {
    if (event?.shiftKey && this.origin.value) {
      this.selectUpload(upload, event)
    } else {
      delete this.uploads.value[upload.id]
    }

    this.refresh()
  }

  deselectAll() {
    this.directories.value = {}
    this.uploads.value = {}
    this.count.value = 0
    this.type.value = { singular: '', plural: '' }
    this.currentType.value = ''
  }

  clone() {
    const selection = new MediaSelection(this.data)

    selection.count.value = this.count.value
    selection.currentType.value = this.currentType.value
    selection.directories.value = { ...this.directories.value }
    selection.origin.value = this.origin.value
    selection.type.value = { ...this.type.value }
    selection.uploads.value = { ...this.uploads.value }

    return selection
  }

  private refresh() {
    const directoriesCount = Object.keys(this.directories.value).length
    const uploadsCount = Object.keys(this.uploads.value).length

    this.count.value = directoriesCount + uploadsCount

    if (
      !this.origin.value ||
      (this.origin.value.type === 'directory' && !this.directories.value[this.origin.value.directory]) ||
      (this.origin.value.type === 'upload' && !this.uploads.value[this.origin.value.uploadId])
    ) {
      this.origin.value = directoriesCount
        ? { type: 'directory', directory: sortNatural(Object.keys(this.directories.value))[0] }
        : uploadsCount
        ? { type: 'upload', uploadId: sortNaturalByProp(Object.values(this.uploads.value), 'filename')[0].id }
        : null
    }

    this.type.value = {
      singular:
        directoriesCount && uploadsCount
          ? __('pruvious-dashboard', 'item')
          : directoriesCount
          ? __('pruvious-dashboard', 'folder')
          : __('pruvious-dashboard', 'file'),
      plural:
        directoriesCount && uploadsCount
          ? __('pruvious-dashboard', 'items')
          : directoriesCount
          ? __('pruvious-dashboard', 'folders')
          : __('pruvious-dashboard', 'files'),
    }

    this.currentType.value = directoriesCount + uploadsCount === 1 ? this.type.value.singular : this.type.value.plural
  }
}
