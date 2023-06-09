import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { Choice, dayjs, dayjsUTC } from '@pruvious-test/shared'
import { camelToLabel, isNumeric, sortNaturalByProp } from '@pruvious-test/utils'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { ExtendedFilter, Filter } from 'src/app/utils/Filter'

@Component({
  selector: 'app-filters',
  templateUrl: './filters.component.html',
})
export class FiltersComponent extends BaseComponent implements OnChanges {
  @Input()
  filter!: Filter

  @Input()
  subject!: 'pages' | 'presets' | 'uploads' | 'collections' | 'roles' | 'users'

  @Input()
  collection: string = ''

  fieldChoices: Choice[] = []

  suggestions: Choice[] = []

  protected suggestionsPage: number = 1

  protected suggestionsLastPage: number = Infinity

  protected suggestionCounter: number = 0

  stringOperatorChoices: Choice[] = [
    { label: 'Equal to', value: '$eq' },
    { label: 'Equal to (case-insensitive)', value: '$eqi' },
    { label: 'Not equal to', value: '$ne' },
    { label: 'Is null', value: '$null' },
    { label: 'Is not null', value: '$notNull' },
    { label: 'Starts with (case-insensitive)', value: '$startsWith' },
    { label: 'Ends with (case-insensitive)', value: '$endsWith' },
    { label: 'Contains', value: '$contains' },
  ]

  numberOperatorChoices: Choice[] = [
    { label: 'Equal to', value: '$eq' },
    { label: 'Not equal to', value: '$ne' },
    { label: 'Less than', value: '$lt' },
    { label: 'Less than or equal to', value: '$lte' },
    { label: 'Greater than', value: '$gt' },
    { label: 'Greater than or equal to', value: '$gte' },
    { label: 'Is null', value: '$null' },
    { label: 'Is not null', value: '$notNull' },
  ]

  booleanOperatorChoices: Choice[] = [
    { label: 'Equal to', value: '$eq' },
    { label: 'Is null', value: '$null' },
    { label: 'Is not null', value: '$notNull' },
  ]

  constructor(protected api: ApiService, protected config: ConfigService) {
    super()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter']) {
      this.fieldChoices = this.filter.filterableFields
        .filter((field) => field.name !== 'translationId')
        .map((field) => ({
          label: field.label || camelToLabel(field.name),
          value: field,
        }))

      sortNaturalByProp(this.fieldChoices, 'label')
    }
  }

  addAndGroup(): void {
    const fieldFilter: ExtendedFilter = {
      relation: '$and',
      field: this.fieldChoices[0].value,
      operator: '$eq',
      value: '',
    }

    this.onFieldChange(fieldFilter)
    this.filter.fieldFilters.push(fieldFilter)
  }

  onFieldChange(fieldFilter: ExtendedFilter): void {
    if (
      (fieldFilter.field.type === 'buttons' ||
        fieldFilter.field.type === 'editor' ||
        fieldFilter.field.type === 'icon' ||
        fieldFilter.field.type === 'select' ||
        fieldFilter.field.type === 'text' ||
        fieldFilter.field.type === 'textArea' ||
        fieldFilter.field.type === 'url') &&
      this.stringOperatorChoices.every((choice) => choice.value !== fieldFilter.operator)
    ) {
      fieldFilter.operator = this.stringOperatorChoices[0].value
    } else if (
      (fieldFilter.field.type === 'date' ||
        fieldFilter.field.type === 'dateTime' ||
        fieldFilter.field.type === 'file' ||
        fieldFilter.field.type === 'image' ||
        fieldFilter.field.type === 'number' ||
        fieldFilter.field.type === 'page' ||
        fieldFilter.field.type === 'post' ||
        fieldFilter.field.type === 'preset' ||
        fieldFilter.field.type === 'role' ||
        fieldFilter.field.type === 'slider' ||
        fieldFilter.field.type === 'time' ||
        fieldFilter.field.type === 'user') &&
      this.numberOperatorChoices.every((choice) => choice.value !== fieldFilter.operator)
    ) {
      fieldFilter.operator = this.numberOperatorChoices[0].value
    } else if (
      (fieldFilter.field.type === 'checkbox' || fieldFilter.field.type === 'switch') &&
      this.booleanOperatorChoices.every((choice) => choice.value !== fieldFilter.operator)
    ) {
      fieldFilter.operator = this.booleanOperatorChoices[0].value
    }

    this.onOperatorChange(fieldFilter, true)
  }

  onOperatorChange(fieldFilter: ExtendedFilter, resetValue: boolean = false): void {
    if (
      (fieldFilter.field.type === 'buttons' ||
        fieldFilter.field.type === 'editor' ||
        fieldFilter.field.type === 'icon' ||
        fieldFilter.field.type === 'select' ||
        fieldFilter.field.type === 'text' ||
        fieldFilter.field.type === 'textArea' ||
        fieldFilter.field.type === 'url') &&
      (fieldFilter.operator === '$eq' ||
        fieldFilter.operator === '$eqi' ||
        fieldFilter.operator === '$ne' ||
        fieldFilter.operator === '$startsWith' ||
        fieldFilter.operator === '$endsWith' ||
        fieldFilter.operator === '$contains') &&
      (typeof fieldFilter.value !== 'string' || resetValue)
    ) {
      fieldFilter.value = ''
    } else if (
      (fieldFilter.field.type === 'file' ||
        fieldFilter.field.type === 'image' ||
        fieldFilter.field.type === 'number' ||
        fieldFilter.field.type === 'page' ||
        fieldFilter.field.type === 'post' ||
        fieldFilter.field.type === 'preset' ||
        fieldFilter.field.type === 'role' ||
        fieldFilter.field.type === 'slider' ||
        fieldFilter.field.type === 'user') &&
      (fieldFilter.operator === '$eq' ||
        fieldFilter.operator === '$ne' ||
        fieldFilter.operator === '$lt' ||
        fieldFilter.operator === '$lte' ||
        fieldFilter.operator === '$gt' ||
        fieldFilter.operator === '$gte') &&
      (typeof fieldFilter.value !== 'number' || resetValue)
    ) {
      if (resetValue) {
        fieldFilter.value = 0
      } else if (isNumeric(fieldFilter.value)) {
        fieldFilter.value = +fieldFilter.value
      } else {
        fieldFilter.value = 0
      }
    } else if (
      fieldFilter.field.type === 'date' &&
      (fieldFilter.operator === '$eq' ||
        fieldFilter.operator === '$ne' ||
        fieldFilter.operator === '$lt' ||
        fieldFilter.operator === '$lte' ||
        fieldFilter.operator === '$gt' ||
        fieldFilter.operator === '$gte') &&
      (typeof fieldFilter.value !== 'number' || resetValue)
    ) {
      if (resetValue) {
        const now = dayjsUTC()
        fieldFilter.value = now
          .subtract(now.get('hours'), 'hours')
          .subtract(now.get('minutes'), 'minutes')
          .subtract(now.get('seconds'), 'seconds')
          .subtract(now.get('milliseconds'), 'milliseconds')
          .toDate()
          .getTime()
      } else if (isNumeric(fieldFilter.value)) {
        fieldFilter.value = +fieldFilter.value
      } else {
        fieldFilter.value = null
      }
    } else if (
      fieldFilter.field.type === 'dateTime' &&
      (fieldFilter.operator === '$eq' ||
        fieldFilter.operator === '$ne' ||
        fieldFilter.operator === '$lt' ||
        fieldFilter.operator === '$lte' ||
        fieldFilter.operator === '$gt' ||
        fieldFilter.operator === '$gte') &&
      (typeof fieldFilter.value !== 'number' || resetValue)
    ) {
      if (resetValue) {
        const now = dayjs()
        fieldFilter.value = fieldFilter.field.utc
          ? now
              .subtract(now.utcOffset() * 60000)
              .toDate()
              .getTime()
          : now.toDate().getTime()
      } else if (isNumeric(fieldFilter.value)) {
        fieldFilter.value = +fieldFilter.value
      } else {
        fieldFilter.value = null
      }
    } else if (
      fieldFilter.field.type === 'time' &&
      (fieldFilter.operator === '$eq' ||
        fieldFilter.operator === '$ne' ||
        fieldFilter.operator === '$lt' ||
        fieldFilter.operator === '$lte' ||
        fieldFilter.operator === '$gt' ||
        fieldFilter.operator === '$gte') &&
      (typeof fieldFilter.value !== 'number' || resetValue)
    ) {
      if (resetValue) {
        const now = new Date()
        fieldFilter.value =
          (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 +
          now.getMilliseconds()
      } else if (isNumeric(fieldFilter.value)) {
        fieldFilter.value = +fieldFilter.value
      } else {
        fieldFilter.value = null
      }
    } else if (
      (fieldFilter.field.type === 'checkbox' || fieldFilter.field.type === 'switch') &&
      fieldFilter.operator === '$eq' &&
      (typeof fieldFilter.value !== 'boolean' || resetValue)
    ) {
      fieldFilter.value = false
    }
  }

  getSuggestions(field: string, keywords: string, nextPage?: 'nextPage'): void {
    if (nextPage) {
      this.suggestionsPage++
    } else {
      this.suggestions = []
      this.suggestionsPage = 1
      this.suggestionsLastPage = Infinity
    }

    if (this.suggestionsPage < this.suggestionsLastPage) {
      const counter = ++this.suggestionCounter
      const observable =
        this.subject === 'pages'
          ? this.api.getPageChoices(field, keywords, this.suggestionsPage)
          : this.subject === 'presets'
          ? this.api.getPresetChoices(field, keywords, this.suggestionsPage)
          : this.subject === 'uploads'
          ? this.api.getUploadChoices(field, keywords, this.suggestionsPage)
          : this.subject === 'collections'
          ? this.api.getPostChoices(this.collection, field, keywords, this.suggestionsPage)
          : this.subject === 'roles'
          ? this.api.getRoleChoices(field, keywords, this.suggestionsPage)
          : this.api.getUserChoices(field, keywords, this.suggestionsPage)

      observable.subscribe((response) => {
        this.suggestionsLastPage = response.meta.lastPage

        if (counter === this.suggestionCounter) {
          this.suggestions = [
            ...this.suggestions,
            ...response.data.map((value) => ({ label: value, value })),
          ]
        }
      })
    }
  }
}
