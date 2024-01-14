import { ref, type Ref } from '#imports'
import {
  primaryLanguage,
  type CastedFieldType,
  type CollectionName,
  type Field,
  type SupportedLanguage,
} from '#pruvious'
import type { ResolvedCollectionDefinition } from '../../collections/collection.definition'
import { navigateToPruviousDashboardPath } from '../../composables/dashboard/dashboard'
import { uniqueArray } from '../array'
import { pruviousFetch } from '../fetch'
import { Filter } from './filter'
import type { RecordSelection } from './record-selection'

export class CollectionOverview<T extends CollectionName> {
  data: Ref<(CastedFieldType[T] & { id: number })[]> = ref([])

  hasDefaultColumns: Ref<boolean> = ref(true)

  total: Ref<number> = ref(0)

  currentPage: Ref<number> = ref(1)

  lastPage: Ref<number> = ref(1)

  loaded: Ref<boolean> = ref(false)

  private prevQuery: string = ''

  private defaultFilter: Filter = new Filter()

  constructor(
    private collection: Pick<ResolvedCollectionDefinition, 'name' | 'translatable'> & {
      dashboard: Omit<ResolvedCollectionDefinition['dashboard'], 'icon'>
      fields: Record<string, Pick<Field, 'options' | 'type'>>
    },
    public filter: Filter,
    public selection: RecordSelection,
    private language: SupportedLanguage,
  ) {
    if (collection.translatable) {
      this.filter.setDefaultLanguage(this.language)
    }

    this.prevQuery = this.filter.toString()
    this.defaultFilter
      .setDefaultLanguage(collection.translatable ? this.language : null)
      .select(this.collection.dashboard.overviewTable.columns.map(({ field }) => field))
      .order(
        `${this.collection.dashboard.overviewTable.sort.field}:${this.collection.dashboard.overviewTable.sort.direction}`,
      )
      .perPage(this.collection.dashboard.overviewTable.perPage)
      .page(1)

    if (
      (collection.translatable && this.prevQuery === `where=language[=][${this.language}]`) ||
      (!collection.translatable && !this.prevQuery)
    ) {
      this.filter.fromString(this.defaultFilter.toString())
    }

    this.refresh()
  }

  updateDefaultLanguage(language: SupportedLanguage) {
    this.language = language
    this.defaultFilter.setDefaultLanguage(language, true)
    this.filter.setDefaultLanguage(language, true)
    this.selection.deselectAll()
    this.refresh()
  }

  async fetchData() {
    this.loaded.value = false

    const query = this.filter.selectOption.value.includes('id')
      ? this.filter.toString()
      : this.filter
          .clone()
          .select(['id', ...this.filter.selectOption.value])
          .toString()
    const response = await pruviousFetch<{
      records: (CastedFieldType[T] & { id: number })[]
      total: number
      lastPage: number
      currentPage: number
    }>(`collections/${this.collection.name}?${query}`)

    if (response.success) {
      this.currentPage.value = response.data.currentPage
      this.data.value = response.data.records
      this.lastPage.value = response.data.lastPage
      this.selection.setData(response.data.records).setTotal(response.data.total)
      this.total.value = response.data.total
    }

    this.loaded.value = true
  }

  async updateLocation() {
    const query = this.filter.toString()

    if (this.prevQuery !== this.filter.toString()) {
      this.prevQuery = query
      this.selection.deselectAll()

      await navigateToPruviousDashboardPath(
        `/collections/${this.collection.name}` +
          (query && query !== this.defaultFilter.toString()
            ? `?${query}`
            : this.language !== primaryLanguage
            ? `?where=language[=][${this.language}]`
            : ''),
      )
    }
  }

  setFilterFromQueryString(queryString: string) {
    this.filter.fromString(queryString)

    if (!this.filter.selectOption.value.length) {
      this.filter.select(this.collection.dashboard.overviewTable.columns.map(({ field }) => field))
    }

    if (!this.filter.orderOption.value.length) {
      this.filter.order(
        `${this.collection.dashboard.overviewTable.sort.field}:${this.collection.dashboard.overviewTable.sort.direction}`,
      )
    }

    if (!this.filter.perPageOption.value) {
      this.filter.perPage(this.collection.dashboard.overviewTable.perPage)
    }

    if (!this.filter.pageOption.value) {
      this.filter.page(1)
    }

    this.refresh()
  }

  clearFilters() {
    this.filter.fromString(this.defaultFilter.toString())
    this.refresh()
  }

  private refresh() {
    this.hasDefaultColumns.value =
      uniqueArray(this.filter.selectOption.value).sort().join(',') ===
      uniqueArray(this.defaultFilter.selectOption.value).sort().join(',')
  }
}
