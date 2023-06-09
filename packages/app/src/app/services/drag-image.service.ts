import { Injectable } from '@angular/core'

@Injectable()
export class DragImageService {
  element: HTMLDivElement | undefined

  get label(): string {
    return this._label
  }
  set label(value: string) {
    this._label = value

    if (this.element) {
      document.getElementById('drag-image-label')!.textContent = value
    }
  }
  protected _label: string = ''
}
