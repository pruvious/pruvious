import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import {
  CheckboxesField,
  Field,
  QueryStringParameters,
  UploadRecord,
  dayjs,
  dayjsUTC,
} from '@pruvious-test/shared'
import { sortNatural, sortNaturalByProp, stripHTML as stripHTML2 } from '@pruvious-test/utils'
import { Observable, firstValueFrom, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Index } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { stringify } from 'src/app/utils/stringify'
import { stripHtml } from 'string-strip-html'

@Component({
  selector: 'app-field-value',
  templateUrl: './field-value.component.html',
})
export class FieldValueComponent extends BaseComponent implements OnChanges {
  @Input()
  field!: Field

  @Input()
  value!: any

  @Input()
  simplified: boolean = false

  @Input()
  data: Record<string, any> = {}

  @Input()
  cache: Record<string, any> = {}

  displayedValue: any = ''

  dimmed: boolean = false

  record?: Record<string, any>

  link?: string

  constructor(public config: ConfigService, protected api: ApiService) {
    super()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field']) {
      if (this.field.name === 'language' && this.field.type === 'select') {
        this.field.choices = sortNaturalByProp(
          this.config.cms.languages!.map((language) => ({
            label: language.label,
            value: language.code,
          })),
          'label',
        )
      } else if (this.field.name === 'translationId') {
        if (this.data['translations']) {
          let translatable: boolean = false
          const translations: string[] = []
          Object.entries(this.data['translations']).forEach(([langCode, translation]) => {
            const language = this.config.cms.languages!.find((language) => {
              translatable = true
              return language.code === langCode
            })
            if (language && translation) {
              translations.push(language.label)
            }
          })
          this.value = translatable
            ? sortNatural(translations).join(', ') || '-'
            : 'Not translatable'
        } else {
          this.value = ''
        }
      }

      if (!this.isEmpty()) {
        if (this.field.type === 'date') {
          this.displayedValue = dayjsUTC(this.value).format(this.config.me.dateFormat)
        } else if (this.field.type === 'dateTime') {
          this.displayedValue = (this.field.utc ? dayjsUTC(this.value) : dayjs(this.value)).format(
            `${this.config.me.dateFormat} ${this.config.me.timeFormat}`,
          )
        } else if (this.field.type === 'time') {
          this.displayedValue = dayjsUTC(this.value).format(this.config.me.timeFormat)
        } else if (this.field.type === 'editor') {
          try {
            this.displayedValue = stripHtml(this.value).result || this.field.emptyOrNull || '-'
          } catch (_) {
            this.displayedValue = stripHTML2(this.value) || this.field.emptyOrNull || '-'
          }
        } else if (this.field.type === 'image') {
          this.fetchImage()
        } else if (
          this.field.type === 'file' ||
          this.field.type === 'link' ||
          this.field.type === 'url' ||
          this.field.type === 'role' ||
          this.field.type === 'page' ||
          this.field.type === 'post' ||
          this.field.type === 'preset' ||
          this.field.type === 'user'
        ) {
          this.fetchRecord()
        } else if (this.field.type === 'buttons' || this.field.type === 'select') {
          this.displayedValue =
            (this.field.choices ?? []).find((choice) => choice.value === this.value)?.label ??
            (this.field.emptyOrNull || '-')
        } else if (this.field.type === 'switch') {
          this.displayedValue = this.value
            ? this.field.trueLabel ?? 'Yes'
            : this.field.falseLabel ?? 'No'
        } else if (this.field.type === 'checkbox') {
          this.displayedValue = this.value ? 'On' : 'Off'
        } else if (this.field.type === 'checkboxes') {
          this.displayedValue = Array.isArray(this.value)
            ? this.value
                .map((checkboxValue) => {
                  return (
                    ((this.field as CheckboxesField).choices ?? []).find(
                      (choice) => choice.value === checkboxValue,
                    )?.label ?? checkboxValue
                  )
                })
                .join(', ') ||
              this.field.emptyOrNull ||
              '-'
            : this.field.emptyOrNull || '-'
          this.dimmed = !this.displayedValue
        } else {
          this.displayedValue = stringify(this.value)
        }
      } else {
        this.displayedValue = this.field.emptyOrNull || '-'
        this.dimmed = true
      }
    }
  }

  protected fetchRecord(): void {
    let table: 'pages' | 'presets' | 'uploads' | 'posts' | 'roles' | 'users' | undefined
    let collection: string = ''
    let displayedFieldName: string = ''
    let fetchFields: string[] = []
    let id: number = this.value

    if (this.field.type === 'link') {
      table = 'pages'
      fetchFields = ['path']
      id = this.value?.url.match(/^\$([1-9][0-9]*)$/) ? +this.value.url.slice(1) : 0

      if (this.value?.label) {
        this.displayedValue = this.value.label
      } else {
        this.displayedValue = this.value?.url ?? ''
        displayedFieldName = 'path'
      }

      if (!id) {
        this.link = this.value
          ? this.value.url.startsWith('/')
            ? this.config.siteBaseUrl + this.value.url
            : this.value.url
          : ''
      }
    } else if (this.field.type === 'url') {
      if (this.field.linkable) {
        table = 'pages'
        displayedFieldName = 'path'
        fetchFields = ['path']
        id = this.value?.match(/^\$([1-9][0-9]*)$/) ? +this.value.slice(1) : 0
      } else {
        id = 0
      }

      if (!id) {
        this.link = this.value
          ? this.value.startsWith('/')
            ? this.config.siteBaseUrl + this.value
            : this.value
          : ''
      }
    } else if (this.field.type === 'page') {
      table = 'pages'
      displayedFieldName = this.field.listingLabel ?? 'title'
      fetchFields = [displayedFieldName]
    } else if (this.field.type === 'preset') {
      table = 'presets'
      displayedFieldName = this.field.listingLabel ?? 'title'
      fetchFields = [displayedFieldName]
    } else if (this.field.type === 'file') {
      table = 'uploads'
      displayedFieldName = this.field.listingLabel ?? 'path'
      fetchFields = [displayedFieldName]
    } else if (this.field.type === 'post') {
      table = 'posts'
      collection = this.field.collection
      displayedFieldName = this.field.listingLabel ?? 'id'
      fetchFields = [displayedFieldName]
    } else if (this.field.type === 'role') {
      table = 'roles'
      displayedFieldName = this.field.listingLabel ?? 'name'
      fetchFields = [displayedFieldName]
    } else if (this.field.type === 'user') {
      table = 'users'
      displayedFieldName = this.field.listingLabel ?? 'email'
      fetchFields = [displayedFieldName]
    }

    if (id && table) {
      const key = JSON.stringify(this.value) + JSON.stringify(this.field)

      if (!this.cache[key]) {
        const params: QueryStringParameters = {
          fields: fetchFields,
          filters: { id: { $eq: id } },
          perPage: 1,
          language: '*',
        }

        const method: Observable<Record<string, any>> =
          table === 'pages'
            ? this.api.getPages(params, true)
            : table === 'presets'
            ? this.api.getPresets(params, true)
            : table === 'uploads'
            ? this.api.getUploads(params, true)
            : table === 'posts'
            ? this.api.getPosts(collection, params, true)
            : table === 'roles'
            ? this.api.getRoles(params, true)
            : this.api.getUsers(params, true)

        this.cache[key] = firstValueFrom(method.pipe(takeUntil(this.unsubscribeAll$)))
      }

      this.cache[key]
        .then((response: Index<Record<string, any>>) => {
          if (response.data.length) {
            if (response.data[0][displayedFieldName] !== undefined) {
              this.displayedValue = stringify(response.data[0][displayedFieldName])
            }

            this.record = response.data[0]

            if (table === 'pages' && response.data[0]['path']) {
              this.link = `${this.config.siteBaseUrl}${response.data[0]['path']}`
            }
          } else {
            this.displayedValue = this.value
            this.record = undefined
          }
        })
        .catch(() => {
          this.displayedValue = this.value
          this.record = undefined
        })
    } else {
      if (!this.displayedValue) {
        this.displayedValue = this.value
      }

      this.record = undefined
    }
  }

  protected fetchImage(): void {
    const key = JSON.stringify(this.value) + JSON.stringify(this.field)

    if (!this.cache[key]) {
      this.cache[key] = firstValueFrom(
        this.api.getUpload(this.value, true).pipe(takeUntil(this.unsubscribeAll$)),
      )
    }

    this.cache[key]
      .then((upload: Partial<UploadRecord>) => {
        this.displayedValue = this.value
        this.record = upload
      })
      .catch(() => {
        this.displayedValue = this.value
        this.record = undefined
      })
  }

  protected isEmpty(): boolean {
    if (this.value === null) {
      return true
    } else if (typeof this.value === 'string') {
      return this.value === ''
    } else if (Array.isArray(this.value)) {
      return this.value.length === 0
    }

    return false
  }
}
