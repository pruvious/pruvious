import { __ } from '#pruvious/client/i18n'
import type {
  Collections,
  DeleteUploadOptions,
  MoveUploadOptions,
  PutUploadOptions,
  PutUploadResult,
  UpdateUploadOptions,
} from '#pruvious/server'
import type { InsertInput, UpdateInput } from '@pruvious/orm'
import { tryNormalizePath } from '@pruvious/storage'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import {
  clamp,
  isArray,
  isDefined,
  isNotNull,
  isNumber,
  isObject,
  isPositiveInteger,
  isPrimitive,
  isString,
  nanoid,
  omit,
  pick,
  promiseAllInBatches,
  remove,
  toArray,
} from '@pruvious/utils'
import { parse } from 'bytes'
import {
  usePruviousDashboardUploadNotifications,
  type DashboardUploadNotification,
} from '../../../app/utils/pruvious/dashboard/upload-notifications'
import { $pfetchDashboard } from '../api/dashboard-utils.client'
import { $pfetch } from '../api/utils.client'
import { selectFrom } from '../client-query-builder/utils.client'

export interface PruviousFile
  extends Omit<
    InsertInput<Collections['Uploads']>,
    'path' | 'type' | 'etag' | 'images' | 'isLocked' | 'multipart' | 'size'
  > {
  /**
   * The file to be uploaded.
   */
  file: File

  /**
   * The full path where the file should be uploaded, including directories.
   * If specified, this takes precedence over the `directory` option.
   */
  path?: string

  /**
   * The directory where the file should be uploaded.
   * This will be combined with the file's name to create the full path.
   * Ignored if `path` is provided.
   */
  directory?: string

  /**
   * The ID of the user who is uploading the file.
   * If not specified, the current user's ID will be used.
   */
  author?: number

  /**
   * The IDs of the users who are allowed to edit the upload.
   * If not specified, only the author will have edit access.
   */
  editors?: number[]
}

interface StandardUploadOptions {
  /**
   * The threshold for initiating a multipart upload.
   * When a file's size exceeds this value, it will be automatically split into chunks and uploaded sequentially.
   * This is particularly useful for large files, as it allows for resumable uploads and better error handling.
   *
   * You can provide this value as a string (e.g., '32 MB') or as an integer representing the byte count.
   * String-based sizes are parsed using the [`bytes`](https://www.npmjs.com/package/bytes) npm package.
   *
   * To disable multipart uploads entirely, set this option to `false` or `0`.
   *
   * @default '8 MB'
   */
  multipartThreshold?: string | number | false
}

export interface UseUploadResult<
  TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  TPopulateFields extends boolean = false,
> {
  /**
   * The `PruviousFile` being uploaded.
   */
  file: PruviousFile

  /**
   * The current status of the upload.
   */
  status: Ref<'pending' | 'uploading' | 'completed' | 'failed' | 'aborted'>

  /**
   * The result of the upload as a reactive reference.
   * This will be `undefined` until the upload is complete.
   */
  result: Ref<PutUploadResult<TReturningFields, TPopulateFields> | undefined>

  /**
   * The current upload progress as a reactive reference.
   *
   * - Value ranges from 0 to 1 (0% to 100%).
   * - Updates automatically during upload.
   */
  progress: Ref<number>

  /**
   * Aborts the upload.
   */
  abort: () => void
}

const useConcurrentUploads = () => useState<string[]>('pruvious-concurrent-uploads', () => [])

/**
 * A reactive reference to the current upload speed in bytes per second.
 */
export const useUploadSpeed = () => useState<number | null>('pruvious-upload-speed', () => null)

/**
 * Uploads one or more files to the server's media library.
 *
 * This function handles both single-request uploads for smaller files and robust, resumable multipart uploads for larger files.
 * The multipart upload is triggered automatically when a file's size exceeds the `options.multipartThreshold`.
 *
 * It returns a `Promise` that resolves with the upload result.
 * If a single file was provided, it returns a single result object; if an array of files was provided, it returns an array of result objects.
 *
 * @example
 * ```vue
 * <template>
 *   <input v-on:change="onChange()" multiple ref="input" type="file" />
 * </template>
 *
 * <script lang="ts" setup>
 * import { upload } from '#pruvious/client'
 *
 * const input = useTemplateRef('input')
 *
 * async function onChange() {
 *   if (input.value?.files && input.value.files.length > 0) {
 *     const results = await upload([...input.value.files], { returning: ['id', 'path'] })
 *
 *     for (const result of results) {
 *       if (result.success) {
 *         console.log(`File uploaded: ID=${result.data.id}, Path=${result.data.path}`)
 *       }
 *     }
 *   }
 * }
 * </script>
 * ```
 */
export async function upload<
  TFile extends File | File[] | PruviousFile | PruviousFile[],
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  file: TFile,
  options?: Omit<PutUploadOptions<TReturningFields, TPopulateFields>, 'guarded'> & StandardUploadOptions,
): Promise<
  TFile extends any[]
    ? PutUploadResult<TReturningFields, TPopulateFields>[]
    : PutUploadResult<TReturningFields, TPopulateFields>
> {
  const runtimeConfig = useRuntimeConfig()
  const apiBasePath = runtimeConfig.public.pruvious.apiBasePath
  const multipartThreshold = options?.multipartThreshold ?? '8 MB'
  const multipartThresholdBytes = isString(multipartThreshold) ? parse(multipartThreshold) : multipartThreshold
  const pruviousFiles: PruviousFile[] = []
  const fileItems = toArray<File | PruviousFile>(file)
  const _ = (options as any)?._ ?? {}
  const concurrentUploads = useConcurrentUploads()
  const uploadSpeed = useUploadSpeed()
  const notifications = usePruviousDashboardUploadNotifications()
  const newNotifications: DashboardUploadNotification[] = []
  const abortControllers = fileItems.map((_item, i) => _.abortController?.[i] ?? new AbortController())

  for (const [i, item] of fileItems.entries()) {
    const id = nanoid()
    const abortController = abortControllers[i]
    const abort = () => abortController.abort('<abort>')

    pruviousFiles.push((item instanceof File ? { file: item, id } : { ...item, id }) as PruviousFile)
    newNotifications.push({
      id,
      fileName: item instanceof File ? item.name : item.file.name,
      directory: (item instanceof File ? '' : (item.directory ?? '')).split('/').filter(Boolean).join('/') || '/',
      size: item instanceof File ? item.size : item.file.size,
      status: 'pending',
      progress: 0,
      abort,
    })
  }

  notifications.value.unshift(...newNotifications)

  return promiseAllInBatches(
    pruviousFiles.map((item, i) => {
      const notification = notifications.value.find(({ id }) => id === (item as any).id)
      const signal = abortControllers[i].signal

      if (
        isNumber(multipartThresholdBytes) &&
        multipartThresholdBytes > 0 &&
        item.file.size > multipartThresholdBytes
      ) {
        return () =>
          new Promise<PutUploadResult<TReturningFields, TPopulateFields>>(async (resolve) => {
            const multipartUpload = (await $pfetchDashboard(apiBasePath + 'uploads/multipart', {
              method: 'post',
              body: {
                ...omit(item, ['file', 'directory']),
                path: item.path ?? tryNormalizePath(`${item.directory ?? ''}/${item.file.name}`),
              },
              query: pick(options ?? {}, ['overwrite']),
              ignoreResponseError: true,
            })) as any

            if (!multipartUpload.success) {
              return resolve({
                success: false,
                data: undefined,
                inputErrors: multipartUpload.data,
                runtimeError: multipartUpload.message,
                details: { path: item.path ?? '', type: 'file' },
              })
            }

            const { key, path } = multipartUpload
            const parts = splitFileIntoChunks(item.file, multipartThresholdBytes)

            if (notification) {
              notification.fileName = path.split('/').pop()!
              notification.directory = path.slice(0, -notification.fileName.length - 1) || '/'
            }

            for (const [j, part] of parts.entries()) {
              const body = new FormData()
              const uniqueUploadId = nanoid()
              const concurrentUploadsHistory = [concurrentUploads.value.length + 1]
              let startTime: number
              let progressInterval: ReturnType<typeof setInterval> | undefined
              let prevProgress = 0
              body.append('file', part)

              const partUpload = (await $pfetchDashboard(apiBasePath + `uploads/multipart/${key}?partNumber=${j + 1}`, {
                method: 'put',
                body,
                ignoreResponseError: true,
                signal,
                onRequest: () => {
                  startTime = performance.now()
                  concurrentUploads.value.push(uniqueUploadId)
                  clearInterval(progressInterval)
                  if (notification?.status === 'pending') {
                    notification.status = 'uploading'
                  }
                  if (_.status?.[i].value === 'pending') {
                    _.status[i].value = 'uploading'
                  }
                  progressInterval = setInterval(() => {
                    const estimatedUploadTime =
                      (part.size / (uploadSpeed.value ?? 1000000)) *
                      (concurrentUploadsHistory.reduce((acc, curr) => acc + curr, 0) /
                        concurrentUploadsHistory.length) *
                      1000
                    const progress = (performance.now() - startTime!) / estimatedUploadTime
                    const progressClamped = clamp(progress, prevProgress, 0.95)
                    if (notification) {
                      notification.progress = (j + progressClamped) / parts.length
                    }
                    if (_.progress?.[i]) {
                      _.progress[i].value = (j + progressClamped) / parts.length
                    }
                    prevProgress = progressClamped
                    concurrentUploadsHistory.push(concurrentUploads.value.length)
                  }, 100)
                },
              })
                .catch((error) => error)
                .finally(() => {
                  remove(uniqueUploadId, concurrentUploads.value, true)
                  clearInterval(progressInterval)
                })) as any

              if (partUpload.success) {
                uploadSpeed.value =
                  (part.size / (performance.now() - startTime!)) *
                  1000 *
                  (concurrentUploadsHistory.reduce((acc, curr) => acc + curr, 0) / concurrentUploadsHistory.length)

                if (notification) {
                  notification.progress = (j + 1) / parts.length
                }

                if (_.progress?.[i]) {
                  _.progress[i].value = (j + 1) / parts.length
                }
              }

              if (!partUpload.success) {
                if (partUpload.message?.includes('<abort>')) {
                  if (notification) {
                    notification.status = 'aborted'
                    notification.progress = 0
                  }

                  if (_.status?.[i]) {
                    _.status[i].value = 'aborted'
                  }

                  if (_.progress?.[i]) {
                    _.progress[i].value = 0
                  }
                }

                await $pfetchDashboard(apiBasePath + `uploads/multipart/${key}`, {
                  method: 'delete',
                  ignoreResponseError: true,
                })

                return resolve({
                  success: false,
                  data: undefined,
                  inputErrors: undefined,
                  runtimeError: partUpload.message?.includes('<abort>')
                    ? __('pruvious-dashboard', 'Upload aborted')
                    : partUpload.message,
                  details: { path, type: 'file' },
                })
              }
            }

            const completeUpload = (await $pfetchDashboard(apiBasePath + `uploads/multipart/${key}`, {
              method: 'post',
              query: {
                returning: options?.returning ? [...options.returning, 'id'] : undefined,
                ...omit(options ?? {}, ['_', 'multipartThreshold'] as any),
              },
              ignoreResponseError: true,
            })) as any

            if (!completeUpload.success) {
              await $pfetchDashboard(apiBasePath + `uploads/multipart/${key}`, {
                method: 'delete',
                ignoreResponseError: true,
              })

              return resolve({
                success: false,
                data: undefined,
                inputErrors: completeUpload.data,
                runtimeError: completeUpload.message,
                details: { path, type: 'file' },
              })
            }

            return resolve({
              success: true,
              data: options?.returning?.includes('id' as any) ? completeUpload.data : omit(completeUpload.data, ['id']),
              inputErrors: undefined,
              runtimeError: undefined,
              details: { id: completeUpload.data.id, path, type: 'file' },
            })
          }).then((result) => {
            if (notification) {
              if (notification.status !== 'aborted') {
                notification.status = result.success ? 'completed' : 'failed'
                notification.progress = 1
              }

              if (result.success) {
                notification.fileName = result.details.path.split('/').pop()!
                notification.directory = result.details.path.slice(0, -notification.fileName.length - 1) || '/'
              } else if (isObject(result.inputErrors) && Object.keys(result.inputErrors).length) {
                notification.error = Object.values(result.inputErrors)[0]
              } else {
                notification.error = result.runtimeError
              }
            }

            if (result.success) {
              puiQueueToast(__('pruvious-dashboard', 'Upload complete'), { type: 'success' })
            } else if (_.status?.[i]?.value !== 'aborted') {
              puiQueueToast(__('pruvious-dashboard', 'Upload failed'), { type: 'error' })
            }

            if (_.status?.[i]?.value !== 'aborted') {
              if (_.status?.[i]) {
                _.status[i].value = result.success ? 'completed' : 'failed'
              }

              if (_.progress?.[i]) {
                _.progress[i].value = 1
              }
            }

            if (_.result?.[i]) {
              _.result[i].value = result
            }

            return result
          })
      }

      const body = new FormData()
      const uniqueUploadId = nanoid()
      const concurrentUploadsHistory = [concurrentUploads.value.length + 1]
      let startTime: number
      let progressInterval: ReturnType<typeof setInterval> | undefined
      let prevProgress = 0

      for (const [key, value] of Object.entries(item)) {
        if (key === 'file') {
          body.append(item.directory ?? '', value)
        } else if (key !== 'directory') {
          const sanitized = isPrimitive(value) ? value : JSON.stringify(value)
          if (isDefined(sanitized) && isNotNull(sanitized)) {
            body.append(key, String(sanitized))
          }
        }
      }

      return () =>
        new Promise<PutUploadResult<TReturningFields, TPopulateFields>>(async (resolve) => {
          const upload = (await $pfetchDashboard(apiBasePath + 'uploads', {
            method: 'post',
            body,
            query: omit(options ?? {}, ['_', 'multipartThreshold'] as any),
            ignoreResponseError: true,
            signal,
            onRequest: () => {
              startTime = performance.now()
              concurrentUploads.value.push(uniqueUploadId)
              clearInterval(progressInterval)
              if (notification?.status === 'pending') {
                notification.status = 'uploading'
              }
              if (_.status?.[i].value === 'pending') {
                _.status[i].value = 'uploading'
              }

              progressInterval = setInterval(() => {
                const estimatedUploadTime =
                  (item.file.size / (uploadSpeed.value ?? 1000000)) *
                  (concurrentUploadsHistory.reduce((acc, curr) => acc + curr, 0) / concurrentUploadsHistory.length) *
                  1000
                const progress = (performance.now() - startTime!) / estimatedUploadTime
                const progressClamped = clamp(progress, prevProgress, 0.95)
                if (notification) {
                  notification.progress = progressClamped
                }
                if (_.progress?.[i]) {
                  _.progress[i].value = progressClamped
                }
                prevProgress = progressClamped
                concurrentUploadsHistory.push(concurrentUploads.value.length)
              }, 100)
            },
          })
            .then((results: any) => results[0])
            .catch((error) => error)
            .finally(() => {
              remove(uniqueUploadId, concurrentUploads.value, true)
              clearInterval(progressInterval)
            })) as any

          if (!upload.success) {
            if (upload.message?.includes('<abort>')) {
              if (notification) {
                notification.status = 'aborted'
                notification.progress = 0
              }

              if (_.status?.[i]) {
                _.status[i].value = 'aborted'
              }

              if (_.progress?.[i]) {
                _.progress[i].value = 0
              }
            }

            return resolve({
              success: false,
              data: undefined,
              inputErrors: upload.inputErrors,
              runtimeError: upload.message?.includes('<abort>')
                ? __('pruvious-dashboard', 'Upload aborted')
                : (upload.message ?? upload.runtimeError),
              details: { path: item.path ?? '', type: 'file' },
            })
          }

          return resolve({
            success: true,
            data: upload.data,
            inputErrors: undefined,
            runtimeError: undefined,
            details: upload.details,
          })
        }).then((result) => {
          if (notification) {
            if (notification.status !== 'aborted') {
              notification.status = result.success ? 'completed' : 'failed'
              notification.progress = 1
            }

            if (result.success) {
              notification.fileName = result.details.path.split('/').pop()!
              notification.directory = result.details.path.slice(0, -notification.fileName.length - 1) || '/'
            } else if (isObject(result.inputErrors) && Object.keys(result.inputErrors).length) {
              notification.error = Object.values(result.inputErrors)[0]
            } else {
              notification.error = result.runtimeError
            }
          }

          if (result.success) {
            puiQueueToast(__('pruvious-dashboard', 'Upload complete'), { type: 'success' })
            uploadSpeed.value =
              (item.file.size / (performance.now() - startTime!)) *
              1000 *
              (concurrentUploadsHistory.reduce((acc, curr) => acc + curr, 0) / concurrentUploadsHistory.length)
          } else if (_.status?.[i]?.value !== 'aborted') {
            puiQueueToast(__('pruvious-dashboard', 'Upload failed'), { type: 'error' })
          }

          if (_.status?.[i]?.value !== 'aborted') {
            if (_.status?.[i]) {
              _.status[i].value = result.success ? 'completed' : 'failed'
            }

            if (_.progress?.[i]) {
              _.progress[i].value = 1
            }
          }

          if (_.result?.[i]) {
            _.result[i].value = result
          }

          return result
        })
    }),
  ).then((results) => {
    const flattened = results.flat() as any[]
    window.dispatchEvent(new CustomEvent('pruvious:upload-complete'))
    return isArray(file) ? flattened : flattened[0]
  })
}

/**
 * @todo description and example
 */
export function useUpload<
  TFile extends File | File[] | PruviousFile | PruviousFile[],
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  file: TFile,
  options?: Omit<PutUploadOptions<TReturningFields, TPopulateFields>, 'guarded'> & StandardUploadOptions,
): TFile extends any[]
  ? UseUploadResult<TReturningFields, TPopulateFields>[]
  : UseUploadResult<TReturningFields, TPopulateFields> {
  const pruviousFiles: PruviousFile[] = []
  const fileItems = toArray<File | PruviousFile>(file)
  const results: UseUploadResult<any, any>[] = []
  const uploadOptions: {
    progress: UseUploadResult<any, any>['progress'][]
    abortController: AbortController[]
    status: Ref<'pending' | 'uploading' | 'completed' | 'failed' | 'aborted'>[]
    result: Ref<PutUploadResult<TReturningFields, TPopulateFields> | undefined>[]
  } = {
    progress: [],
    abortController: [],
    status: [],
    result: [],
  }

  for (const item of fileItems) {
    pruviousFiles.push(item instanceof File ? { file: item } : item)
  }

  for (const item of pruviousFiles) {
    const progress = ref(0)
    const abortController = new AbortController()
    const status = ref<'pending' | 'uploading' | 'completed' | 'failed' | 'aborted'>('pending')
    const result = ref<PutUploadResult<TReturningFields, TPopulateFields>>()
    const abort = () => abortController.abort('<abort>')
    uploadOptions.progress.push(progress)
    uploadOptions.abortController.push(abortController)
    uploadOptions.status.push(status)
    uploadOptions.result.push(result)
    results.push({ file: item, status, result, progress, abort })
  }

  upload(pruviousFiles, { ...options, _: uploadOptions } as any)

  return (isArray(results) ? results : results[0]) as any
}

/**
 * @todo
 */
export async function createUploadDirectory(directory: string | string[]) {}

/**
 * @todo description and example
 */
export async function putUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  file: File,
  input?: Omit<InsertInput<Collections['Uploads']>, 'type' | 'etag' | 'images' | 'isLocked' | 'multipart' | 'size'>,
  options?: Omit<PutUploadOptions<TReturningFields, TPopulateFields>, 'guarded'>,
) {
  const runtimeConfig = useRuntimeConfig()
  const body = new FormData()
  body.append('', file)
  Object.entries(input ?? {})
    .filter((_, v) => isNotNull(v))
    .forEach(([k, v]) => body.append(k, isObject(v) ? JSON.stringify(v) : v!.toString()))
  return $pfetch(runtimeConfig.public.pruvious.apiBasePath + 'uploads', { method: 'post', body, query: options })
}

/**
 * @todo
 */
export async function moveUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(path: string, newPath: string, options?: MoveUploadOptions<TReturningFields, TPopulateFields>) {}

/**
 * @todo
 */
export async function updateUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(
  path: string,
  input: Pick<UpdateInput<Collections['Uploads']>, 'author' | 'editors' | 'isLocked'>,
  options?: UpdateUploadOptions<TReturningFields, TPopulateFields>,
) {}

/**
 * @todo
 */
export async function deleteUpload<
  const TReturningFields extends Collections['Uploads']['TColumnNames'] | 'id' =
    | Collections['Uploads']['TColumnNames']
    | 'id',
  const TPopulateFields extends boolean = false,
>(path: string, options?: DeleteUploadOptions<TReturningFields, TPopulateFields>) {}

/**
 * Checks if one or more uploads exist based on their path or ID.
 *
 * - If a single path/ID is provided, it returns a boolean.
 * - If an array of paths/IDs is provided, it returns an object mapping each of the given paths/IDs to a boolean.
 *
 * @example
 * ```ts
 * await uploadExists('/path/to/file.jpg')
 * // true
 *
 * await uploadExists([123, '/path/to/another.png', 456])
 * // { 123: true; '/path/to/another.png': true; 456: false; }
 * ```
 */
export async function uploadExists<const TPathOrId extends number | string | readonly (number | string)[]>(
  pathOrId: TPathOrId,
): Promise<TPathOrId extends readonly (number | string)[] ? { [K in TPathOrId[number]]: boolean } : boolean> {
  const query = selectFrom('Uploads').select(['id', 'path'])
  const ids: number[] = []
  const paths: string[] = []

  for (const item of toArray(pathOrId as number | string)) {
    if (isPositiveInteger(item)) {
      ids.push(item)
    } else {
      paths.push(item)
    }
  }

  if (ids.length === 1) {
    query.where('id', '=', ids[0]!)
  } else if (ids.length > 1) {
    query.where('id', 'in', ids)
  }

  if (paths.length === 1) {
    query.where('path', '=', paths[0]!)
  } else if (paths.length > 1) {
    query.where('path', 'in', paths)
  }

  const result = await query.all()

  if (!result.success) {
    return (isArray(pathOrId) ? Object.fromEntries(pathOrId.map((item) => [item, false])) : false) as any
  }

  return (
    isArray(pathOrId)
      ? Object.fromEntries(
          pathOrId.map((item) => [item, result.data.find(({ id, path }) => item === id || item === path)]),
        )
      : result.data.length > 0
  ) as any
}

/**
 * Splits a File object into an array of Blobs (chunks).
 * This method is memory-efficient as it uses `File.slice()` which does not load the entire file into memory.
 */
export function splitFileIntoChunks(file: File, multipartThresholdBytes: number): Blob[] {
  const chunks: Blob[] = []
  let startByte = 0

  while (startByte < file.size) {
    const endByte = startByte + multipartThresholdBytes
    const chunk = file.slice(startByte, endByte)
    chunks.push(chunk)
    startByte = endByte
  }

  return chunks
}
