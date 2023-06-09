import { Component, HostListener, OnInit } from '@angular/core'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { Dialog, DialogService } from 'src/app/services/dialog.service'

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
})
export class DialogComponent extends BaseComponent implements OnInit {
  visible: boolean = false

  message: string = ''

  data: Dialog | null = null

  protected timeout?: NodeJS.Timeout

  constructor(private dialog: DialogService) {
    super()

    this.visible = false
  }

  ngOnInit(): void {
    this.dialog.data$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((data) => {
      clearTimeout(this.timeout)

      this.visible = !!data

      if (data) {
        this.data = data
      } else {
        this.timeout = setTimeout(() => {
          this.data = data
        }, 400)
      }
    })
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.onAction(null)
    }
  }

  onAction(value: any): void {
    this.dialog.onAction(value)
  }
}
