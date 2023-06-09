import { Injectable } from '@angular/core'
import { nanoid } from '@pruvious-test/shared'

@Injectable()
export class IdService {
  generate(prefix: string = 'p-'): string {
    return prefix + nanoid()
  }
}
