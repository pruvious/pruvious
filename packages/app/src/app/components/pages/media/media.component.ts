import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  UploadRecord,
  flattenFields,
  parseQueryString,
  standardUploadFields,
  stringifyQueryParameters,
} from '@pruvious-test/shared'
import { Bind } from '@pruvious-test/utils'
import { skip, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { Directory } from 'src/app/services/api.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { MediaSelection, MediaSelectionType, MediaService } from 'src/app/services/media.service'
import { Filter } from 'src/app/utils/Filter'

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
})
export class MediaComponent extends BaseComponent implements OnInit {
  directories!: Partial<Directory>[]

  uploads!: Partial<UploadRecord>[]

  directory?: Partial<Directory>

  upload?: Partial<UploadRecord>

  selection: MediaSelection = { directories: {}, uploads: {} }

  selectionCount: number = 0

  selectionType: MediaSelectionType = 'items'

  confirm?: string

  filter!: Filter

  filterPopupVisible: boolean = false

  prevPath: string = window.location.pathname

  constructor(
    public config: ConfigService,
    public media: MediaService,
    public router: Router,
    protected click: ClickService,
    protected route: ActivatedRoute,
  ) {
    super()
    this.config.setTitle(this.config.uploads.labels!.title!.plural)
    this.filter = new Filter([
      ...standardUploadFields,
      ...flattenFields(this.config.uploads.fields ?? []),
    ])
  }

  ngOnInit(): void {
    this.resolve()
    this.onUrlChange()

    this.route.params.pipe(takeUntil(this.unsubscribeAll$), skip(1)).subscribe(() => {
      this.resolve()
    })
  }

  @Bind
  protected resolve(): void {
    if (this.route.snapshot.data['directory']) {
      const dir = this.route.snapshot.data['directory']
      this.directories = dir.directories
      this.uploads = dir.uploads
      this.directory = dir
      this.upload = undefined
    } else if (this.route.snapshot.data['upload']) {
      const dir = this.route.snapshot.data['upload'].directory
      this.directories = dir?.directories ?? this.route.snapshot.data['directories']
      this.uploads = dir?.uploads ?? this.route.snapshot.data['uploads']
      this.directory = dir ?? undefined
      this.upload = this.route.snapshot.data['upload']
    } else {
      this.directories = this.route.snapshot.data['directories']
      this.uploads = this.route.snapshot.data['uploads']
      this.directory = undefined
      this.upload = undefined
    }
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

  applyFilters(): void {
    const changed = this.filter.apply()
    this.filterPopupVisible = false

    if (changed) {
      const qs = stringifyQueryParameters(this.filter.toQueryParams())
      const url = window.location.origin + (qs ? `/media?${qs}` : this.prevPath)
      window.history.pushState(null, '', url)
      this.media.refresh$.next()
    }
  }

  clearFilters(): void {
    const changed = this.filter.clear()
    this.filterPopupVisible = false

    if (changed) {
      const qs = stringifyQueryParameters(this.filter.toQueryParams())
      const url = window.location.origin + this.prevPath + (qs ? `?${qs}` : '')
      window.history.pushState(null, '', url)
      this.media.refresh$.next()
    }
  }

  @HostListener('window:popstate')
  @HostListener('window:change-media-filter')
  protected onUrlChange(): void {
    let changed: boolean = false

    const { params } = parseQueryString(window.location.search)

    if (window.location.search) {
      changed = this.filter.fromQueryParams(params)
    } else {
      changed = this.filter.clear()
    }

    if (changed) {
      const qs = stringifyQueryParameters(params)
      const url = window.location.origin + window.location.pathname + (qs ? `?${qs}` : '')
      setTimeout(() => window.history.replaceState(null, '', url))
      this.media.refresh$.next()
    }
  }

  @HostListener('window:click-nav-item', ['$event'])
  protected reset(event: CustomEvent): void {
    if (event.detail === (document.baseURI + 'media').replace(window.location.origin, '')) {
      window.history.pushState(null, '', window.location.origin + window.location.pathname)
      setTimeout(() => this.onUrlChange())
    }
  }
}
