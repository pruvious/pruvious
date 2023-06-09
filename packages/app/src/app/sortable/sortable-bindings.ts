import { SortableBinding } from './sortable-binding'
import { SortableData } from './sortable.directive'

export class SortableBindings {
  bindings: SortableBinding[]

  constructor(bindingTargets: SortableData[]) {
    this.bindings = bindingTargets.map((target) => new SortableBinding(target))
  }

  injectIntoEvery(index: number, items: any[]) {
    this.bindings.forEach((b, i) => b.insert(index, items[i]))
  }

  getFromEvery(index: number) {
    return this.bindings.map((b) => b.get(index))
  }

  extractFromEvery(index: number) {
    return this.bindings.map((b) => b.remove(index))
  }

  get provided() {
    return !!this.bindings.length
  }
}
