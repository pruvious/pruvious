import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import {
  BlockRecord,
  ConditionalLogic,
  ExtendedTabbedFieldLayout,
  flattenFields,
} from '@pruvious/shared'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
})
export class TabsComponent extends BaseComponent implements OnInit {
  @Input()
  tabs!: ExtendedTabbedFieldLayout['tabs']

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

  @Output()
  changed: EventEmitter<any> = new EventEmitter()

  @Output()
  edited: EventEmitter<any> = new EventEmitter()

  @Input()
  blocks?: BlockRecord[]

  @Input()
  allowedBlocks?: string[]

  @Input()
  rootBlocks?: string[]

  idMap: Record<number, string[]> = {}

  errors: Record<number, number> = {}

  activeTab: number = 0

  ngOnInit(): void {
    for (const [i, tab] of this.tabs.entries()) {
      for (const field of flattenFields(
        tab.fields.filter((field) => field.type !== 'redirectionTest') as any,
      )) {
        if (!this.idMap[i]) {
          this.idMap[i] = []
        }

        this.idMap[i].push(this.idPrefix + field.name)
      }
    }

    this.validator.update$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => this.refresh())

    this.refresh()
  }

  protected refresh(): void {
    const errorIds = Object.keys(this.validator.errors)

    for (const [i, ids] of Object.entries(this.idMap)) {
      let count: number = 0

      for (const errorId of errorIds) {
        if (ids.some((id) => errorId === id || errorId.startsWith(`${id}.`))) {
          count++
        }
      }

      this.errors[+i] = count
    }
  }
}
