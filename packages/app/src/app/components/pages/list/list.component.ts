import { HttpErrorResponse } from '@angular/common/http'
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  Choice,
  Field,
  FieldGroup,
  QueryStringParameters,
  QueryableField,
  QueryableModel,
  flattenFields,
  parseQueryString,
  standardCollectionFields,
  standardPageFields,
  standardPresetFields,
  standardRoleFields,
  standardUserFields,
  stringifyQueryParameters,
} from '@pruvious/shared'
import {
  camelToLabel,
  clearArray,
  clearObject,
  lowercaseFirstLetter,
  sortNaturalByProp,
} from '@pruvious/utils'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Index } from 'src/app/services/api.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { DialogService } from 'src/app/services/dialog.service'
import { Filter, FilterChoices } from 'src/app/utils/Filter'

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
})
export class ListComponent extends BaseComponent implements OnInit {
  @Input()
  resetNavItemPath!: string

  @Input()
  table!: 'pages' | 'presets' | 'collections' | 'roles' | 'users'

  @Input()
  collection: string = ''

  @Input()
  itemLabelSingular!: string

  @Input()
  itemLabelPlural!: string

  @Input()
  title!: string

  @Input()
  description: string = ''

  @Input()
  model!: 'Page' | 'Preset' | 'Collection' | 'Role' | 'User'

  @Input()
  translatable!: boolean

  @Input()
  canCreate: boolean = false

  @Input()
  canUpdate: boolean = false

  @Input()
  canDuplicate: boolean = false

  @Input()
  canPreview: boolean = false

  @Input()
  canDelete: boolean = false

  @Input()
  customFilterChoices: FilterChoices[] = []

  @Output()
  duplicate = new EventEmitter<number>()

  @Output()
  preview = new EventEmitter<number>()

  @Output()
  deleted = new EventEmitter<(string | number)[]>()

  itemLabelSingularLowerCase: string = ''

  itemLabelPluralLowerCase: string = ''

  params: QueryStringParameters = {}

  rows?: Index<Partial<Record<string, any>>>

  fields: QueryableField[] = []

  cache: Record<string, any> = {}

  get selecting(): boolean {
    return this._selecting
  }
  set selecting(value: boolean) {
    if (value !== this._selecting) {
      this._selecting = value
      this.selectAllValue = false
      this.allRowsSelected = false
      this.selectedCount = 0
      clearObject(this.selectionValues)
    }
  }
  protected _selecting: boolean = false

  selection: number[] = []

  selectAllValue: boolean = false

  allRowsSelected: boolean = false

  selectionValues: Record<number, boolean> = {}

  selectedCount: number = 0

  columns: string[] = []

  columnChoices: Choice[] = []

  columnsChanged: boolean = false

  initialized: boolean = false

  columnWidths: Record<string, number> = {}

  columnsPopupVisible: boolean = false

  filter!: Filter

  filterPopupVisible: boolean = false

  importPopupVisible: boolean = false

  get exportPopupVisible(): boolean {
    return this._exportPopupVisible
  }
  set exportPopupVisible(value: boolean) {
    this._exportPopupVisible = value

    if (value) {
      this.exportRelations = true
    }
  }
  protected _exportPopupVisible: boolean = false

  exportRelations: boolean = true

  exportCounter: number = 0

  protected modelConfig!: QueryableModel & { fields?: (QueryableField | FieldGroup)[] }

  protected counter: number = 0

  standardFields: QueryableField[] = []

  metaFields: Field[] = []

  confirm?: string

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected click: ClickService,
    protected dialog: DialogService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected toastr: ToastrService,
  ) {
    super()
  }

  ngOnInit(): void {
    this.standardFields = JSON.parse(
      JSON.stringify(
        this.table === 'pages'
          ? standardPageFields
          : this.table === 'presets'
          ? standardPresetFields
          : this.table === 'collections'
          ? standardCollectionFields
          : this.table === 'roles'
          ? standardRoleFields
          : standardUserFields,
      ),
    )

    this.metaFields =
      this.table === 'pages'
        ? this.config.pages.fields
          ? flattenFields(this.config.pages.fields)
          : []
        : this.table === 'collections'
        ? this.config.collections[this.collection]?.fields
          ? flattenFields(this.config.collections[this.collection].fields!)
          : []
        : this.table === 'users'
        ? this.config.users.fields
          ? flattenFields(this.config.users.fields)
          : []
        : this.metaFields

    this.columnChoices = [...this.standardFields, ...this.metaFields]
      .filter((field) => (field as any).selectable !== false)
      .map((field) => ({
        label: field.label || camelToLabel(field.name),
        value: field.name,
      }))

    this.modelConfig =
      this.table === 'collections'
        ? this.config.collections[this.collection]
        : this.config[this.table]
    this.itemLabelSingularLowerCase = lowercaseFirstLetter(this.itemLabelSingular)
    this.itemLabelPluralLowerCase = lowercaseFirstLetter(this.itemLabelPlural)

    this.customFilterChoices.forEach((item) => {
      const field = this.standardFields.find((field) => field.name === item.field)

      if (field && field.type === 'select') {
        field.choices = item.choices
      }
    })

    this.filter = new Filter([...this.standardFields, ...this.metaFields])
    this.onUrlChange()
    this.updateColumnsArray()
    this.applyColumns()

    this.config.languageChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.onUrlChange()
    })
  }

  updateUrl(replace: boolean = false): void {
    const qs = stringifyQueryParameters(this.params)
    const url = window.location.origin + window.location.pathname + (qs ? `?${qs}` : '')

    if (window.location.search !== `?${qs}`) {
      if (replace) {
        window.history.replaceState(null, '', url)
      } else {
        window.history.pushState(null, '', url)
      }

      this.refresh()
    }
  }

  protected replaceUrl(params: QueryStringParameters): void {
    const qs = stringifyQueryParameters(params)
    const url = window.location.origin + window.location.pathname + (qs ? `?${qs}` : '')
    setTimeout(() => window.history.replaceState(null, '', url))
  }

  @HostListener('window:popstate')
  protected onUrlChange(): void {
    let params: QueryStringParameters = {}

    if (window.location.search) {
      params = parseQueryString(window.location.search).params

      if (this.translatable && params.language !== this.config.currentLanguage) {
        params.language = this.config.currentLanguage
      }

      this.filter.fromQueryParams(params)
      this.replaceUrl(params)
    } else {
      params = this.getDefaultParams()
      this.filter.fromQueryParams(params)
    }

    if (JSON.stringify(params) !== JSON.stringify(this.params)) {
      this.params = params
      this.updateColumns()
      this.refresh()
    }

    this.checkColumns()
  }

  @HostListener('window:click-nav-item', ['$event'])
  protected reset(event: CustomEvent): void {
    if (
      event.detail ===
      (document.baseURI + this.resetNavItemPath).replace(window.location.origin, '')
    ) {
      window.history.pushState(null, '', window.location.origin + window.location.pathname)
      this.onUrlChange()
    }
  }

  protected getDefaultParams(): QueryStringParameters {
    return {
      sort: this.modelConfig.listing?.sort ?? [{ field: 'createdAt', direction: 'desc' }],
      fields: this.modelConfig.listing?.fields,
      language: this.translatable ? this.config.currentLanguage : undefined,
      perPage: this.modelConfig.listing?.perPage ?? 50,
      page: 1,
    }
  }

  protected updateColumns(): void {
    clearArray(this.fields)
    clearObject(this.columnWidths)

    const listing = this.params.fields ?? this.modelConfig.listing?.fields

    if (Array.isArray(listing)) {
      listing.forEach((item) => {
        const itemParts = item.split(':')
        const fieldName = itemParts[0]
        const width = itemParts[1] ?? null
        const standardField = this.standardFields.find((field) => field.name === fieldName)

        if (standardField && (standardField as any).selectable !== false) {
          this.fields.push(standardField)
        } else if (this.modelConfig.fields) {
          const metaField = flattenFields(this.modelConfig.fields).find((field) => {
            return field.name === fieldName
          })

          if (metaField && (metaField as any).selectable !== false) {
            this.fields.push(metaField)
          }
        }

        if (width && (+width).toString() === width) {
          this.columnWidths[fieldName] = +width
        }
      })
    }

    if (!this.fields.length) {
      this.fields.push({ name: 'id', type: 'number', label: 'ID' })
    }
  }

  protected refresh(): void {
    const counter = ++this.counter
    const params = {
      ...this.params,
      fields:
        typeof this.params.fields === 'string'
          ? this.params.fields
          : this.params.fields?.map((field) => field.split(':')[0]),
    }
    const observable: any =
      this.model === 'Collection'
        ? this.api.getPosts(this.collection, params)
        : this.api[`get${this.model}s`](params)

    this.selecting = false

    observable
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((rows: Index<Record<string, any>>) => {
        if (counter === this.counter) {
          if (this.params.perPage && this.params.perPage !== rows.meta.perPage) {
            this.params.perPage = rows.meta.perPage
            this.replaceUrl(this.params)
          }

          if (this.params.page && this.params.page > rows.meta.lastPage) {
            this.params.page = rows.meta.lastPage
            this.updateUrl(true)
          } else if (this.params.page !== undefined && this.params.page < rows.meta.firstPage) {
            this.params.page = rows.meta.firstPage
            this.updateUrl(true)
          } else {
            this.rows = rows
            this.initialized = true
          }
        }
      })
  }

  onDelete(row: Partial<Record<string, any>>): void {
    if (this.canDelete) {
      const observable =
        this.model === 'Collection'
          ? this.api.deletePost(this.collection, row)
          : this.api[`delete${this.model}`](row)

      observable.pipe(takeUntil(this.unsubscribeAll$)).subscribe({
        next: () => {
          this.toastr.success(this.itemLabelSingular + ' deleted')
          this.refresh()
          this.deleted.emit([+row['id']])
        },
        error: (response: HttpErrorResponse) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
    }
  }

  protected updateColumnsArray(): void {
    this.columns = this.params.fields?.length
      ? [...this.params.fields.map((field) => field.split(':')[0])]
      : ['id']
  }

  showColumnsPopup(): void {
    this.updateColumnsArray()
    this.columnsPopupVisible = true
    this.columnChoices = [
      ...sortNaturalByProp(this.columnChoices, 'label').sort((a, b) => {
        const aIndex = this.columns.indexOf(a.value)
        const bIndex = this.columns.indexOf(b.value)

        return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
      }),
    ]
  }

  applyColumns(): void {
    const simpleColumns = this.columns.map((field) => field.split(':')[0])
    const simpleDefaultColumns = this.getDefaultColumns().map((field) => field.split(':')[0])
    const simpleActiveColumns = this.params.fields?.map((field) => field.split(':')[0])

    if (
      (this.params.fields?.length &&
        JSON.stringify(simpleColumns) !== JSON.stringify(simpleActiveColumns)) ||
      (!this.params.fields?.length &&
        JSON.stringify(simpleColumns) !== JSON.stringify(simpleDefaultColumns))
    ) {
      this.params.fields = [...this.columns]
      this.updateUrl()
      this.updateColumns()
    }

    this.checkColumns()
    this.columnsPopupVisible = false
  }

  restoreColumns(): void {
    this.columnsPopupVisible = false
    this.columns = this.getDefaultColumns()
    this.columnsChanged = false
    this.params.fields = [...this.columns]
    this.updateUrl()
    this.updateColumns()
  }

  protected checkColumns(): void {
    this.columnsChanged =
      JSON.stringify(this.params.fields?.map((field) => field.split(':')[0])) !==
      JSON.stringify(this.getDefaultColumns().map((field) => field.split(':')[0]))
  }

  protected getDefaultColumns(): string[] {
    return this.getDefaultParams().fields?.length ? this.getDefaultParams().fields! : ['id']
  }

  applyFilters(): void {
    const changed = this.filter.apply()
    this.filterPopupVisible = false

    if (changed) {
      this.params.filters = this.filter.toQueryParams().filters
      this.updateUrl()
    }
  }

  clearFilters(): void {
    const changed = this.filter.clear()
    this.filterPopupVisible = false

    if (changed) {
      delete this.params.filters
      this.updateUrl()
    }
  }

  selectAll(): void {
    if (this.rows) {
      if (this.rows.meta.lastPage > 1) {
        this.dialog
          .open({
            message: `Would you like to select all ${this.rows.meta.total} ${this.itemLabelPluralLowerCase}?`,
            buttons: [
              { label: 'Yes', value: 'yes', color: 'white' },
              { label: 'No', value: 'no' },
            ],
          })
          .pipe(takeUntil(this.unsubscribeAll$))
          .subscribe((action) => {
            if (this.rows) {
              this.rows.data.forEach((row) => {
                this.selectionValues[row['id']] = true
              })

              if (action === 'yes') {
                this.allRowsSelected = true
                this.selectedCount = this.rows.meta.total
              } else {
                this.allRowsSelected = false
                this.countSelected()
              }
            }
          })
      } else {
        this.allRowsSelected = false

        this.rows.data.forEach((row) => {
          this.selectionValues[row['id']] = true
        })

        this.countSelected()
      }
    }
  }

  countSelected(): void {
    this.selectedCount = Object.values(this.selectionValues).filter(Boolean).length
    this.allRowsSelected = this.selectedCount === this.rows?.meta.total
  }

  onAllSelectChange(): void {
    if (this.selectAllValue) {
      this.selectAll()
    } else {
      clearObject(this.selectionValues)
      this.selectedCount = 0
      this.allRowsSelected = false
    }
  }

  onRowSelectChange(): void {
    this.allRowsSelected = false
    this.countSelected()
    this.selectAllValue = this.rows?.data.length === this.selectedCount
  }

  onDeleteSelection(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-selection')) {
      event.stopPropagation()

      this.confirm = 'delete-selection'

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined

          const ids = this.allRowsSelected
            ? ['*']
            : Object.keys(this.selectionValues)
                .map((id) => +id)
                .filter((id) => this.selectionValues[id])
          const observable =
            this.model === 'Collection'
              ? this.api.deletePosts(this.collection, ids)
              : this.api[`delete${this.model}s`](ids)

          observable.pipe(takeUntil(this.unsubscribeAll$)).subscribe({
            next: (deleted) => {
              if (deleted === 0) {
                this.toastr.success(`No ${this.itemLabelPluralLowerCase} deleted`)
              } else if (deleted === 1) {
                this.toastr.success(`${this.itemLabelSingular} deleted`)
              } else {
                this.toastr.success(`${deleted} ${this.itemLabelPluralLowerCase} deleted`)
              }

              this.refresh()
              this.selecting = false
              this.deleted.emit(ids)
            },
            error: (response: HttpErrorResponse) => {
              if (response.status === 400) {
                this.toastr.error(response.error.message)
              }
            },
          })
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  onExport(): void {
    const counter = ++this.exportCounter

    // @todo
  }
}
