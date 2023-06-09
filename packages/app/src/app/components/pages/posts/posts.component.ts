import { HttpErrorResponse } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Collection } from '@pruvious-test/shared'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
})
export class PostsComponent extends BaseComponent implements OnInit {
  collection: Collection = this.route.snapshot.data['collection']

  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle(this.collection.labels!.title!.plural)
  }

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false
  }

  onDuplicate(id: number): void {
    this.api
      .getPost(this.collection.name, id)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: async (post) => {
          delete post.id

          post.public = false
          post.publishDate = null

          this.api
            .createPost(this.collection.name, post)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: (duplicate) => {
                this.toastr.success(`${this.collection.labels!.item!.singular} duplicated`)
                this.router.navigate(['/collections', this.collection.name, 'posts', duplicate.id])
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
