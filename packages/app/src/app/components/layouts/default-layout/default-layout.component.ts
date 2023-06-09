import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Collection, Settings } from '@pruvious/shared'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-default-layout',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.css'],
})
export class DefaultLayoutComponent {
  collections: Collection[] = []

  settings: Partial<Settings>[] = this.route.snapshot.data['settings']

  constructor(public config: ConfigService, protected route: ActivatedRoute) {
    for (const collection of Object.values(config.collections)) {
      this.collections.push(collection)
    }
  }

  onClickNavItem(event: MouseEvent): void {
    window.dispatchEvent(
      new CustomEvent('click-nav-item', {
        detail:
          (event.target as HTMLAnchorElement).getAttribute('href') ||
          (event.target as HTMLAnchorElement).getAttribute('ng-reflect-router-link'),
      }),
    )
  }
}
