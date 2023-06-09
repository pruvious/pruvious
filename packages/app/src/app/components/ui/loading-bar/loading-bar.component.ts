import { Component, OnInit } from '@angular/core'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { LoadingService } from 'src/app/services/loading.service'

@Component({
  selector: 'app-loading-bar',
  templateUrl: './loading-bar.component.html',
  styleUrls: ['./loading-bar.component.css'],
})
export class LoadingBarComponent extends BaseComponent implements OnInit {
  visible: boolean = false

  constructor(protected loading: LoadingService) {
    super()
  }

  ngOnInit(): void {
    this.loading
      .listen('http')
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((count) => {
        this.visible = count > 0
      })
  }
}
