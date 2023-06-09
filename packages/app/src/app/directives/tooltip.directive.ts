import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core'
import { fromEvent, Observable, Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import tippy, { Instance, Props } from 'tippy.js'

@Directive({
  selector: '[tooltip]',
})
export class TooltipDirective implements OnInit, OnChanges, OnDestroy {
  @Input()
  tooltipPlacement: Props['placement'] = 'top'

  @Input()
  tooltipOffset: Props['offset'] = [0, 10]

  @Input()
  tooltipMaxWidth: Props['maxWidth'] = 320

  @Input()
  tooltipShowOnCreate: Props['showOnCreate'] = false

  @Input()
  tooltipShowOnUpdate: boolean = false

  @Input()
  tooltipArrow: boolean = true

  @Input()
  tooltipHighlightApostrophes: boolean = false

  @Input()
  tooltipShow?: Observable<void>

  @Input()
  tooltipHide?: Observable<void>

  @Input()
  get tooltip() {
    return this._tooltip
  }
  set tooltip(value: string | undefined) {
    this._tooltip =
      value
        ?.replace(
          /\*\*([^*]*(?:\*(?!\*)[^*]*)*)\*\*/g,
          '<strong class="text-primary-200">$1</strong>',
        )
        .replace(
          /\!\!([^!]*(?:\!(?!\!)[^!]*)*)\!\!/g,
          '<strong class="text-amber-400">$1</strong>',
        ) ?? ''

    setTimeout(() => {
      if (this.tooltipHighlightApostrophes) {
        this.tooltip = this.tooltip?.replace(
          /'(.*?)'/g,
          '<strong class="text-primary-200">$1</strong>',
        )
      }

      this.refresh()
    })
  }
  protected _tooltip?: string

  protected tippyInstance: Instance<Props> | null = null

  protected unsubscribeAll$: Subject<void> = new Subject()

  constructor(protected elementRef: ElementRef) {}

  ngOnInit(): void {
    this.refresh()

    this.tooltipShow
      ?.pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(() => this.tippyInstance?.show())

    this.tooltipHide
      ?.pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(() => this.tippyInstance?.hide())

    fromEvent(this.elementRef.nativeElement, 'click')
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(() => this.tippyInstance?.hide())
  }

  protected refresh(): void {
    const el = this.elementRef.nativeElement as HTMLElement

    if (this.tooltip) {
      el.setAttribute('aria-label', this.tooltip)
    } else {
      el.removeAttribute('aria-label')
    }

    if (this.tooltip && !this.tippyInstance) {
      this.tippyInstance = tippy(el, {
        allowHTML: true,
        animation: false,
        arrow: this.tooltipArrow,
        content: this.tooltip,
        hideOnClick: true,
        maxWidth: this.tooltipMaxWidth,
        offset: this.tooltipOffset,
        placement: this.tooltipPlacement,
        showOnCreate: this.tooltipShowOnCreate,
        zIndex: 99999,
      })
    } else if (this.tooltip && this.tippyInstance) {
      this.tippyInstance.setContent(this.tooltip)

      if (this.tooltipShowOnUpdate) {
        this.tippyInstance.show()
      }
    } else if (this.tippyInstance) {
      this.destroyTippy()
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tooltip'] && !changes['tooltip'].firstChange) {
      this.refresh()
    }
  }

  ngOnDestroy(): void {
    this.destroyTippy()
    this.unsubscribeAll$.next()
    this.unsubscribeAll$.complete()
  }

  protected destroyTippy(): void {
    if (this.tippyInstance) {
      this.tippyInstance.destroy()
      this.tippyInstance = null
    }
  }
}
