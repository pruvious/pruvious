import { SortableData } from './sortable.directive'

export class SortableBinding {
  constructor(protected target: SortableData) {}

  insert(index: number, item: any) {
    if (this.isFormArray) {
      this.target.insert(index, item)
    } else {
      this.target.splice(index, 0, item)
    }
  }

  get(index: number) {
    return this.isFormArray ? this.target.at(index) : this.target[index]
  }

  remove(index: number) {
    let item

    if (this.isFormArray) {
      item = this.target.at(index)
      this.target.removeAt(index)
    } else {
      item = this.target.splice(index, 1)[0]
    }

    return item
  }

  protected get isFormArray() {
    return !!this.target.at && !!this.target.insert && !!this.target.reset
  }
}
