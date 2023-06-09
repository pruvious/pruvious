import { Component, EventEmitter, Input, Output } from '@angular/core'
import { UploadRecord, flattenFields, standardUploadFields } from '@pruvious/shared'
import { Debounce } from '@pruvious/utils'
import { BaseComponent } from 'src/app/components/base.component'
import { Directory } from 'src/app/services/api.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import {
  MediaSelection,
  MediaSelectionType,
  MediaService,
  PickRequirements,
} from 'src/app/services/media.service'
import { Filter } from 'src/app/utils/Filter'

@Component({
  selector: 'app-media-picker',
  templateUrl: './media-picker.component.html',
})
export class MediaPickerComponent extends BaseComponent {
  @Input()
  pickRequirements?: PickRequirements

  @Input()
  get visible(): boolean {
    return this._visible
  }
  set visible(value: boolean) {
    if (value !== this._visible) {
      if (value && !this.initialized) {
        this.reset()
        this.initialized = true
      } else if (!value) {
        this.media.completePickListeners$.next()
      }

      this._visible = value
      this.visibleChange.emit(value)
    }
  }
  protected _visible: boolean = false

  @Output()
  visibleChange = new EventEmitter<boolean>()

  directory?: Partial<Directory>

  selection: MediaSelection = { directories: {}, uploads: {} }

  selectionCount: number = 0

  selectionType: MediaSelectionType = 'items'

  confirm?: string

  filter!: Filter

  searchValue: string = ''

  protected initialized: boolean = false

  constructor(
    public config: ConfigService,
    protected click: ClickService,
    protected media: MediaService,
  ) {
    super()
    this.filter = new Filter([
      ...standardUploadFields,
      ...flattenFields(this.config.uploads.fields ?? []),
    ])
  }

  onOpenDirectory(directory: Partial<Directory>): void {
    this.directory = directory
    setTimeout(() => this.media.refresh$.next())
  }

  onPickUpload(upload: Partial<UploadRecord>): void {
    this.media.pickUpload$.next(upload)
    this.visible = false
  }

  onDeleteItems(event: MouseEvent, target: HTMLButtonElement): void {
    if (!this.confirm?.startsWith('delete-media-items')) {
      event.stopPropagation()

      this.confirm = 'delete-media-items'

      this.click.confirm(
        target,
        (event) => {
          event?.stopPropagation()
          this.media.deleteItems$.next()
          this.media.removeSelectedItems$.next()
          this.confirm = undefined
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  @Debounce(250)
  onSearch(): void {
    this.filter.fromQueryParams({ search: this.searchValue, fields: ['id'] })
    this.filter.apply()
    this.media.refresh$.next()
  }

  reset(): void {
    this.media.reset$.next()
    this.directory = undefined
  }
}
