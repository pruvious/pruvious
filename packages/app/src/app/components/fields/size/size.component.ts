import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Icon, Size } from '@pruvious/shared'
import { camelToLabel, clearObject } from '@pruvious/utils'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-size',
  templateUrl: './size.component.html',
})
export class SizeComponent implements OnChanges {
  @Input()
  value!: Record<string, Size>

  @Output()
  valueChange: EventEmitter<Record<string, Size>> = new EventEmitter()

  @Output()
  edited: EventEmitter<Record<string, Size>> = new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  names!: string[]

  @Input()
  units!: string[]

  @Input()
  inputLabels?: Partial<Record<string, string>>

  @Input()
  inputIcons?: Partial<Record<string, Icon>>

  @Input()
  syncable: boolean = false

  @Input()
  placeholder?: string | Partial<Record<string, string>>

  @Input()
  required: boolean = false

  @Input()
  min: number | Partial<Record<string, number>> | null = null

  @Input()
  max: number | Partial<Record<string, number>> | null = null

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

  sync: boolean = false

  autoInputLabels: Partial<Record<string, string>> = {}

  inputMin: Partial<Record<string, number | null>> = {}

  inputMax: Partial<Record<string, number | null>> = {}

  inputPlaceholder: Partial<Record<string, string>> = {}

  labelHovered: boolean = false

  constructor(protected idService: IdService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['value'] ||
      changes['name'] ||
      changes['units'] ||
      changes['min'] ||
      changes['max'] ||
      changes['placeholder']
    ) {
      const _value = JSON.stringify(this.value)

      if (!this.value) {
        this.value = {}
      }

      for (const name of Object.keys(this.value)) {
        if (!this.names.includes(name)) {
          delete this.value[name]
        }
      }

      clearObject(this.autoInputLabels)
      clearObject(this.inputMin)
      clearObject(this.inputMax)
      clearObject(this.inputPlaceholder)

      for (const name of this.names) {
        if (!this.value[name]) {
          this.value[name] = { value: 0 }
        }

        this.autoInputLabels[name] = camelToLabel(name)
        this.inputMin[name] =
          typeof this.min === 'number'
            ? this.min
            : this.min && this.min[name]
            ? this.min[name]
            : null
        this.inputMax[name] =
          typeof this.max === 'number'
            ? this.max
            : this.max && this.max[name]
            ? this.max[name]
            : null
        this.inputPlaceholder[name] =
          typeof this.placeholder === 'string'
            ? this.placeholder
            : this.placeholder && this.placeholder[name]
            ? this.placeholder[name]
            : ''
      }

      if (this.units.length) {
        for (const name of this.names) {
          if (!this.value[name].unit || !this.units.includes(this.value[name].unit!)) {
            this.value[name].unit = this.units[0]
          }
        }
      } else {
        for (const name of this.names) {
          if (this.value[name].unit) {
            delete this.value[name].unit
          }
        }
      }

      if (JSON.stringify(this.value) !== _value) {
        this.valueChange.emit(this.value)
      }
    }
  }

  onKeyDown(name: string, event: KeyboardEvent): void {
    const prevValue = this.value[name].value

    if (event.key === 'ArrowUp' && event.shiftKey) {
      event.preventDefault()
      this.value[name].value =
        this.inputMax[name] !== null
          ? Math.min(this.inputMax[name]!, this.value[name].value + 10)
          : this.value[name].value + 10
    } else if (event.key === 'ArrowDown' && event.shiftKey) {
      event.preventDefault()
      this.value[name].value =
        this.inputMin[name] !== null
          ? Math.max(this.inputMin[name]!, this.value[name].value - 10)
          : this.value[name].value - 10
    }

    if (prevValue !== this.value[name].value) {
      this.syncValues(name)
      this.valueChange.emit(this.value)
      this.edited.emit(this.value)
    }
  }

  onChangeValue(name: string): void {
    this.syncValues(name)
    this.valueChange.emit(this.value)
  }

  onEditValue(name: string): void {
    this.syncValues(name)
    this.edited.emit(this.value)
  }

  onChangeUnit(name: string): void {
    this.syncValues(name)
    this.valueChange.emit(this.value)
    this.edited.emit(this.value)
  }

  protected syncValues(name: string): void {
    if (this.sync) {
      for (const size of Object.values(this.value)) {
        size.value = this.value[name].value
      }
    }
  }
}
