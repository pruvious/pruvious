import { HttpErrorResponse } from '@angular/common/http'
import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { getPageLayoutChoices, getPageTypeChoices } from '@pruvious/shared'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { FilterChoices } from 'src/app/utils/Filter'

@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
})
export class PagesComponent extends BaseComponent {
  public customFilterChoices: FilterChoices[] = [
    {
      field: 'type',
      choices: getPageTypeChoices(this.config.pages),
    },
    {
      field: 'layout',
      choices: getPageLayoutChoices(this.config.pages),
    },
  ]

  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected router: Router,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle(this.config.pages.labels!.title!.plural)
  }

  onDuplicate(id: number): void {
    this.api
      .getPage(id)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: async (page) => {
          delete page.id

          page.public = false
          page.publishDate = null
          page.title = page.title!.match(/\(duplicate ?([0-9]+)?\)$/i)
            ? page.title!.replace(/\(duplicate ?([0-9]+)?\)$/, (_, i) => {
                return `(duplicate ${i ? ++i : 1})`
              })
            : `${page.title} (duplicate)`

          do {
            const match = page.path!.match(/-([0-9]+)$/)

            if (match) {
              page.path = page.path!.replace(/[0-9]+$/, (+match[1] + 1).toString())
            } else if (page.path && page.path !== '/') {
              page.path += '-1'
            } else {
              page.path += 'duplicate'
            }
          } while (
            (
              await firstValueFrom(
                this.api.getPages({
                  filters: { path: { $eqi: page.path! } },
                  perPage: 1,
                  language: '*',
                }),
              )
            ).meta.total
          )

          this.api
            .createPage(page)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: (duplicate) => {
                this.toastr.success(`${this.config.pages.labels!.item!.singular} duplicated`)
                this.router.navigate(['/pages', duplicate.id])
              },
              error: (response: HttpErrorResponse) => {
                if (response.status === 400) {
                  this.toastr.error(response.error.message)
                }
              },
            })
        },
        error: (response: HttpErrorResponse) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
  }

  onPreview(id: number): void {
    this.api
      .getPage(id)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: async (page) => {
          const nuxtBaseUrl = this.config.siteBaseUrl.replace(/\/$/, '')
          const url =
            nuxtBaseUrl +
            page.path!.replace(/\/+$/, '') +
            (page.public ? '' : '?__d=' + page.draftToken)

          window.open(url, '_blank')
        },
        error: (response: HttpErrorResponse) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
  }
}
