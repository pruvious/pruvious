import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import { UploadRecord, imageExtensions } from '@pruvious/shared'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { MediaService, PickRequirements } from 'src/app/services/media.service'
import { cmdPlus } from 'src/app/utils/hotkeys'

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
})
export class ImageComponent extends BaseComponent implements OnInit, OnChanges {
  @Input()
  value: number | null = null

  @Output()
  valueChange: EventEmitter<number | null> = new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  allow?: PickRequirements['allow']

  @Input()
  minWidth?: PickRequirements['minWidth']

  @Input()
  minHeight?: PickRequirements['minHeight']

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  key: string = ''

  @ViewChild('root')
  rootEl!: ElementRef<HTMLDivElement>

  upload: Partial<UploadRecord> | null = null

  editingDescription: boolean = false

  descriptionValue: string = ''

  constructor(
    public config: ConfigService,
    public media: MediaService,
    protected api: ApiService,
    protected toastr: ToastrService,
  ) {
    super()
  }

  ngOnInit(): void {
    this.media.pathChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.refresh()
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.refresh()
    }
  }

  protected refresh(): void {
    if (this.value) {
      this.api
        .getUpload(this.value, true)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((upload) => {
          this.upload = upload
        })
    } else {
      this.upload = null
    }

    this.editingDescription = false
  }

  openMediaLibrary(): void {
    this.media
      .listenToPicks({
        allow: this.allow ?? imageExtensions,
        minWidth: this.minWidth,
        minHeight: this.minHeight,
      })
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((upload) => {
        if (upload) {
          this.value = upload.id!
          this.valueChange.emit(this.value)
        }
      })
  }

  onEditDescription(): void {
    if (this.upload) {
      this.editingDescription = true
      this.descriptionValue = this.upload.description!

      setTimeout(() => {
        this.rootEl.nativeElement.querySelector('input')?.select()
      })
    }
  }

  onUpdateImage(): void {
    if (this.upload && this.upload.description !== this.descriptionValue) {
      this.api
        .updateUpload({ ...this.upload, description: this.descriptionValue })
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((upload) => {
          this.upload = upload
          this.toastr.success('Description updated')
          this.editingDescription = false
        })
    } else {
      this.editingDescription = false
    }
  }

  onDescriptionKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || cmdPlus('s', event)) {
      event.preventDefault()
      event.stopPropagation()
      this.onUpdateImage()
    } else if (event.code === 'Escape') {
      this.editingDescription = false
    }
  }

  remove(): void {
    this.value = null
    this.valueChange.emit(null)
  }
}
