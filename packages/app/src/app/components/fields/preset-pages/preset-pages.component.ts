import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core'
import { Field, PresetRecord, standardPageFields } from '@pruvious/shared'
import { lowercaseFirstLetter } from '@pruvious/utils'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Page } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-preset-pages',
  templateUrl: './preset-pages.component.html',
})
export class PresetPagesComponent extends BaseComponent implements OnInit {
  @Input()
  preset!: Partial<PresetRecord>

  @Input()
  label: string = `Related ${lowercaseFirstLetter(this.config.pages.labels!.item!.plural)}`

  @Input()
  description: string = `List of ${lowercaseFirstLetter(
    this.config.pages.labels!.item!.plural,
  )} that use this ${lowercaseFirstLetter(this.config.presets.labels!.item!.singular)}`

  @Input()
  canUpdate: boolean = false

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  labelHovered: boolean = false

  pages: Partial<Page>[] = []

  pageTitleField!: Field

  initialized: boolean = false

  page: number = 1

  counter: number = 1

  loadMore: boolean = false

  constructor(public config: ConfigService, protected api: ApiService) {
    super()
  }

  ngOnInit(): void {
    this.pageTitleField = standardPageFields.find((field) => field.name === 'title')!
    this.load()
  }

  onClickLabel(): void {
    ;(this.containerEl.nativeElement.querySelector('a, button') as any)?.focus()
  }

  load(): void {
    const counter = ++this.counter
    this.api
      .getRelatedPagesOfPreset(this.preset.id!, this.page)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((pages) => {
        if (this.counter === counter) {
          this.pages.push(...pages.data)
          this.page++
          this.loadMore = this.page <= pages.meta.lastPage
          this.initialized = true
        }
      })
  }
}
