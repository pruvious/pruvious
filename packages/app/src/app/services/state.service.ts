import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

@Injectable()
export class StateService {
  popupsOpen: number = 0

  get sortableDisabled(): boolean {
    return this._sortableDisabled$.getValue()
  }
  set sortableDisabled(value: boolean) {
    this._sortableDisabled$.next(value)
  }

  get sortableDisabled$() {
    return this._sortableDisabled$.asObservable()
  }
  protected _sortableDisabled$ = new BehaviorSubject<boolean>(false)
}
