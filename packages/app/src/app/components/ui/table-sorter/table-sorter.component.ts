import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import {
  QueryStringParameters,
  QueryableField,
  getFieldValueType,
  isSortableField,
} from '@pruvious-test/shared'

@Component({
  selector: 'app-table-sorter',
  templateUrl: './table-sorter.component.html',
})
export class TableSorterComponent implements OnInit {
  @Input()
  field!: QueryableField

  @Input()
  params: QueryStringParameters = {}

  @Output()
  paramsChange = new EventEmitter<QueryStringParameters>()

  sortable: boolean = false

  fieldValueType?: 'string' | 'number' | 'boolean' | 'json'

  ngOnInit(): void {
    this.sortable = isSortableField(this.field)
    this.fieldValueType = getFieldValueType(this.field)
  }

  onClick(): void {
    this.params.page = 1

    if (this.params.sort && this.params.sort[0].field === this.field.name) {
      this.params.sort[0].direction = this.params.sort[0].direction === 'desc' ? 'asc' : 'desc'
    } else {
      this.params.sort = [{ field: this.field.name, direction: 'asc' }]
    }

    this.paramsChange.emit(this.params)
  }
}
