import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'

@Injectable()
export class LoadingService {
  protected loaders: { [id: string]: BehaviorSubject<number> } = {}

  listen(id: string): Observable<number> {
    return this.maybeCreate(id).asObservable()
  }

  add(id: string): void {
    this.maybeCreate(id).next(this.loaders[id].getValue() + 1)
  }

  remove(id: string): void {
    this.maybeCreate(id).next(this.loaders[id].getValue() - 1)
  }

  protected maybeCreate(id: string): BehaviorSubject<number> {
    if (!this.loaders[id]) {
      this.loaders[id] = new BehaviorSubject(0)
    }

    return this.loaders[id]
  }
}
