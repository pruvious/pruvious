import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { clearArray } from '@pruvious/utils'
import { ToastrService } from 'ngx-toastr'
import { forkJoin, takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService, Directory } from 'src/app/services/api.service'

@Component({
  selector: 'app-media-breadcrumbs',
  templateUrl: './media-breadcrumbs.component.html',
})
export class MediaBreadcrumbsComponent extends BaseComponent implements OnChanges {
  @Input()
  directory?: Partial<Directory>

  @Input()
  rootLabel: string = 'Library'

  @Output()
  openRoot = new EventEmitter<void>()

  @Output()
  openDirectory = new EventEmitter<Partial<Directory>>()

  tree: Partial<Directory>[] = []

  constructor(protected api: ApiService, protected toastr: ToastrService) {
    super()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['directory']) {
      clearArray(this.tree)

      const pathParts = this.directory?.path?.split('/').slice(0, -1)

      if (pathParts?.length) {
        this.tree.push(...pathParts.map((pathPart) => ({ name: pathPart })))

        const observables = Object.fromEntries(
          pathParts.map((_, index) => [
            index,
            this.api.getDirectoryByPath(pathParts.slice(0, index + 1).join('/')),
          ]),
        )

        forkJoin(observables)
          .pipe(takeUntil(this.unsubscribeAll$))
          .subscribe({
            next: (directories) => {
              clearArray(this.tree)

              Object.keys(directories)
                .sort()
                .forEach((index) => this.tree.push(directories[index]))
            },
            error: () => {
              this.toastr.error(
                'There was an error retrieving the media library tree (reload the app to resolve this issue)',
              )
            },
          })
      }
    }
  }
}
