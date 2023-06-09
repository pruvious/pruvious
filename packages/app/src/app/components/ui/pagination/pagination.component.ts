import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Router } from '@angular/router'
import { clearArray } from '@pruvious/utils'
import { BaseComponent } from 'src/app/components/base.component'
import { Index } from 'src/app/services/api.service'

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
})
export class PaginationComponent extends BaseComponent implements OnChanges {
  @Input()
  items!: Index<Partial<any>>

  @Input()
  itemLabelSingularLowerCase: string = 'item'

  @Input()
  itemLabelPluralLowerCase: string = 'items'

  @Output()
  changePage = new EventEmitter<number>()

  pages: (number | '...')[] = []

  constructor(protected router: Router) {
    super()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.refresh()
    }
  }

  protected refresh(): void {
    clearArray(this.pages)

    for (
      let i = Math.max(1, this.items.meta.currentPage - 3);
      i <= Math.min(this.items.meta.lastPage, this.items.meta.currentPage + 3);
      i++
    ) {
      this.pages.push(i)
    }

    if (this.items.meta.lastPage > 0 && this.pages[0] !== 1) {
      if (this.items.meta.currentPage - 4 > 1) {
        this.pages.unshift('...')
      }

      this.pages.unshift(1)
    }

    if (
      this.items.meta.lastPage > 1 &&
      this.pages[this.pages.length - 1] !== this.items.meta.lastPage
    ) {
      if (this.items.meta.currentPage + 4 < this.items.meta.lastPage) {
        this.pages.push('...')
      }

      this.pages.push(this.items.meta.lastPage)
    }
  }
}
