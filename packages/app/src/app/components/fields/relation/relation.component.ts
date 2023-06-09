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
import {
  Choice,
  Field,
  QueryStringParameters,
  flattenFields,
  standardCollectionFields,
  standardPageFields,
  standardPresetFields,
  standardRoleFields,
  standardUploadFields,
  standardUserFields,
} from '@pruvious/shared'
import { Debounce, clearArray, clearObject, next, prev, uniqueArray } from '@pruvious/utils'
import { Observable, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Index } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-relation',
  templateUrl: './relation.component.html',
})
export class RelationComponent extends BaseComponent implements OnChanges {
  @Input()
  value: number | null = null

  @Output()
  valueChange: EventEmitter<number | null> = new EventEmitter()

  @Input()
  table!: 'pages' | 'presets' | 'uploads' | 'posts' | 'roles' | 'users'

  @Input()
  get choiceLabel() {
    return this._choiceLabel
  }
  set choiceLabel(value: string | [string, string | undefined]) {
    this._choiceLabel = typeof value === 'string' ? [value, undefined] : value
  }
  protected _choiceLabel!: [string, string | undefined]

  @Input()
  previewFields?: string[]

  @Input()
  collection: string = ''

  @Input()
  language?: string

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

  @Output()
  record: EventEmitter<Record<string, any> | null> = new EventEmitter()

  tempValue: string = ''

  choices: (Choice & { info?: string })[] = []

  focused: boolean = false

  labelHovered: boolean = false

  highlighted: (Choice & { info?: string }) | null = null

  results?: Index<Record<string, any>>

  dimTextInputValue: boolean = false

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

  resultCounter: number = 0

  spinner: boolean = false

  spinnerTimeout?: NodeJS.Timeout

  canRead: boolean = false

  canUpdate: boolean = false

  relationPath: string = ''

  itemLabelSingularLowerCase: string = 'item'

  fields: Field[] = []

  mappedFields: Record<string, Field> = {}

  currentRecord?: Record<string, any>

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected idService: IdService,
  ) {
    super()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['table'] || changes['collection']) {
      switch (this.table) {
        case 'pages':
          this.choiceLabel = this.choiceLabel || ['title', 'path']
          this.canRead = this.config.can['readPages']
          this.canUpdate = this.config.can['updatePages']
          this.relationPath = '/pages'
          this.itemLabelSingularLowerCase =
            this.config.pages.labels?.item?.singular.toLowerCase() ?? 'page'
          this.fields = flattenFields([...standardPageFields, ...(this.config.pages.fields ?? [])])
          break
        case 'presets':
          this.choiceLabel = this.choiceLabel || ['title', undefined]
          this.canRead = this.config.can['readPresets']
          this.canUpdate = this.config.can['updatePresets']
          this.relationPath = '/presets'
          this.itemLabelSingularLowerCase =
            this.config.presets.labels?.item?.singular.toLowerCase() ?? 'preset'
          this.fields = standardPresetFields
          break
        case 'uploads':
          this.choiceLabel = this.choiceLabel || ['path', undefined]
          this.canRead = this.config.can['readMedia']
          this.canUpdate = this.config.can['updateMedia']
          this.relationPath = '/media'
          this.itemLabelSingularLowerCase = 'file'
          this.fields = standardUploadFields
          break
        case 'posts':
          this.choiceLabel = this.choiceLabel || ['id', undefined]
          this.canRead = this.config.can[`readPosts:${this.collection}`]
          this.canUpdate = this.config.can[`updatePosts:${this.collection}`]
          this.relationPath = `/collections/${this.collection}`
          this.itemLabelSingularLowerCase = this.collection
            ? this.config.collections[this.collection].labels?.item?.singular.toLowerCase() ??
              'post'
            : 'post'
          this.fields = flattenFields([
            ...standardCollectionFields,
            ...(this.config.collections[this.collection]?.fields ?? []),
          ])
          break
        case 'roles':
          this.choiceLabel = this.choiceLabel || ['name', undefined]
          this.canRead = this.config.can['readRoles']
          this.canUpdate = this.config.can['updateRoles']
          this.relationPath = '/roles'
          this.itemLabelSingularLowerCase =
            this.config.roles.labels?.item?.singular.toLowerCase() ?? 'role'
          this.fields = standardRoleFields
          break
        case 'users':
          this.choiceLabel = this.choiceLabel || ['email', undefined]
          this.canRead = this.config.can['readUsers']
          this.canUpdate = this.config.can['updateUsers']
          this.relationPath = '/users'
          this.itemLabelSingularLowerCase =
            this.config.users.labels?.item?.singular.toLowerCase() ?? 'user'
          this.fields = flattenFields([...standardUserFields, ...(this.config.users.fields ?? [])])
          break
        default:
          this.canRead = false
          this.canUpdate = false
          this.relationPath = ''
          this.itemLabelSingularLowerCase = 'item'
          this.fields = []
      }

      clearObject(this.mappedFields)

      this.fields.forEach((field) => {
        this.mappedFields[field.name] = field
      })
    }

    if (changes['value']) {
      this.refreshCurrentRecord()
    }
  }

  protected refreshCurrentRecord(): void {
    if (this.value) {
      const method: Observable<Record<string, any>> =
        this.table === 'pages'
          ? this.api.getPage(this.value, true)
          : this.table === 'presets'
          ? this.api.getPreset(this.value, true)
          : this.table === 'uploads'
          ? this.api.getUpload(this.value, true)
          : this.table === 'posts'
          ? this.api.getPost(this.collection, this.value, true)
          : this.table === 'roles'
          ? this.api.getRole(this.value, true)
          : this.api.getUser(this.value, true)

      method.pipe(takeUntil(this.unsubscribeAll$)).subscribe({
        next: (record) => {
          this.currentRecord = record
          this.record.emit(record)

          if (record[this.choiceLabel[0]] || typeof record[this.choiceLabel[0]] === 'number') {
            this.tempValue = record[this.choiceLabel[0]]
            this.dimTextInputValue = false
          } else {
            const field = this.fields.find((field) => field.name === this.choiceLabel[0])
            this.tempValue = field?.emptyOrNull ?? ''
            this.dimTextInputValue = true
          }
        },
        error: () => {
          this.currentRecord = undefined
          this.record.emit(null)
          this.tempValue = ''
        },
      })
    } else {
      this.currentRecord = undefined
      this.record.emit(null)
      this.tempValue = ''
    }
  }

  onFocusInput(): void {
    this.tempValue = ''
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
      this.results &&
      this.results.meta.currentPage < this.results.meta.lastPage &&
      this.scrollerEl.nativeElement.scrollTop + this.scrollerEl.nativeElement.offsetHeight ===
        this.scrollerEl.nativeElement.scrollHeight
    ) {
      this.getSuggestions(this.results.meta.currentPage + 1)
    }
  }

  getSuggestions(page: number = 1): void {
    if (this.focused) {
      const counter = ++this.resultCounter
      const fields: string[] = [this.choiceLabel[0]]

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
        language: this.language || this.config.currentLanguage,
      }

      const method: Observable<Index<Record<string, any>>> =
        this.table === 'pages'
          ? this.api.getPages(params, true)
          : this.table === 'presets'
          ? this.api.getPresets(params, true)
          : this.table === 'uploads'
          ? this.api.getUploads(params, true)
          : this.table === 'posts'
          ? this.api.getPosts(this.collection, params, true)
          : this.table === 'roles'
          ? this.api.getRoles(params, true)
          : this.api.getUsers(params, true)

      method.pipe(takeUntil(this.unsubscribeAll$)).subscribe((results) => {
        if (counter === this.resultCounter) {
          this.results = results

          const choices: (Choice & { info?: string })[] = results.data.map((result) => ({
            label: result[this.choiceLabel[0]],
            info: this.choiceLabel[1] ? result[this.choiceLabel[1]] : undefined,
            value: result['id'],
          }))

          if (results.meta.currentPage === 1) {
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
    this.resultCounter++
    this.height = 0

    this.refreshCurrentRecord()

    clearTimeout(this.spinnerTimeout)
    this.spinner = false
  }

  highlight(choice: Choice & { info?: string }): void {
    this.highlighted = choice
  }

  highlightPrev(): void {
    this.highlighted =
      prev({ value: this.highlighted?.value, label: '' }, this.choices, 'value') ?? null
    this.scrollToHighlighted()
  }

  highlightNext(): void {
    this.highlighted =
      next({ value: this.highlighted?.value, label: '' }, this.choices, 'value') ?? null
    this.scrollToHighlighted()
  }

  pick(choice?: Choice & { info?: string }): void {
    const value = choice ? choice.value : this.highlighted ? this.highlighted.value : this.tempValue

    if (value !== this.value) {
      this.value = value
      this.tempValue = choice ? choice.value : this.highlighted ? this.highlighted.value : value
      this.dimTextInputValue = false
      this.valueChange.emit(this.value)
    }

    this.focused = false
  }

  unlink(): void {
    this.value = null
    this.tempValue = ''
    this.valueChange.emit(this.value)
    setTimeout(() => this.inputEl.nativeElement.focus())
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
