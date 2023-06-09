import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { passwordStrength } from 'check-password-strength'
import { BaseComponent } from 'src/app/components/base.component'

@Component({
  selector: 'app-password-strength',
  templateUrl: './password-strength.component.html',
})
export class PasswordStrengthComponent extends BaseComponent implements OnChanges {
  @Input()
  password!: string

  strength: number = -1

  strengthTitle: string = ''

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['password']) {
      const pws = passwordStrength(this.password)
      this.strength = pws.id
      this.strengthTitle = pws.value
    }
  }
}
