import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core'
import {
  BlockRecord,
  ConditionalLogic,
  Field,
  FieldGroup,
  flattenFields,
  getDefaultFieldValue,
} from '@pruvious/shared'
import { uppercaseFirstLetter } from '@pruvious/utils'
import { SortableOptions } from 'sortablejs'
import { ClickService } from 'src/app/services/click.service'
import { DragImageService } from 'src/app/services/drag-image.service'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-repeater',
  templateUrl: './repeater.component.html',
})
export class RepeaterComponent {
  @Input()
  value!: Record<string, any>[]

  @Output()
  valueChange: EventEmitter<any[]> = new EventEmitter()

  @Output()
  edited: EventEmitter<Record<string, any>[]> = new EventEmitter()

  @Input()
  fields!: (Field | FieldGroup)[]

  @Input()
  validator!: Validator

  @Input()
  conditionalLogic!: ConditionalLogic

  @Input()
  compact: boolean = false

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  key: string = ''

  @Input()
  name: string = ''

  @Input()
  itemLabel?: string

  @Input()
  min?: number

  @Input()
  max?: number

  @Input()
  blocks?: BlockRecord[]

  @Input()
  allowedBlocks?: string[]

  @Input()
  rootBlocks?: string[]

  @Output()
  sort = new EventEmitter<void>()

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  confirm?: string

  sortableOptions: SortableOptions = {
    handle: '.sortable-handle',
    onUpdate: () => {
      const original = [...this.value]
      this.containerEl.nativeElement.style.height = `${this.containerEl.nativeElement.offsetHeight}px`
      this.value = []

      setTimeout(() => {
        this.value = original
        this.containerEl.nativeElement.removeAttribute('style')
        this.valueChange.emit(this.value)
        this.edited.emit(this.value)
        this.sort.emit()
      })
    },
    setData: (dataTransfer, el) => {
      this.dragImage.label = uppercaseFirstLetter(
        (this.itemLabel || 'item') + ' ' + el.dataset['index'],
      )
      dataTransfer.setDragImage(this.dragImage.element!, -16, 10)
      dataTransfer.effectAllowed = 'move'
    },
  }

  constructor(protected click: ClickService, protected dragImage: DragImageService) {}

  addItem(index?: number): void {
    const newItem: Record<string, any> = {}

    for (const field of flattenFields(this.fields)) {
      newItem[field.name] = getDefaultFieldValue(field)
    }

    if (index === undefined) {
      this.value.push(newItem)
    } else {
      this.value.splice(index, 0, newItem)
    }

    this.valueChange.emit(this.value)
    this.edited.emit(this.value)
  }

  duplicateItem(index: number): void {
    this.value.splice(index + 1, 0, JSON.parse(JSON.stringify(this.value[index])))
    this.valueChange.emit(this.value)
    this.edited.emit(this.value)
  }

  moveItem(index: number, offset: number): void {
    const item = this.value[index]
    this.value[index] = this.value[index + offset]
    this.value[index + offset] = item
    this.valueChange.emit(this.value)
    this.edited.emit(this.value)
  }

  deleteItem(index: number, event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-repeater-item-')) {
      event.stopPropagation()

      this.confirm = `delete-repeater-item-${this.name}.${index}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
          this.value.splice(index, 1)
          this.valueChange.emit(this.value)
          this.edited.emit(this.value)
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }
}
