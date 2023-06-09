import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class SortableService {
  transfer: ((items: any[]) => void) | null = null
}
