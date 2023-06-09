import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core'
import { DragImageService } from 'src/app/services/drag-image.service'

@Component({
  selector: 'app-drag-image',
  templateUrl: './drag-image.component.html',
})
export class DragImageComponent implements AfterViewInit {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>

  constructor(public dragImage: DragImageService) {}

  ngAfterViewInit(): void {
    this.dragImage.element = this.container.nativeElement
  }
}
