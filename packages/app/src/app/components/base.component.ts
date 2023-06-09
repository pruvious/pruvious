import { Component, OnDestroy } from '@angular/core'
import { Subject } from 'rxjs'

@Component({
  template: '',
})
export class BaseComponent implements OnDestroy {
  protected unsubscribeAll$: Subject<void> = new Subject()

  ngOnDestroy(): void {
    this.unsubscribeAll$.next()
    this.unsubscribeAll$.complete()
  }
}
