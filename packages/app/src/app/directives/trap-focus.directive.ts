import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core'
import * as focusTrap from 'focus-trap'

@Directive({
  selector: '[trapFocus]',
})
export class TrapFocusDirective implements AfterViewInit, OnDestroy {
  @Input()
  set trapFocus(value: boolean) {
    this._trapFocus = value
    this.resolve()
  }
  protected _trapFocus: boolean = true

  @Input()
  trapAutofocus: boolean = true

  protected instance: focusTrap.FocusTrap | undefined

  constructor(protected ref: ElementRef) {}

  ngAfterViewInit(): void {}

  protected resolve(): void {
    this.deactivate()

    if (this._trapFocus) {
      this.instance = focusTrap
        .createFocusTrap(this.ref.nativeElement, {
          allowOutsideClick: true,
          escapeDeactivates: false,
          fallbackFocus: document.body,
          returnFocusOnDeactivate: false,
          onPostActivate: () => {
            if (this.trapAutofocus) {
              setTimeout(() => {
                this.ref.nativeElement
                  .querySelector(
                    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-autofocus-ignore]), a:not([data-autofocus-ignore])',
                  )
                  ?.focus()
              }, 150)
            }
          },
        })
        .activate()
    }
  }

  protected deactivate(): void {
    this.instance?.deactivate()
    this.instance = undefined
  }

  ngOnDestroy(): void {
    this.deactivate()
  }
}
