import { HttpErrorResponse } from '@angular/common/http'
import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
})
export class RolesComponent extends BaseComponent {
  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected router: Router,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle(this.config.roles.labels!.title!.plural)
  }

  onDuplicate(id: number): void {
    this.api
      .getRole(id)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: async (role) => {
          delete role.id

          do {
            role.name = role.name!.match(/\(duplicate ?([0-9]+)?\)$/i)
              ? role.name!.replace(/\(duplicate ?([0-9]+)?\)$/, (_, i) => {
                  return `(duplicate ${i ? ++i : 1})`
                })
              : `${role.name} (duplicate)`
          } while (
            (
              await firstValueFrom(
                this.api.getRoles({
                  filters: { name: { $eqi: role.name! } },
                  perPage: 1,
                }),
              )
            ).meta.total
          )

          this.api
            .createRole(role)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: (duplicate) => {
                this.toastr.success(`${this.config.roles.labels!.item!.singular} duplicated`)
                this.router.navigate(['/roles', duplicate.id])
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

  onDelete(ids: (string | number)[]): void {
    if (this.config.me.role && (ids.includes('*') || ids.includes(this.config.me.role))) {
      this.api
        .getConfig()
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe(({ me }) => {
          this.config.me = me
        })
    }
  }
}
