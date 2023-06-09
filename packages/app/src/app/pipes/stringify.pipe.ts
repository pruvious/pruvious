import { Pipe, PipeTransform } from '@angular/core'
import { stringify } from 'src/app/utils/stringify'

@Pipe({
  name: 'stringify',
})
export class StringifyPipe implements PipeTransform {
  constructor() {}

  transform(value: any): string {
    return stringify(value)
  }
}
