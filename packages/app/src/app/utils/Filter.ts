import {
  AndFilter,
  Choice,
  Filter as FilterType,
  getFieldValueType,
  getFilterableFields,
  OrFilter,
  QueryableField,
  QueryStringParameters,
} from '@pruvious-test/shared'
import { last } from '@pruvious-test/utils'
import { Observable, Subject } from 'rxjs'

export interface ExtendedFilter {
  relation: '$and' | '$or'
  field: QueryableField
  operator:
    | '$eq'
    | '$eqi'
    | '$ne'
    | '$lt'
    | '$lte'
    | '$gt'
    | '$gte'
    | '$in'
    | '$notIn'
    | '$null'
    | '$notNull'
    | '$between'
    | '$startsWith'
    | '$endsWith'
    | '$contains'
  value: any
}

export interface FilterChoices {
  field: string
  choices: Choice[]
}

export class Filter {
  isActive: boolean = false

  search?: string

  fieldFilters: ExtendedFilter[] = []

  protected _fieldFilters: ExtendedFilter[] = []

  get update$(): Observable<void> {
    return this._update$.asObservable()
  }
  protected _update$ = new Subject<void>()

  filterableFields: QueryableField[] = []

  constructor(protected fields: QueryableField[]) {
    this.filterableFields = getFilterableFields(...fields).filter(
      (field) => field.name !== 'language',
    )
  }

  start() {
    this.fieldFilters = this._fieldFilters.map((_fieldFilter) => ({ ..._fieldFilter }))
  }

  apply(): boolean {
    let changed: boolean = false

    if (JSON.stringify(this._fieldFilters) !== JSON.stringify(this.fieldFilters)) {
      this._fieldFilters = [...this.fieldFilters]
      changed = true
    }

    this.isActive = this._fieldFilters.length > 0 || !!this.search

    if (changed) {
      this._update$.next()
    }

    return changed
  }

  clear(): boolean {
    if (this._fieldFilters.length) {
      this._fieldFilters = []
      this.isActive = false
      this._update$.next()
      return true
    }

    return false
  }

  fromQueryParams(params: QueryStringParameters): boolean {
    this.fieldFilters = params.filters ? this.parseFilterParams(params.filters as any) : []
    this.search = params.search
    return this.apply()
  }

  protected parseFilterParams(
    params: Record<string, FilterType> | AndFilter | OrFilter,
  ): ExtendedFilter[] {
    const fieldFilters: ExtendedFilter[] = []

    Object.entries(params).forEach(([key, value]: any) => {
      if (key === '$and' || key === '$or') {
        value.forEach((filter: Record<string, FilterType>) => {
          const copy = JSON.parse(JSON.stringify(filter))
          const children = this.parseFilterParams(copy)

          if (children.length) {
            children[0].relation = key
            fieldFilters.push(...children)
          }
        })
      } else {
        const field = this.filterableFields.find((field) => field.name === key)
        const operator: any = Object.keys(value)[0]

        if (field) {
          const fieldValueType = getFieldValueType(field)

          fieldFilters.push({
            relation: '$and',
            field,
            operator,
            value:
              fieldValueType === 'boolean'
                ? value[operator] === 'false' || value[operator] === '0'
                  ? false
                  : true
                : fieldValueType === 'number'
                ? +value[operator]
                : value[operator],
          })
        }
      }
    })

    return fieldFilters
  }

  toQueryParams(): QueryStringParameters {
    const params: any = {}
    const groups: ExtendedFilter[][] = []

    if (this._fieldFilters.length === 1) {
      params.filters = {}
      params.filters[this._fieldFilters[0].field.name] = {}
      params.filters[this._fieldFilters[0].field.name][this._fieldFilters[0].operator] =
        this._fieldFilters[0].value
    } else if (this._fieldFilters.length > 1) {
      params.filters = {}

      this._fieldFilters.forEach((fieldFilter, i) => {
        if (fieldFilter.relation === '$or' || i === 0) {
          groups.push([])
        }

        last(groups).push(fieldFilter)
      })

      groups.forEach((group) => {
        const $and: Record<string, FilterType>[] = []

        group.forEach((fieldFilter) => {
          const item: Record<string, FilterType> = {}
          const filter: any = {}

          filter[fieldFilter.operator] =
            fieldFilter.operator === '$null' || fieldFilter.operator === '$notNull'
              ? 'true'
              : fieldFilter.value
          item[fieldFilter.field.name] = filter

          $and.push(item)
        })
      })

      if (groups.length === 1) {
        const hasDuplicates = groups[0].some((fieldFilter, i) => {
          return groups[0].some((_fieldFilter, _i) => {
            return i !== _i && fieldFilter.field.name === _fieldFilter.field.name
          })
        })

        if (hasDuplicates) {
          params.filters.$and = groups[0].map((fieldFilter) => {
            const filter: any = {}
            filter[fieldFilter.field.name] = {}
            filter[fieldFilter.field.name][fieldFilter.operator] = fieldFilter.value
            return filter
          })
        } else {
          groups[0].forEach((fieldFilter) => {
            params.filters[fieldFilter.field.name] = {}
            params.filters[fieldFilter.field.name][fieldFilter.operator] = fieldFilter.value
          })
        }
      } else if (groups.length > 1) {
        params.filters.$or = []

        groups.forEach((group) => {
          const hasDuplicates = group.some((fieldFilter, i) => {
            return group.some((_fieldFilter, _i) => {
              return i !== _i && fieldFilter.field.name === _fieldFilter.field.name
            })
          })

          if (hasDuplicates) {
            const $and: any = { $and: [] }

            group.forEach((fieldFilter) => {
              const filter: any = {}
              filter[fieldFilter.field.name] = {}
              filter[fieldFilter.field.name][fieldFilter.operator] = fieldFilter.value
              $and.$and.push(filter)
            })

            params.filters.$or.push($and)
          } else {
            const $and: any = {}

            group.forEach((fieldFilter) => {
              $and[fieldFilter.field.name] = {}
              $and[fieldFilter.field.name][fieldFilter.operator] = fieldFilter.value
            })

            params.filters.$or.push($and)
          }
        })
      }
    }

    if (this.search) {
      params.search = this.search
    }

    return params
  }
}
