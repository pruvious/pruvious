import {
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Renderer2,
  SimpleChange,
} from '@angular/core'
import { Subscription } from 'rxjs'
import Sortable, { SortableOptions } from 'sortablejs'
import { StateService } from 'src/app/services/state.service'
import { SORTABLE_GLOBALS } from './globals'
import { SortableBindings } from './sortable-bindings'
import { SortableService } from './sortable.service'

export type SortableData = any | any[]

interface SortableEvent {
  oldIndex: number
  newIndex: number
  oldDraggableIndex?: number
  newDraggableIndex?: number
  item: HTMLElement
  clone: HTMLElement
}

const getIndexesFromEvent = (event: SortableEvent) => {
  if (event.hasOwnProperty('newDraggableIndex') && event.hasOwnProperty('oldDraggableIndex')) {
    return {
      new: event.newDraggableIndex,
      old: event.oldDraggableIndex,
    }
  } else {
    return {
      new: event.newIndex,
      old: event.oldIndex,
    }
  }
}

@Directive({
  selector: '[sortable]',
})
export class SortableDirective implements OnInit, OnChanges, OnDestroy {
  @Input()
  sortable: SortableData

  @Input()
  sortableContainer!: string

  @Input()
  get sortableOptions() {
    return this._sortableOptions
  }
  set sortableOptions(value: SortableOptions) {
    this._sortableOptions = {
      animation: 0,
      delay: 250,
      delayOnTouchOnly: true,
      direction: 'vertical',
      fallbackOnBody: true,
      invertSwap: true,
      swapThreshold: 0.65,
      onStart: () => {
        this.sorting = true
        document.body.classList.add('sorting')
      },
      onEnd: () => {
        this.sorting = false
        document.body.classList.remove('sorting')
      },
      ...value,
    }
  }
  _sortableOptions!: SortableOptions

  @Input()
  set sortableGroup(value: string) {
    if (this.sortableInstance) {
      this.sortableInstance.option('group', value)
    }
  }

  @Input()
  sortableCloneFunction!: (item: any) => any

  @Output() sortableInit = new EventEmitter()

  protected sortableInstance: any

  protected sortableDisabled$?: Subscription

  protected prevSortDisabledValue?: boolean

  protected sorting: boolean = false

  constructor(
    @Optional() @Inject(SORTABLE_GLOBALS) protected globalConfig: SortableOptions,
    protected element: ElementRef,
    protected renderer: Renderer2,
    protected service: SortableService,
    protected state: StateService,
    protected zone: NgZone,
  ) {}

  ngOnInit() {
    this.create()

    this.sortableDisabled$ = this.state.sortableDisabled$.subscribe((disabled) => {
      if (this.sortableInstance) {
        if (disabled) {
          this.prevSortDisabledValue = this.sortableInstance.option('disabled')
          this.sortableInstance.option('disabled', true)
        } else if (this.prevSortDisabledValue !== undefined) {
          this.sortableInstance.option('disabled', this.prevSortDisabledValue)
        }
      }
    })
  }

  ngOnChanges(changes: { [prop in keyof SortableDirective]: SimpleChange }) {
    const optionsChange: SimpleChange = changes.sortableOptions

    if (optionsChange && !optionsChange.isFirstChange()) {
      const previousOptions: any = optionsChange.previousValue
      const currentOptions: any = optionsChange.currentValue

      Object.keys(currentOptions).forEach((optionName) => {
        if (currentOptions[optionName] !== previousOptions[optionName]) {
          this.sortableInstance.option(optionName, (this.options as any)[optionName])
        }
      })
    }
  }

  ngOnDestroy() {
    if (this.sortableInstance) {
      try {
        this.sortableInstance.destroy()

        if (this.sorting) {
          document.body.classList.remove('sorting')
        }
      } catch (_) {}
    }

    this.sortableDisabled$?.unsubscribe()
  }

  protected create() {
    const container = this.sortableContainer
      ? this.element.nativeElement.querySelector(this.sortableContainer)
      : this.element.nativeElement

    setTimeout(() => {
      this.zone.runOutsideAngular(() => {
        this.sortableInstance = Sortable.create(container, this.options)
        this.sortableInit.emit(this.sortableInstance)
      })
    }, 0)
  }

  protected getBindings(): SortableBindings {
    if (!this.sortable) {
      return new SortableBindings([])
    } else if (this.sortable instanceof SortableBindings) {
      return this.sortable
    } else {
      return new SortableBindings([this.sortable])
    }
  }

  protected get options() {
    return { ...this.optionsWithoutEvents, ...this.overridenOptions }
  }

  protected get optionsWithoutEvents() {
    return { ...(this.globalConfig || {}), ...(this.sortableOptions || {}) }
  }

  protected proxyEvent(eventName: string, ...params: any[]) {
    this.zone.run(() => {
      if (this.optionsWithoutEvents && (this.optionsWithoutEvents as any)[eventName]) {
        ;(this.optionsWithoutEvents as any)[eventName](...params)
      }
    })
  }

  protected get isCloning() {
    return (
      this.sortableInstance.options.group.checkPull(
        this.sortableInstance,
        this.sortableInstance,
      ) === 'clone'
    )
  }

  protected clone<T>(item: T): T {
    return (this.sortableCloneFunction || ((subitem) => subitem))(item)
  }

  protected get overridenOptions(): any {
    return {
      onAdd: (event: SortableEvent) => {
        this.zone.run(() => {
          this.service.transfer = (items: any[]) => {
            this.getBindings().injectIntoEvery(event.newIndex, items)
            this.proxyEvent('onAdd', event)
          }

          this.proxyEvent('onAddOriginal', event)
        })
      },
      onRemove: (event: SortableEvent) => {
        this.zone.run(() => {
          const bindings = this.getBindings()

          if (bindings.provided) {
            if (this.isCloning) {
              this.service.transfer!(
                bindings.getFromEvery(event.oldIndex).map((item) => this.clone(item)),
              )

              this.renderer.removeChild(event.item.parentNode, event.item)
              this.renderer.insertBefore(event.clone.parentNode, event.item, event.clone)
              this.renderer.removeChild(event.clone.parentNode, event.clone)
            } else {
              this.service.transfer!(bindings.extractFromEvery(event.oldIndex))
            }

            this.service.transfer = null
          }

          this.proxyEvent('onRemove', event)
        })
      },
      onUpdate: (event: SortableEvent) => {
        this.zone.run(() => {
          const bindings = this.getBindings()
          const indexes = getIndexesFromEvent(event)

          bindings.injectIntoEvery(indexes.new!, bindings.extractFromEvery(indexes.old!))
          this.proxyEvent('onUpdate', event)
        })
      },
    }
  }
}
