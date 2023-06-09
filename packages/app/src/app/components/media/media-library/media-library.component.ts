import { HttpErrorResponse } from '@angular/common/http'
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import {
  ConditionalLogic,
  flattenFields,
  standardUploadFields,
  UploadRecord,
} from '@pruvious-test/shared'
import {
  Bind,
  clearArray,
  clearObject,
  collator,
  getSharedPathStart,
  slugify,
  sortNaturalByProp,
  uppercaseFirstLetter,
} from '@pruvious-test/utils'
import { getFilesFromDataTransferItems } from 'datatransfer-files-promise'
import { ToastrService } from 'ngx-toastr'
import { catchError, firstValueFrom, forkJoin, Observable, of, takeUntil, tap } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Directory } from 'src/app/services/api.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { DragImageService } from 'src/app/services/drag-image.service'
import { LoadingService } from 'src/app/services/loading.service'
import {
  MediaSelection,
  MediaSelectionType,
  MediaService,
  PickRequirements,
} from 'src/app/services/media.service'
import { isDropzone } from 'src/app/utils/dom'
import { Filter } from 'src/app/utils/Filter'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styles: [':host { flex: 1; display: flex; flex-direction: column; min-height: 100% }'],
})
export class MediaLibraryComponent extends BaseComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  get active(): boolean {
    return this._active
  }
  set active(value: boolean) {
    clearTimeout(this.activeTimeout)

    if (value) {
      this._active = true
    } else {
      this.activeTimeout = setTimeout(() => (this._active = false), 300)
    }
  }
  protected _active: boolean = true
  protected activeTimeout?: NodeJS.Timeout

  @Input()
  directories: Partial<Directory>[] = []

  @Input()
  uploads: Partial<UploadRecord>[] = []

  @Input()
  directory?: Partial<Directory>

  @Input()
  pickableUploads: boolean = false

  @Output()
  openDirectory = new EventEmitter<Partial<Directory>>()

  @Output()
  pickUpload = new EventEmitter<Partial<UploadRecord>>()

  @Input()
  selection: MediaSelection = { directories: {}, uploads: {} }

  @Output()
  selectionChange = new EventEmitter<MediaSelection>()

  @Input()
  selectionCount: number = 0

  @Output()
  selectionCountChange = new EventEmitter<number>()

  @Input()
  selectionType: MediaSelectionType = 'items'

  @Output()
  selectionTypeChange = new EventEmitter<MediaSelectionType>()

  @Input()
  get pickRequirements(): PickRequirements | undefined {
    return this._pickRequirements
  }
  set pickRequirements(value: PickRequirements | undefined) {
    this._pickRequirements = value
    this.accept = value?.allow?.map((ext) => `.${ext}`).join(',') ?? ''
  }
  protected _pickRequirements?: PickRequirements

  @Input()
  filter?: Filter

  @ViewChild('upload')
  uploadEl!: ElementRef<HTMLInputElement>

  get directoryPopupVisible(): boolean {
    return this._directoryPopupVisible
  }
  set directoryPopupVisible(value: boolean) {
    this._directoryPopupVisible = value

    if (value) {
      this.directoryName = ''
      this.editingDirectory = undefined
      this.validator.reset()
    }
  }
  protected _directoryPopupVisible: boolean = false

  directoryName: string = ''

  editingDirectory?: Partial<Directory>

  get uploadPopupVisible(): boolean {
    return this._uploadPopupVisible
  }
  set uploadPopupVisible(value: boolean) {
    this._uploadPopupVisible = value

    if (value) {
      this.editingUpload = undefined
      this.validator.reset()
    }
  }
  protected _uploadPopupVisible: boolean = false

  uploadName: string = ''

  uploadDescription: string = ''

  editingUpload?: Partial<UploadRecord>

  accept: string = ''

  get movePopupVisible(): boolean {
    return this._movePopupVisible
  }
  set movePopupVisible(value: boolean) {
    if (value) {
      this.refreshTree(true)
    } else {
      this._movePopupVisible = false
    }
  }
  protected _movePopupVisible: boolean = false

  tree: (Partial<Directory> & { enabled: boolean; level: number })[] = []

  refreshTreeCounter: number = 0

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], [])

  confirm?: string

  resetting: boolean = false

  dragCount: number = 0

  dragAreaHighlighted: boolean = false

  selectionOrigin: { type: 'directory' | 'upload'; id: number } | null = null

  moving: boolean = false

  moveTargetHighlighted: number | null = null

  hasVisibleCustomFields: boolean = flattenFields(this.config.uploads.fields ?? []).some(
    (field) => field.visible !== false,
  )

  counter: number = 0

  constructor(
    protected api: ApiService,
    protected click: ClickService,
    protected config: ConfigService,
    protected dragImage: DragImageService,
    protected loadingService: LoadingService,
    protected media: MediaService,
    protected toastr: ToastrService,
  ) {
    super()
  }

  ngOnInit(): void {
    this.media.createDirectory$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.directoryPopupVisible = true
    })

    this.media.deleteItems$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.deleteItems()
    })

    this.media.removeSelectedItems$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.removeSelectedItems()
    })

    this.media.clearSelection$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.deselectAll()
    })

    this.media.moveSelection$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      if (this.media.countSelections(this.selection)) {
        this.movePopupVisible = true
      }
    })

    this.media.upload$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      setTimeout(() => this.uploadEl.nativeElement.click())
    })

    this.media.reset$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.reset()
    })

    this.media.refresh$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.refresh()
    })

    this.media.editUpload$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((upload) => {
      this.editUpload(upload)
    })

    if (this.filter?.isActive) {
      this.reset()
    }

    this.conditionalLogic.setFields([
      ...standardUploadFields,
      ...(this.config.uploads.fields ?? []),
    ])
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['directories']) {
      sortNaturalByProp(this.uploads, 'name')
    }

    if (changes['uploads']) {
      sortNaturalByProp(this.directories, 'name')
    }

    if (
      changes['directory'] &&
      changes['directory'].currentValue?.id !== changes['directory'].previousValue?.id
    ) {
      setTimeout(() => this.deselectAll())
    }
  }

  protected reset(): void {
    this.resetting = true
    this.editingDirectory = undefined
    this.editingUpload = undefined
    this.movePopupVisible = false
    this.directory = undefined
    clearArray(this.directories)
    clearArray(this.uploads)
    this.validator.reset()
    this.deselectAll()
    this.refresh()
  }

  protected refresh(): void {
    const counter = ++this.counter

    if (this.filter?.isActive) {
      this.api
        .allUploads(this.filter.toQueryParams())
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((uploads) => {
          if (counter === this.counter) {
            clearArray(this.directories)
            clearArray(this.uploads).push(...uploads)
            sortNaturalByProp(this.uploads, 'name')
            this.hydrate()
            this.resetting = false
          }
        })
    } else if (this.directory) {
      this.api
        .getDirectory(this.directory.id!)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((directory) => {
          if (counter === this.counter) {
            clearArray(this.directories).push(...directory.directories!)
            sortNaturalByProp(this.directories, 'name')
            clearArray(this.uploads).push(...directory.uploads!)
            sortNaturalByProp(this.uploads, 'name')
            this.hydrate()
            this.resetting = false
          }
        })
    } else {
      forkJoin({
        directories: this.api.getRootDirectories(),
        uploads: this.api.allUploads({}),
      })
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe(({ directories, uploads }) => {
          if (counter === this.counter) {
            clearArray(this.directories).push(...directories)
            clearArray(this.uploads).push(...uploads)

            sortNaturalByProp(this.directories, 'name')
            sortNaturalByProp(this.uploads, 'name')

            this.hydrate()
            this.resetting = false
          }
        })
    }
  }

  protected hydrate(): void {
    Object.keys(this.selection.directories).forEach((directoryId) => {
      if (!this.directories.some((directory) => directory.id === +directoryId)) {
        delete this.selection.directories[+directoryId]
      }
    })

    Object.keys(this.selection.uploads).forEach((uploadId) => {
      if (!this.uploads.some((upload) => upload.id === +uploadId)) {
        delete this.selection.uploads[+uploadId]
      }
    })

    if (
      (this.selectionOrigin?.type === 'directory' &&
        !this.directories.some((directory) => directory.id === this.selectionOrigin!.id)) ||
      (this.selectionOrigin?.type === 'upload' &&
        !this.uploads.some((upload) => upload.id === this.selectionOrigin!.id))
    ) {
      this.selectionOrigin = null
    }

    this.emitSelection()
  }

  selectDirectory(directory: Partial<Directory>, event?: MouseEvent): void {
    if (event?.shiftKey && this.selectionOrigin) {
      event.preventDefault()
      clearObject(this.selection.directories)
      clearObject(this.selection.uploads)

      if (this.selectionOrigin.type === 'directory') {
        let state: number = 0 // 0 - initial, 1 - start, 2 - end

        for (const item of this.directories) {
          if (item.id === directory.id) {
            state++
          }

          if (item.id === this.selectionOrigin.id) {
            state++
          }

          if (state) {
            this.selection.directories[item.id!] = item
          }

          if (state === 2) {
            break
          }
        }
      } else if (this.selectionOrigin.type === 'upload') {
        let state: number = 0 // 0 - initial, 1 - start

        for (const item of this.directories) {
          if (item.id === directory.id) {
            state++
          }

          if (state) {
            this.selection.directories[item.id!] = item
          }
        }

        for (const item of this.uploads) {
          this.selection.uploads[item.id!] = item

          if (item.id === this.selectionOrigin.id) {
            break
          }
        }
      }
    } else {
      this.selection.directories[directory.id!] = directory
    }

    this.emitSelection()
  }

  deselectDirectory(directory: Partial<Directory>, event?: MouseEvent): void {
    if (event?.shiftKey && this.selectionOrigin) {
      this.selectDirectory(directory, event)
    } else {
      delete this.selection.directories[directory.id!]
      this.emitSelection()
    }
  }

  selectUpload(upload: Partial<UploadRecord>, event?: MouseEvent): void {
    if (event?.shiftKey && this.selectionOrigin) {
      event.preventDefault()
      clearObject(this.selection.directories)
      clearObject(this.selection.uploads)

      if (this.selectionOrigin.type === 'directory') {
        let state: number = 0 // 0 - initial, 1 - start

        for (const item of this.directories) {
          if (item.id === this.selectionOrigin.id) {
            state++
          }

          if (state) {
            this.selection.directories[item.id!] = item
          }
        }

        for (const item of this.uploads) {
          this.selection.uploads[item.id!] = item

          if (item.id === upload.id) {
            break
          }
        }
      } else if (this.selectionOrigin.type === 'upload') {
        let state: number = 0 // 0 - initial, 1 - start, 2 - end

        for (const item of this.uploads) {
          if (item.id === upload.id) {
            state++
          }

          if (item.id === this.selectionOrigin.id) {
            state++
          }

          if (state) {
            this.selection.uploads[item.id!] = item
          }

          if (state === 2) {
            break
          }
        }
      }
    } else {
      this.selection.uploads[upload.id!] = upload
    }

    this.emitSelection()
  }

  deselectUpload(upload: Partial<UploadRecord>, event?: MouseEvent): void {
    if (event?.shiftKey && this.selectionOrigin) {
      this.selectUpload(upload, event)
    } else {
      delete this.selection.uploads[upload.id!]
      this.emitSelection()
    }
  }

  deselectAll(): void {
    clearObject(this.selection.directories)
    clearObject(this.selection.uploads)
    this.emitSelection()
  }

  removeSelectedItems(): void {
    Object.entries(this.selection.directories).forEach(([_, item]) => {
      const index = this.directories.findIndex((directory) => directory.id === item.id)

      if (index > -1) {
        this.directories.splice(index, 1)
      }
    })

    Object.entries(this.selection.uploads).forEach(([_, item]) => {
      const index = this.uploads.findIndex((upload) => upload.id === item.id)

      if (index > -1) {
        this.uploads.splice(index, 1)
      }
    })

    this.deselectAll()
  }

  protected emitSelection(): void {
    this.selectionCount = this.media.countSelections(this.selection)
    this.selectionType = this.media.getSelectionType(this.selection)
    this.selectionOrigin =
      this.selectionCount === 1
        ? {
            type: Object.keys(this.selection.directories).length ? 'directory' : 'upload',
            id: +(
              Object.keys(this.selection.directories)[0] ?? Object.keys(this.selection.uploads)[0]
            ),
          }
        : this.selectionCount === 0
        ? null
        : this.selectionOrigin

    this.selectionChange.emit(this.selection)
    this.selectionCountChange.emit(this.selectionCount)
    this.selectionTypeChange.emit(this.selectionType)
  }

  onSubmitDirectory(): void {
    if (this.validator.isLocked) {
      return
    }

    this.validator.reset().lock()

    const method = this.editingDirectory ? 'updateDirectory' : 'createDirectory'

    this.api[method]({
      ...(this.editingDirectory ?? {}),
      name: this.directoryName,
      directoryId: this.directory?.id ?? null,
    })
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: () => {
          this.toastr.success(this.editingDirectory ? 'Folder renamed' : 'Folder created')
          this.validator.unlock()
          this.directoryPopupVisible = false
          this.refresh()
        },
        error: (response: HttpErrorResponse) => {
          this.validator.reset()

          if (response.status === 422) {
            this.validator.setFieldErrors(response.error)
          } else if (response.status === 400) {
            this.validator.setGeneralError(response.error.message)
          }

          if (this.validator.generalError) {
            this.toastr.error(this.validator.generalError)
          }
        },
      })
  }

  onSubmitUpload(): void {
    if (this.validator.isLocked) {
      return
    }

    this.validator.reset().lock()

    this.api
      .updateUpload({
        ...(this.editingUpload ?? {}),
        name: this.uploadName,
        description: this.uploadDescription,
        directoryId: this.directory?.id ?? null,
      })
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: () => {
          this.toastr.success('File updated')
          this.validator.unlock()
          this.uploadPopupVisible = false
          this.refresh()
        },
        error: (response: HttpErrorResponse) => {
          this.validator.reset()

          if (response.status === 422) {
            this.validator.setFieldErrors(response.error)
          } else if (response.status === 400) {
            this.validator.setGeneralError(response.error.message)
          }

          if (this.validator.generalError) {
            this.toastr.error(this.validator.generalError)
          }
        },
      })
  }

  protected refreshTree(showMovePopup: boolean): void {
    clearArray(this.tree)

    const counter = ++this.refreshTreeCounter

    this.api
      .getDirectories()
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((directories) => {
        if (counter === this.refreshTreeCounter) {
          const forbiddenPaths = Object.entries(this.selection.directories).map(
            ([_, directory]) => {
              return directory.path!
            },
          )

          const tree = directories.map((directory) => {
            const enabled =
              directory.path !== this.directory?.path &&
              forbiddenPaths.every((path) => {
                return path !== directory.path && !directory.path!.startsWith(`${path}/`)
              })

            return {
              ...directory,
              enabled,
              level: directory.path?.split('/').length ?? 1,
            }
          })

          tree.sort((a, b) => {
            const shared = getSharedPathStart(a.path!, b.path!)

            let aCompare = a.path!.replace(shared, '')
            let bCompare = b.path!.replace(shared, '')

            aCompare = (aCompare[0] === '/' ? aCompare.slice(1) : aCompare).split('/')[0]
            bCompare = (bCompare[0] === '/' ? bCompare.slice(1) : bCompare).split('/')[0]

            return collator.compare(aCompare, bCompare)
          })

          this.tree.push(
            {
              name: 'Library (root folder)',
              enabled:
                forbiddenPaths.every((path) => path.includes('/')) &&
                Object.entries(this.selection.uploads).every(
                  ([_, upload]) => upload.path!.split('/').length > 1,
                ),
              level: 0,
            },
            ...tree,
          )

          if (showMovePopup) {
            this._movePopupVisible = true

            if (this.tree.every((directory) => !directory.enabled)) {
              this.toastr.warning(
                `There are no folders where the selected ${this.selectionType} can be moved to`,
              )
            }
          }
        }
      })
  }

  moveSelectionTo(directory: Partial<Directory>): void {
    const count = this.selectionCount
    const type = this.selectionType

    if (count) {
      this.api
        .moveMedia(this.selection, directory)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe({
          next: ({ items, moved }) => {
            if (items === moved) {
              this.toastr.success(`${uppercaseFirstLetter(type)} moved`)
            } else if (moved) {
              this.toastr.success(`Moved ${moved} of ${items} ${type}`)
            } else {
              this.toastr.success(`Cannot move ${type}`)
            }

            this.refresh()
          },
          error: (response: HttpErrorResponse) => {
            if (response.status === 400) {
              this.toastr.error(response.error.message)
            }
          },
        })
    }
  }

  onMoveSelectionTo(directory: Partial<Directory>, event: MouseEvent): void {
    if (!this.confirm?.startsWith('move-selection-to-')) {
      event.stopPropagation()

      this.confirm = `move-selection-to-${directory.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.moveSelectionTo(directory)
          this.removeSelectedItems()
          this.confirm = undefined
          this.movePopupVisible = false
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  editDirectory(directory: Partial<Directory>): void {
    this.directoryPopupVisible = true
    this.directoryName = directory.name!
    this.editingDirectory = directory
  }

  onDeleteDirectory(event: MouseEvent, directory: Partial<Directory>): void {
    if (!this.confirm?.startsWith('delete-directory-')) {
      event.stopPropagation()

      this.confirm = `delete-directory-${directory.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.deleteDirectory(directory)
          this.removeSelectedItems()
          this.confirm = undefined
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  deleteDirectory(directory: Partial<Directory>): void {
    this.api
      .deleteDirectory(directory)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: () => {
          this.toastr.success('Folder deleted')
          this.refresh()
        },
        error: (response: HttpErrorResponse) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
  }

  onUpload(event: Event): void {
    const target = event.target as HTMLInputElement
    const uploads: Observable<Partial<UploadRecord> | null>[] = []

    if (target.files) {
      for (const file of Array.from(target.files)) {
        if (file.size <= this.config.uploadLimit) {
          uploads.push(
            this.api.createUpload({ directoryId: this.directory?.id }, file).pipe(
              takeUntil(this.unsubscribeAll$),
              tap((upload) => {
                this.toastr.success(`<strong>${upload.name}</strong> uploaded`)
              }),
              catchError((response: HttpErrorResponse) => {
                if (response.status === 422) {
                  response.error.errors.forEach((error: { field: string; message: string }) => {
                    this.toastr.error(
                      `Error (<strong>${file.name}</strong>)<br>${error.field}: ${error.message}`,
                    )
                  })
                } else if (response.status === 400) {
                  this.toastr.error(response.error.message)
                }

                return of(null)
              }),
            ),
          )
        } else {
          this.toastr.error(
            `The file <strong>${file.name}</strong> exceeds the upload limit of ${this.config.uploadLimitHuman}`,
          )
        }
      }
    }

    if (uploads.length) {
      forkJoin(uploads)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe({
          next: () => this.refresh(),
          error: () => this.refresh(),
        })
    }

    target.value = ''
  }

  editUpload(upload: Partial<UploadRecord>): void {
    this.uploadPopupVisible = true
    this.uploadName = upload.name!
    this.uploadDescription = upload.description!
    this.editingUpload = upload
    this.conditionalLogic.setRecords(upload).check()
  }

  updateConditionalLogic(): void {
    this.conditionalLogic.check()
  }

  onDeleteUpload(event: MouseEvent, upload: Partial<UploadRecord>): void {
    if (!this.confirm?.startsWith('delete-upload-')) {
      event.stopPropagation()

      this.confirm = `delete-upload-${upload.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.deleteUpload(upload)
          this.removeSelectedItems()
          this.confirm = undefined
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  deleteUpload(upload: Partial<UploadRecord>): void {
    this.api
      .deleteUpload(upload)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: () => {
          this.toastr.success('File deleted')
          this.refresh()
        },
        error: (response: HttpErrorResponse) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
  }

  deleteItems(): void {
    const count = this.selectionCount
    const type = uppercaseFirstLetter(this.selectionType)

    if (count) {
      this.api
        .deleteMedia(this.selection)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe({
          next: () => {
            this.toastr.success(`${type} deleted`)
            this.refresh()
          },
          error: (response: HttpErrorResponse) => {
            if (response.status === 400) {
              this.toastr.error(response.error.message)
            }
          },
        })
    }
  }

  isAllowed(upload: Partial<UploadRecord>): boolean {
    if (this.pickRequirements?.allow?.every((ext) => !upload.name!.endsWith(`.${ext}`))) {
      return false
    }

    if (
      this.pickRequirements?.minWidth &&
      (upload.info?.width ?? 0) < this.pickRequirements.minWidth
    ) {
      return false
    }

    if (
      this.pickRequirements?.minHeight &&
      (upload.info?.height ?? 0) < this.pickRequirements.minHeight
    ) {
      return false
    }

    return true
  }

  @HostListener('window:dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    if (
      this.config.can['createMedia'] &&
      event.dataTransfer?.items &&
      [...(event.dataTransfer.items as any)].some((item) => item.kind === 'file')
    ) {
      if (!this.dragCount) {
        window.addEventListener('dragover', this.onDragOver)
      }

      this.dragCount++

      if (!isDropzone(event.target as HTMLElement)) {
        setTimeout(() => {
          this.dragCount--

          if (!this.dragCount) {
            window.removeEventListener('dragover', this.onDragOver)
          }
        }, 100)
      }
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    if (
      this.config.can['createMedia'] &&
      event.dataTransfer?.items &&
      [...(event.dataTransfer.items as any)].some((item) => item.kind === 'file')
    ) {
      this.dragCount--

      if (!this.dragCount) {
        window.removeEventListener('dragover', this.onDragOver)
      }
    }
  }

  @Bind
  onDragOver(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
  }

  @HostListener('window:drop', ['$event'])
  @HostListener('window:click')
  onDrop(event?: DragEvent): void {
    event?.preventDefault()
    this.dragCount = 0
    this.dragAreaHighlighted = false
    window.removeEventListener('dragover', this.onDragOver)
  }

  async onDropInArea(event: DragEvent): Promise<void> {
    this.dragCount = 0
    this.dragAreaHighlighted = false
    window.removeEventListener('dragover', this.onDragOver)

    if (event.dataTransfer?.items.length) {
      try {
        const dirMap: Record<string, number> = {}
        const files: (File & { filepath: string })[] = await getFilesFromDataTransferItems(
          event.dataTransfer.items,
        )

        for (const file of files) {
          if (file.size <= this.config.uploadLimit) {
            let parentDir: number | null = this.directory?.id ?? null
            let currentPath: string[] = this.directory ? [this.directory.path!] : []

            const pathParts = file.filepath
              .split(/(?:\\|\/)+/)
              .slice(0, -1)
              .filter(Boolean)

            for (const pathPart of pathParts) {
              const slugifiedPathpart = slugify(pathPart)
              currentPath.push(slugifiedPathpart)
              const path = currentPath.join('/')

              if (dirMap[path]) {
                parentDir = dirMap[path]
              } else {
                let dir = await firstValueFrom(
                  this.api.getDirectoryByPath(path, true).pipe(takeUntil(this.unsubscribeAll$)),
                ).catch((_) => null)

                if (!dir) {
                  dir = await firstValueFrom(
                    this.api
                      .createDirectory({ name: slugifiedPathpart, directoryId: parentDir })
                      .pipe(takeUntil(this.unsubscribeAll$)),
                  )
                }

                if (dir) {
                  dirMap[path] = dir.id!
                  parentDir = dir.id!
                }
              }
            }

            await firstValueFrom(
              this.api.createUpload({ directoryId: parentDir }, file).pipe(
                takeUntil(this.unsubscribeAll$),
                tap((upload) => {
                  this.toastr.success(`<strong>${upload.name}</strong> uploaded`)
                }),
                catchError((response: HttpErrorResponse) => {
                  if (response.status === 422) {
                    response.error.errors.forEach((error: { field: string; message: string }) => {
                      this.toastr.error(
                        `Error (<strong>${file.name}</strong>)<br>${error.field}: ${error.message}`,
                      )
                    })
                  } else if (response.status === 400) {
                    this.toastr.error(response.error.message)
                  }

                  return of(null)
                }),
              ),
            )
          } else {
            this.toastr.error(
              `The file <strong>${file.name}</strong> exceeds the upload limit of ${this.config.uploadLimitHuman}`,
            )
          }
        }

        this.refresh()
      } catch (_) {}
    }
  }

  onMoveStart(
    type: 'directory' | 'upload',
    item: Partial<Directory> | Partial<UploadRecord>,
    event: DragEvent,
  ): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }

    if (type === 'directory') {
      this.selectDirectory(item as Directory)
    } else {
      this.selectUpload(item as UploadRecord)
    }

    this.moving = true
    this.dragImage.label = `${this.selectionCount} ${this.selectionType}`

    event.dataTransfer?.setDragImage(this.dragImage.element!, -16, 10)
  }

  onMoveEnd(): void {
    this.moving = false
    this.moveTargetHighlighted = null

    if (this.selectionCount === 1) {
      this.deselectAll()
    }
  }

  onMoveEnter(directory: Partial<Directory>, event: DragEvent): void {
    event.preventDefault()

    if (!this.selection.directories[directory.id!]) {
      setTimeout(() => {
        this.moveTargetHighlighted = directory.id!
      })
    }
  }

  onMoveDrop(directory: Partial<Directory>, event: DragEvent): void {
    event.preventDefault()

    if (!this.selection.directories[directory.id!]) {
      this.moveSelectionTo(directory)
    }
  }

  openInNewTab(url: string): void {
    window.open(url, '_blank')
  }

  override ngOnDestroy(): void {
    if (this.dragCount) {
      window.removeEventListener('dragover', this.onDragOver)
    }
  }
}
