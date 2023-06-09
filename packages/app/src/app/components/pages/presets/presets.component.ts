import { HttpErrorResponse } from '@angular/common/http'
import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-presets',
  templateUrl: './presets.component.html',
})
export class PresetsComponent extends BaseComponent {
  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected router: Router,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle(this.config.presets.labels!.title!.plural)
  }

  onDuplicate(id: number): void {
    this.api
      .getPreset(id)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: async (preset) => {
          delete preset.id

          do {
            preset.title = preset.title!.match(/\(duplicate ?([0-9]+)?\)$/i)
              ? preset.title!.replace(/\(duplicate ?([0-9]+)?\)$/, (_, i) => {
                  return `(duplicate ${i ? ++i : 1})`
                })
              : `${preset.title} (duplicate)`
          } while (
            (
              await firstValueFrom(
                this.api.getPages({
                  filters: { title: { $eqi: preset.title } },
                  perPage: 1,
                  language: this.config.currentLanguage,
                }),
              )
            ).meta.total
          )

          this.api
            .createPreset(preset)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: (duplicate) => {
                this.toastr.success(`${this.config.presets.labels!.item!.singular} duplicated`)
                this.router.navigate(['/presets', duplicate.id])
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
}
