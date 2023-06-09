import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core'
import { BaseComponent } from 'src/app/components/base.component'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { cmdPlus } from 'src/app/utils/hotkeys'

@Component({
  selector: 'app-popup',
  templateUrl: './popup.component.html',
  styles: [':host > div { transition-property: opacity, visibility }'],
})
export class PopupComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @Input()
  get visible(): boolean {
    return this._visible
  }
  set visible(value: boolean) {
    if (value !== this._visible) {
      this._visible = value
      this.state.popupsOpen += value ? 1 : -1
    }
  }
  protected _visible: boolean = false

  @Output()
  visibleChange = new EventEmitter<boolean>()

  @Input()
  width: string = '64rem'

  @Input()
  hotkeys: boolean = true

  @Input()
  autofocus: boolean = true

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  initialized: boolean = false

  constructor(protected state: StateService) {
    super()
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initialized = true
    })
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.visible && this.hotkeys) {
      if (cmdPlus('s', event)) {
        event.preventDefault()
        event.stopPropagation()

        blur()

        const saveButton: HTMLButtonElement | null =
          this.containerEl.nativeElement.querySelector('button[data-save]')

        if (saveButton) {
          saveButton.click()
        }
      } else if (event.code === 'Escape') {
        event.preventDefault()
        this.close()
      }
    }
  }

  close(): void {
    this.visible = false
    this.visibleChange.emit(this.visible)
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy()

    if (this.visible) {
      this.visible = false
    }
  }
}
