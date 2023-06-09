import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import {
  BlockRecord,
  ConditionalLogic,
  ExtendedTabbedFieldLayout,
  Field,
  FieldGroup,
  RedirectionTestField,
} from '@pruvious/shared'
import { clearObject } from '@pruvious/utils'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-fields',
  templateUrl: './fields.component.html',
})
export class FieldsComponent implements OnChanges {
  @Input()
  fields!: (Field | FieldGroup | ExtendedTabbedFieldLayout | RedirectionTestField)[]

  @Input()
  records!: Record<string, any>

  @Input()
  validator!: Validator

  @Input()
  conditionalLogic!: ConditionalLogic

  @Input()
  disabled: boolean = false

  @Input()
  idPrefix: string = ''

  @Input()
  key: string = ''

  @Input()
  compact: boolean = false

  @Input()
  stacked: boolean = false

  @Input()
  tabbed: boolean = false

  @Input()
  get minFieldWidth(): string[] | null {
    return this._minFieldWidth
  }
  set minFieldWidth(value: string | string[] | null) {
    this._minFieldWidth =
      typeof value === 'string' ? Array.from({ length: 100 }, () => value) : value
  }
  protected _minFieldWidth: string[] | null = null

  @Input()
  stickyTopBorder: boolean = false

  @Input()
  blocks?: BlockRecord[]

  @Input()
  allowedBlocks?: string[]

  @Input()
  rootBlocks?: string[]

  @Output()
  changed = new EventEmitter<void>()

  @Output()
  edited = new EventEmitter<void>()

  readonly: Record<string, boolean> = {}

  editing: boolean =
    window.location.href.startsWith(document.baseURI + 'media') ||
    (!window.location.href.startsWith(document.baseURI + 'settings') &&
      !window.location.pathname.endsWith('/create'))

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      clearObject(this.readonly)

      if (this.editing) {
        for (const field of this.fields as any[]) {
          if (field.readonly && field.name) {
            this.readonly[field.name] = true
          }
        }
      }
    }
  }
}
