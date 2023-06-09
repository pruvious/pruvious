import { Component, OnInit } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
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
import { Debounce, uniqueArray } from '@pruvious/utils'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Index } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { MediaService } from 'src/app/services/media.service'

@Component({
  selector: 'app-base-layout',
  templateUrl: './base-layout.component.html',
})
export class BaseLayoutComponent extends BaseComponent implements OnInit {
  languageChoices: Choice[] = []

  currentLanguage: string = ''

  logoTitle: string = ''

  searchValue: string = ''

  searchResultLabel: [string, string | undefined] = ['id', undefined]

  searchResultLabelFields: [Field | undefined, Field | undefined] = [undefined, undefined]

  searchResults: Choice[] = []

  location: 'pages' | 'presets' | 'media' | 'collections' | 'roles' | 'users' | null = null

  collection: string = ''

  translatable: boolean = false

  logoPath: string = (window as any).cmsLogo

  protected searchResultsPage: number = 1

  protected searchResultsLastPage: number = Infinity

  protected searchResultsCounter: number = 0

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected media: MediaService,
    protected router: Router,
    protected toastr: ToastrService,
  ) {
    super()
  }

  ngOnInit(): void {
    this.languageChoices = this.config.cms.languages!.map((language) => ({
      value: language.code,
      label: language.label,
    }))

    this.currentLanguage = this.config.currentLanguage

    this.config.languageChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      setTimeout(() => {
        this.currentLanguage = this.config.currentLanguage
      })
    })

    this.router.events.pipe(takeUntil(this.unsubscribeAll$)).subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.searchValue = ''
        this.updateLocation()
      }
    })

    this.updateLocation()
  }

  @Debounce(0)
  updateLocation(): void {
    const fields: Field[] = []

    if (window.location.href.startsWith(document.baseURI + 'pages')) {
      this.location = 'pages'
      this.searchResultLabel = ['title', 'path']
      this.translatable = true
      fields.push(...standardPageFields, ...flattenFields(this.config.pages.fields ?? []))
    } else if (window.location.href.startsWith(document.baseURI + 'presets')) {
      this.location = 'presets'
      this.searchResultLabel = ['title', undefined]
      this.translatable = true
      fields.push(...standardPresetFields)
    } else if (window.location.href.startsWith(document.baseURI + 'media')) {
      this.location = 'media'
      this.searchResultLabel = ['path', undefined]
      this.translatable = false
      fields.push(...standardUploadFields, ...flattenFields(this.config.uploads.fields ?? []))
    } else if (window.location.href.startsWith(document.baseURI + 'collections/')) {
      this.location = 'collections'
      this.collection = window.location.href.slice(document.baseURI.length + 12).split('/')[0]
      this.searchResultLabel = ['id', undefined]
      this.translatable = !!this.config.collections[this.collection].translatable
      fields.push(
        ...standardCollectionFields,
        ...flattenFields(this.config.collections[this.collection].fields ?? []),
      )
    } else if (window.location.href.startsWith(document.baseURI + 'roles')) {
      this.location = 'roles'
      this.searchResultLabel = ['name', undefined]
      this.translatable = false
      fields.push(...standardRoleFields)
    } else if (window.location.href.startsWith(document.baseURI + 'users')) {
      this.location = 'users'
      this.searchResultLabel = ['email', undefined]
      this.translatable = false
      fields.push(...standardUserFields, ...flattenFields(this.config.users.fields ?? []))
    } else if (window.location.href.startsWith(document.baseURI + 'settings/')) {
      const settingsGroup = window.location.href.slice(document.baseURI.length + 9).split('/')[0]
      this.translatable = !!this.config.settings[settingsGroup].translatable
    } else {
      this.location = null
      this.translatable = false
    }

    this.searchResultLabelFields = [
      fields.find((field) => field.name === this.searchResultLabel[0]),
      fields.find((field) => field.name === this.searchResultLabel[1]),
    ]
  }

  onChangeLanguage(code: string): void {
    this.config.currentLanguage = code
  }

  onPickSearchResult(value: any, event?: Event): void {
    event?.preventDefault()

    if (
      this.location === 'pages' ||
      this.location === 'presets' ||
      this.location === 'roles' ||
      this.location === 'users'
    ) {
      this.router.navigate([`/${this.location}`, value])
    } else if (this.location === 'media') {
      this.router
        .navigate(['/media'], {
          queryParams: { 'filters[id][$eq]': value },
          onSameUrlNavigation: 'reload',
        })
        .then(() => {
          window.dispatchEvent(new CustomEvent('change-media-filter'))
        })

      this.api
        .getUpload(value)
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((upload) => {
          this.media.editUpload$.next(upload)
        })
    } else if (this.location === 'collections') {
      this.router.navigate(['/collections', this.collection, 'posts', value])
    }
  }

  onFetchSearchResults(keywords: string, nextPage: 'nextPage' | undefined): void {
    if (nextPage) {
      this.searchResultsPage++
    } else {
      this.searchResults = []
      this.searchResultsPage = 1
      this.searchResultsLastPage = Infinity
    }

    if (this.searchResultsPage < this.searchResultsLastPage) {
      const counter = ++this.searchResultsCounter
      const fields: string[] = [this.searchResultLabel[0]]

      if (this.searchResultLabel[1]) {
        fields.push(this.searchResultLabel[1])
      }

      const params: QueryStringParameters = {
        search: keywords,
        fields: uniqueArray(fields),
        perPage: 50,
        page: this.searchResultsPage,
        language: this.config.currentLanguage,
      }

      const method: any =
        this.location === 'pages'
          ? this.api.getPages(params, true)
          : this.location === 'presets'
          ? this.api.getPresets(params, true)
          : this.location === 'collections'
          ? this.api.getPosts(this.collection, params, true)
          : this.location === 'media'
          ? this.api.getUploads(params, true)
          : this.location === 'roles'
          ? this.api.getRoles(params, true)
          : this.api.getUsers(params, true)

      method
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((response: Index<Record<string, any>>) => {
          this.searchResultsLastPage = response.meta.lastPage

          if (counter === this.searchResultsCounter) {
            this.searchResults = [
              ...this.searchResults,
              ...response.data.map((record) => ({
                label: record[this.searchResultLabel[0]],
                info: this.searchResultLabel[1] ? record[this.searchResultLabel[1]] : undefined,
                value: record['id'],
              })),
            ]
          }
        })
    }
  }

  onClearCache(): void {
    this.api
      .flush()
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(({ message }) => this.toastr.success(message))
  }
}
