import { Injectable } from '@angular/core'
import { Bind } from '@pruvious-test/utils'
import { Subject } from 'rxjs'
import { IdService } from 'src/app/services/id.service'

@Injectable()
export class ClickService {
  protected listeners: { [id: string]: { target: Element; subject: Subject<void> } } = {}

  protected confirmation?: {
    target: Element
    id: string
    success: (event?: MouseEvent) => void
    fail: (event?: MouseEvent) => void
  }

  constructor(protected idService: IdService) {
    window.addEventListener('mousedown', this.onMouseDown, { capture: true })
  }

  confirm(
    target: Element,
    success: (event?: MouseEvent) => void,
    fail: (event?: MouseEvent) => void,
  ): void {
    const id = this.idService.generate('confirm-')
    this.confirmation = { target, id, success, fail }

    target.addEventListener(
      'mouseleave',
      () => {
        if (this.confirmation?.id === id) {
          this.confirmation.fail()
          this.confirmation = undefined
        }
      },
      { once: true },
    )
  }

  outside(id: string, target: Element): Subject<void> {
    const subject = new Subject<void>()
    this.listeners[id] = { target, subject }
    return subject
  }

  remove(id: string): void {
    this.listeners[id]?.subject.complete()
    delete this.listeners[id]
  }

  @Bind
  protected onMouseDown(event: MouseEvent): void {
    const listeners: { [id: string]: boolean } = Object.fromEntries(
      Object.keys(this.listeners).map((id) => [id, false]),
    )

    let target: any = event.target

    do {
      if (this.confirmation && this.confirmation.target === target) {
        this.confirmation.success(event)
      }

      Object.keys(this.listeners).forEach((id) => {
        if (
          this.listeners[id].target === target ||
          target?.hasAttribute('data-allow-outside-click')
        ) {
          listeners[id] = true
        }
      })

      target = target?.parentElement
    } while (target && target?.nodeName !== 'BODY')

    if (this.confirmation) {
      this.confirmation.fail(event)
      this.confirmation = undefined
    }

    for (const id of Object.keys(listeners).reverse()) {
      if (!listeners[id]) {
        this.listeners[id].subject.next()
        break
      }
    }
  }
}
