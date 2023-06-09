import { Component, EventEmitter, Input, Output } from '@angular/core'
import { QueryableField } from '@pruvious/shared'
import { ClickService } from 'src/app/services/click.service'

@Component({
  selector: 'app-table-cell',
  templateUrl: './table-cell.component.html',
})
export class TableCellComponent {
  @Input()
  id!: number

  @Input()
  field!: QueryableField

  @Input()
  value!: any

  @Input()
  index!: number

  @Input()
  fieldCount!: number

  @Input()
  canUpdate: boolean = false

  @Input()
  canDuplicate: boolean = false

  @Input()
  canPreview: boolean = false

  @Input()
  canDelete: boolean = false

  @Input()
  data: Record<string, any> = {}

  @Input()
  cache: Record<string, any> = {}

  @Output()
  duplicate = new EventEmitter<number>()

  @Output()
  preview = new EventEmitter<number>()

  @Output()
  delete = new EventEmitter<number>()

  confirm?: string

  constructor(protected click: ClickService) {}

  onDelete(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-row-')) {
      event.stopPropagation()

      this.confirm = `delete-row-${this.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
          this.delete.emit(this.id)
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }
}
