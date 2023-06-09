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
import {
  Choice,
  Field,
  QueryStringParameters,
  flattenFields,
  standardPageFields,
} from '@pruvious/shared'
import { Debounce, clearArray, next, prev, uniqueArray } from '@pruvious/utils'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Index, Page } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-url',
  templateUrl: './url.component.html',
})
export class UrlComponent extends BaseComponent implements OnInit, OnChanges {
  @Input()
  value: string = ''

  @Output()
  valueChange: EventEmitter<string> = new EventEmitter()

  @Output()
  edited: EventEmitter<string> = new EventEmitter()

  @Output()
  pickedLabel: EventEmitter<string> = new EventEmitter()

  @Input()
  linkable: boolean = false

  @Input()
  get choiceLabel() {
    return this._choiceLabel
  }
  set choiceLabel(value: string | [string, string | undefined]) {
    this._choiceLabel = typeof value === 'string' ? [value, undefined] : value
  }
  protected _choiceLabel: [string, string | undefined] = ['title', 'path']

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  placeholder: string | null = null

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  id: string = this.idService.generate()

  @Input()
  key: string = ''

  @Input()
  name: string = ''

  @ViewChild('input')
  inputEl!: ElementRef<HTMLInputElement>

  @ViewChild('scroller')
  scrollerEl!: ElementRef<HTMLDivElement>

  tempValue: string = ''

  linked: boolean = false

  linkedPageId: number = 0

  choices: (Choice & { id: number; info?: string })[] = []

  focused: boolean = false

  labelHovered: boolean = false

  highlighted: (Choice & { id: number; info?: string }) | null = null

  pages?: Index<Partial<Page>>

  get height(): number {
    return this._height
  }
  set height(value: number) {
    this._height = value
    this.animatingHeight = true

    clearTimeout(this.heightTimeout)
    this.heightTimeout = setTimeout(() => {
      this.animatingHeight = false
    }, 250)
  }
  protected _height: number = 0
  protected heightTimeout?: NodeJS.Timeout

  animatingHeight: boolean = false

  pageCounter: number = 0

  spinner: boolean = false

  spinnerTimeout?: NodeJS.Timeout

  hasMoreLanguages: boolean = false

  showAllLanguages: boolean = false

  choiceLabelFields!: [Field | undefined, Field | undefined]

  fields: Field[] = flattenFields([...standardPageFields, ...(this.config.pages.fields ?? [])])

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected idService: IdService,
  ) {
    super()
    this.hasMoreLanguages = config.cms.languages!.length > 1
  }

  ngOnInit(): void {
    this.updateChoiceLabels()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['linkable']) {
      const match = this.value?.match(/^\$([1-9][0-9]*)$/)

      if (match && this.linkable) {
        this.linked = true
        this.linkedPageId = +match[1]

        this.api
          .getPage(this.linkedPageId, true)
          .pipe(takeUntil(this.unsubscribeAll$))
          .subscribe({
            next: (page) => {
              this.tempValue = page.path!
            },
            error: () => {
              this.tempValue = this.value
              this.linked = false
              this.linkedPageId = 0
            },
          })
      } else {
        this.tempValue = this.value
        this.linked = false
        this.linkedPageId = 0
      }
    }

    if (changes['choiceLabel']) {
      this.updateChoiceLabels()
    }
  }

  protected updateChoiceLabels(): void {
    this.choiceLabelFields = [
      this.fields.find((field) => field.name === this.choiceLabel[0]),
      this.fields.find((field) => field.name === this.choiceLabel[1]),
    ]
  }

  onFocusInput(): void {
    this.tempValue = this.value
    this.focused = true
    clearArray(this.choices)
    this.getSuggestions()
  }

  @Debounce(250)
  onTempValueChange(): void {
    this.getSuggestions()
  }

  onScroll(): void {
    if (
      this.pages &&
      this.pages.meta.currentPage < this.pages.meta.lastPage &&
      this.scrollerEl.nativeElement.scrollTop + this.scrollerEl.nativeElement.offsetHeight ===
        this.scrollerEl.nativeElement.scrollHeight
    ) {
      this.getSuggestions(this.pages.meta.currentPage + 1)
    }
  }

  getSuggestions(page: number = 1): void {
    if (this.focused && this.linkable) {
      const counter = ++this.pageCounter
      const fields: string[] = [this.choiceLabel[0], 'path']

      if (this.choiceLabel[1]) {
        fields.push(this.choiceLabel[1])
      }

      clearTimeout(this.spinnerTimeout)
      this.spinnerTimeout = setTimeout(() => {
        this.spinner = true
      }, 250)

      const params: QueryStringParameters = {
        search: this.tempValue,
        fields: uniqueArray(fields),
        perPage: 50,
        page,
        language: this.showAllLanguages ? '*' : this.config.currentLanguage,
      }

      this.api
        .getPages(params, true)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((pages) => {
          if (counter === this.pageCounter) {
            this.pages = pages

            const choices = pages.data.map((page) => ({
              id: page.id!,
              label: page[this.choiceLabel[0]],
              value: page.path,
              info: this.choiceLabel[1] ? page[this.choiceLabel[1]] : undefined,
            }))

            if (pages.meta.currentPage === 1) {
              this.choices = choices
            } else {
              this.choices.push(...choices)
            }

            this.updateHeight()

            clearTimeout(this.spinnerTimeout)
            this.spinner = false
          }
        })
    }
  }

  onBlurInput(): void {
    this.focused = false
    this.highlighted = null
    this.pageCounter++
    this.height = 0

    clearTimeout(this.spinnerTimeout)
    this.spinner = false

    this.edited.emit(this.value)
  }

  highlight(choice: Choice & { id: number; info?: string }): void {
    this.highlighted = choice
  }

  highlightPrev(): void {
    this.highlighted =
      prev({ value: this.highlighted?.value, label: '', id: 0 }, this.choices, 'value') ?? null
    this.scrollToHighlighted()
  }

  highlightNext(): void {
    this.highlighted =
      next({ value: this.highlighted?.value, label: '', id: 0 }, this.choices, 'value') ?? null
    this.scrollToHighlighted()
  }

  pick(choice?: Choice & { id: number; info?: string }): void {
    const value = choice
      ? `$${choice.id}`
      : this.highlighted
      ? `$${this.highlighted.id}`
      : this.tempValue

    if (value !== this.value) {
      this.value = value
      this.tempValue = choice ? choice.value : this.highlighted ? this.highlighted.value : value
      this.valueChange.emit(this.value)
      this.edited.emit(this.value)

      if (choice || this.highlighted) {
        this.pickedLabel.emit(choice?.label ?? this.highlighted?.label)
      }
    }

    this.focused = false
  }

  onInputChange(): void {
    if (this.focused) {
      this.value = this.tempValue
      this.valueChange.emit(this.value)
    }
  }

  unlink(): void {
    this.value = ''
    this.tempValue = ''
    this.valueChange.emit(this.value)
    setTimeout(() => this.inputEl.nativeElement.focus())
  }

  toggleAllLanguages(): void {
    this.showAllLanguages = !this.showAllLanguages
  }

  protected updateHeight(): void {
    this.height = (Math.min(6, this.choices.length) * 9) / 4
  }

  @Debounce(150)
  protected scrollToHighlighted(): void {
    this.scrollerEl.nativeElement
      .querySelector(`button[data-highlighted]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}
