import { Injectable } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { first } from 'rxjs/operators'

export interface Dialog {
  title?: string
  message: string
  buttons: DialogButton[]
}

export interface DialogButton {
  label: string
  value: any
  color?: 'white'
}

@Injectable()
export class DialogService {
  protected data = new BehaviorSubject<Dialog | null>(null)

  protected action = new Subject<any>()

  get data$(): Observable<Dialog | null> {
    return this.data.asObservable()
  }

  constructor(protected router: Router) {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd && this.isActive()) {
        this.onAction(null)
      }
    })
  }

  isActive(): boolean {
    return !!this.data.getValue()
  }

  open(data: Dialog): Observable<any> {
    this.data.next(data)
    return this.action.asObservable().pipe(first())
  }

  onAction(value: any): void {
    this.data.next(null)
    this.action.next(value)
  }
}
