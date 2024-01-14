import { useState, type Ref } from '#imports'
import type { CastedFieldType, CreateInput } from '#pruvious'
import { toArray } from '../../utils/array'
import {
  addMediaDirectories,
  moveMediaDirectory,
  type MediaDirectoryTreeItem,
} from '../../utils/dashboard/media-directory'
import { MediaSelection } from '../../utils/dashboard/media-selection'
import { pruviousFetch, type PruviousFetchResponse } from '../../utils/fetch'
import { isObject } from '../../utils/object'
import { __ } from '../translatable-strings'
import { pruviousToasterShow } from './toaster'

export interface MediaData {
  directories: MediaDirectory[]
  uploads: MediaUpload[]
}

export interface MediaDirectory {
  name: string
  path: string
}

export interface MediaMoveTargetDirectory extends MediaDirectory {
  children: MediaMoveTargetDirectory[]
  disabled: boolean
}

export interface MediaLibraryPopupOptions {
  allowedTypes?: string[] | Record<string, true>
  directory?: string
  minHeight?: number
  minWidth?: number
  pickCallback?: PickCallback
}

export type MediaUpload = CastedFieldType['uploads'] & { extension: string; isImage: boolean }

export type PickCallback = (upload: CastedFieldType['uploads']) => any | Promise<any>

/**
 * The upload dialog (`<input type="file">`) observable.
 */
export const useUploadDialog: () => Ref<{ accept: string | undefined; directory: string }> = () =>
  useState('pruvious-upload-dialog', () => ({
    accept: undefined,
    directory: '',
  }))

/**
 * The media library popup observable.
 */
export const useMediaLibraryPopup: () => Ref<MediaLibraryPopupOptions | null> = () =>
  useState('pruvious-media-library-popup', () => null)

/**
 * The edit media upload popup observable.
 */
export const useMediaUploadPopup: () => Ref<{ upload: CastedFieldType['uploads'] } | null> = () =>
  useState('pruvious-media-upload-popup', () => null)

/**
 * The create/rename media directory popup observable.
 */
export const useMediaDirectoryPopup: () => Ref<
  { action: 'create'; parentDirectory: string } | { action: 'rename'; directory: string } | null
> = () => useState('pruvious-media-directory-popup', () => null)

/**
 * Counter for media clear events.
 */
export const useMediaClear: () => Ref<number> = () => useState('pruvious-media-clear', () => 0)

/**
 * Counter for media update events.
 */
export const useMediaUpdated: () => Ref<number> = () => useState('pruvious-media-updated', () => 0)

/**
 * The last opened media directory.
 */
export const useLastMediaDirectory: () => Ref<string> = () => useState('pruvious-last-media-directory', () => '')

/**
 * The media directory tree.
 */
export const useMediaDirectories: () => Ref<MediaDirectoryTreeItem> = () =>
  useState('previous-media-directories', () => ({}))

/**
 * Open the upload dialog (`<input type="file">`) from any component within the base layout.
 * Allowed file types can be specified as an array of file extensions (e.g., `['jpg', 'png']`).
 * If no file types are specified, all files are allowed.
 */
export function openUploadDialog(directory: string, accept?: string[]) {
  useUploadDialog().value = {
    accept: accept
      ?.map((type) => (!type.includes('/') && !type.startsWith('.') ? `.${type}` : type))
      .join(',')
      .toLowerCase(),
    directory,
  }
}

/**
 * Open the media library popup from any component within the base layout and pick a file.
 *
 * Options:
 * - `pickCallback` - A callback function will be called with the picked file as the first argument.
 * - `allowedTypes` - Allowed media types can be specified as file extensions or mime types (e.g., `['image/jpeg', 'png']`).
 * - `minWidth` - The minimum allowed image width in pixels.
 * - `minHeight` - The minimum allowed image height in pixels.
 */
export function openMediaLibraryPopup(options: MediaLibraryPopupOptions = {}) {
  useMediaLibraryPopup().value = options
}

/**
 * Close the media library popup from any component within the base layout.
 */
export function closeMediaLibraryPopup() {
  useMediaLibraryPopup().value = null
}

/**
 * Open the edit media upload popup from any component within the base layout.
 */
export function editMediaUpload(upload: CastedFieldType['uploads']) {
  useMediaUploadPopup().value = { upload }
}

/**
 * Open the create media directory popup from any component within the base layout.
 */
export function createMediaDirectory(parentDirectory: string) {
  useMediaDirectoryPopup().value = { action: 'create', parentDirectory: parentDirectory }
}

/**
 * Open the rename media directory popup from any component within the base layout.
 */
export function renameMediaDirectory(directory: string) {
  useMediaDirectoryPopup().value = { action: 'rename', directory }
}

/**
 * Upload one or more files to the server.
 */
export async function upload(input: CreateInput['uploads'] | CreateInput['uploads'][]): Promise<number> {
  const entries = toArray(input)
  const promises: Promise<PruviousFetchResponse<CastedFieldType['uploads']>>[] = []

  for (const entry of entries) {
    const formData = new FormData()

    for (const [key, value] of Object.entries(entry)) {
      if (key === '$file') {
        formData.append(key, value as File)
      } else {
        formData.append(key, String(value))
      }
    }

    promises.push(pruviousFetch<CastedFieldType['uploads']>('collections/uploads', { method: 'post', body: formData }))
  }

  const responses = await Promise.all(promises)

  let uploaded = 0

  for (const [i, response] of responses.entries()) {
    if (response.success) {
      uploaded++
    } else if (isObject(response.error)) {
      pruviousToasterShow({
        message: `**${entries[i].filename ?? entries[i].$file.name}:** ` + Object.values(response.error).join('<br>'),
        type: 'error',
      })
    }
  }

  return uploaded
}

/**
 * Move a media selection to a new directory.
 */
export async function moveSelection(selection: MediaSelection, to: string): Promise<boolean> {
  if (!selection.count) {
    return false
  }

  let from =
    (Object.keys(selection.directories.value)[0] ?? Object.values(selection.uploads.value)[0]?.directory)
      .slice(0, -1)
      .split('/')
      .slice(0, -1)
      .join('/') + '/'
  from = from === '/' ? '' : from

  const mediaDirectories = useMediaDirectories()
  const promises: {
    promise: Promise<PruviousFetchResponse<{ records: CastedFieldType['uploads'][] }>>
    upload: CastedFieldType['uploads']
  }[] = []

  for (const upload of Object.values(selection.uploads.value)) {
    promises.push({
      promise: pruviousFetch(`collections/uploads/${upload.id}`, {
        method: 'patch',
        body: { directory: to, filename: upload.filename },
      }),
      upload,
    })
  }

  for (const directory of Object.keys(selection.directories.value)) {
    const response = await pruviousFetch<{ records: CastedFieldType['uploads'][] }>('collections/uploads', {
      query: { where: `some:[directory[=][${directory}],directory[like][${directory}%]]` },
    })

    if (response.success) {
      moveMediaDirectory(directory, to, mediaDirectories.value)

      for (const upload of response.data.records) {
        promises.push({
          promise: pruviousFetch<{ records: CastedFieldType['uploads'][] }>(`collections/uploads/${upload.id}`, {
            method: 'patch',
            body: { directory: upload.directory.replace(from, to), filename: upload.filename },
          }),
          upload,
        })
      }
    } else {
      selection.deselectDirectory(directory)
    }
  }

  const responses = await Promise.all(promises.map(({ promise }) => promise))

  for (const [i, response] of responses.entries()) {
    if (!response.success) {
      if (isObject(response.error) && response.error.filename) {
        setTimeout(() => {
          pruviousToasterShow({
            message: __(
              'pruvious-dashboard',
              'A file with the name !!$name!! already exists in the destination folder',
              { name: promises[i].upload.filename },
            ),
            type: 'error',
          })
        })
      }

      selection.deselectUpload(promises[i].upload as any)
    }
  }

  if (selection.count.value) {
    pruviousToasterShow({
      message: __('pruvious-dashboard', 'Moved $count $items', {
        count: selection.count.value,
        items: selection.currentType.value,
      }),
    })
    selection.deselectAll()
    useMediaUpdated().value++
    return true
  }

  return false
}

export async function fetchDirectories() {
  const response = await pruviousFetch<{ records: { directory: string }[] }>('collections/uploads', {
    query: { select: 'directory', order: 'directory', group: 'directory' },
  })

  if (response.success) {
    for (const { directory } of response.data.records) {
      addMediaDirectories(directory, useMediaDirectories().value)
    }
  }
}
