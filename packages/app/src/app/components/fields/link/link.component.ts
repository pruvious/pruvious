import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import { Link } from '@pruvious/shared'
import { isUrl, isUrlPath } from '@pruvious/utils'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-link',
  templateUrl: './link.component.html',
})
export class LinkComponent extends BaseComponent implements OnChanges {
  @Input()
  value: (Link & { append?: string }) | null = null

  @Output()
  valueChange: EventEmitter<(Link & { append?: string }) | null> = new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  key: string = ''

  linkUrl: string = ''

  linkLabel: string = ''

  linkTarget: string | null = null

  linkTargetSwitcher: '_self' | '_blank' | 'custom' = '_self'

  linkAppend: string = ''

  linkUrlError: string = ''

  altLabel: string = ''

  previewLinkUrl: string = ''

  id: string = this.idService.generate()

  popupVisible: boolean = false

  linked: boolean = false

  protected counter: number = 0

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected idService: IdService,
  ) {
    super()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const match = this.value?.url.match(/^\$([1-9][0-9]*)$/)
      const pageId = match ? match[1] : null
      const counter = ++this.counter

      if (pageId) {
        if (changes['value'].previousValue?.url !== changes['value'].currentValue?.url) {
          this.altLabel = ' '
          this.previewLinkUrl = ''

          this.api
            .getPage(pageId, true)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: (page) => {
                if (counter === this.counter) {
                  this.altLabel = page.path!
                  this.previewLinkUrl = `${this.config.siteBaseUrl}${page.path}`
                  this.linked = true
                }
              },
              error: () => {
                if (counter === this.counter) {
                  this.altLabel = ''
                  this.previewLinkUrl = this.value?.url ?? ''
                  this.linked = false
                }
              },
            })
        }
      } else {
        this.altLabel = ''
        this.previewLinkUrl = this.value
          ? this.value.url.startsWith('/')
            ? this.config.siteBaseUrl + this.value.url
            : this.value.url
          : ''
        this.linked = false
      }
    }
  }

  onLinkUrlChange(): void {
    this.linked = /^\$[1-9][0-9]*$/.test(this.linkUrl)
  }

  onLinkTargetSwitcherChange(): void {
    this.linkTarget =
      this.linkTargetSwitcher === '_self'
        ? null
        : this.linkTargetSwitcher === '_blank'
        ? '_blank'
        : ''
  }

  onLinkChange(): void {
    const trimmedUrl = this.linkUrl.trim()

    if (!trimmedUrl) {
      this.linkUrlError = 'This field is required'
    } else if (!isUrl(trimmedUrl) && !isUrlPath(trimmedUrl, true)) {
      this.linkUrlError = trimmedUrl.startsWith('http') ? 'Invalid URL' : 'Invalid URL path'
    } else {
      this.linkUrlError = ''
    }

    if (!this.linkUrlError) {
      this.popupVisible = false

      if (trimmedUrl) {
        this.value = {
          url: trimmedUrl,
          label: this.linkLabel.trim(),
          target: this.linkTarget?.trim() ?? null,
        }

        if (this.linked) {
          this.value.append = this.linkAppend
        }
      } else {
        this.value = null
      }

      this.valueChange.emit(this.value)
    }
  }

  removeLink(): void {
    this.value = null
    this.valueChange.emit(this.value)
  }

  onPickUrl(label: string): void {
    if (!this.linkLabel.trim()) {
      this.linkLabel = label
    }
  }

  openPopup(): void {
    this.popupVisible = true
    this.linkUrlError = ''
    this.linkUrl = this.value?.url ?? ''
    this.linkLabel = this.value?.label ?? ''
    this.linkTarget = this.value?.target ?? null
    this.linkTargetSwitcher = !this.linkTarget
      ? '_self'
      : this.linkTarget === '_blank'
      ? '_blank'
      : 'custom'
    this.linkAppend = this.value?.append ?? ''
  }

  closePopup(): void {
    this.popupVisible = false
  }
}
