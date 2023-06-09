import { Component } from '@angular/core'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
})
export class UsersComponent {
  constructor(public config: ConfigService) {
    this.config.setTitle(this.config.users.labels!.title!.plural)
  }
}
