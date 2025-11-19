import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Annotation } from './models/annotation.model';
import { DialogComponent } from './shared/dialog/dialog.component';
import { Dialog } from '@angular/cdk/dialog';
import { TopbarComponent } from './components/topbar/topbar.component';
import { AnnotationListComponent } from './components/annotation-list/annotation-list.component';
import { ExportService } from './services/export.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DialogComponent, TopbarComponent, AnnotationListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild('wrap') wrap!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  imageSrc: string | null = null;
  currentImageUrl: string | null = null;

  annotations: Annotation[] = [];

  isDragging = false;

  dragStart = { xPct: 0, yPct: 0 };
  dragCurrent = { xPct: 0, yPct: 0 };

  nextLabelNumber = 1;




  constructor(private dialog: Dialog, private exportService: ExportService) { }

  /** Convert screen coordinates → percent inside image container */
  private toPct(ev: MouseEvent) {
    const rect = this.wrap.nativeElement.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    return { xPct: x, yPct: y };
  }

  /** START DRAG */
  startDrag(ev: MouseEvent) {

    const p = this.toPct(ev);
    this.dragStart = p;
    this.dragCurrent = p;
    this.isDragging = true;
  }

  /** DURING DRAG */
  dragMove(ev: MouseEvent) {
    if (!this.isDragging) return;
    this.dragCurrent = this.toPct(ev);
  }

  /** END DRAG → CREATE ANNOTATION */
  endDrag(ev: MouseEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;

    const start = this.dragStart;
    const end = this.dragCurrent;

    // Minimum drag length (to avoid accidental clicks)
    const minDistance = 0.02; // 2% of height

    const verticalDistance = Math.abs(end.yPct - start.yPct);

    if (verticalDistance < minDistance) {
      console.log("drag too small");
      return;
    }

    const labelNumber = this.nextLabelNumber++;

    // Open dialog
    const ref = this.dialog.open<string>(DialogComponent, {
      data: {
        title: `Enter name for #${labelNumber}`,
        name: '',
      },
      disableClose: true,
    });

    ref.closed.subscribe(name => {
      if (!name) return;

      this.annotations.push({
        id: crypto.randomUUID(),
        name,
        label: labelNumber,
        start,
        end,
      });
    });
  }

  triggerImageSelect() {
    this.imageInput.nativeElement.click();
  }

  /** Called when user selects an image */
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.imageSrc = reader.result as string;

      // Reset annotations because coordinates depend on a new image
      this.annotations = [];
      this.nextLabelNumber = 1;
    };

    reader.readAsDataURL(file);
  }

  /** Same button used in the topbar */
  uploadImage() {
    this.triggerImageSelect();
  }

  /** Reset annotations only */
  resetAnnotations() {
    this.annotations = [];
    this.nextLabelNumber = 1;
  }

  /** Save as JSON */
  save() {
    const payload = {
      image: this.imageSrc,
      annotations: this.annotations
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'family-tags.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  renameAnn(a: Annotation) {
    const ref = this.dialog.open<string>(DialogComponent, {
      data: { title: `Rename #${a.label}`, name: a.name },
      disableClose: true,
    });

    ref.closed.subscribe(name => {
      if (name) a.name = name;
    });
  }

  deleteAnn(a: Annotation) {
    this.annotations = this.annotations.filter(x => x.id !== a.id);
  }

  async exportAsImage() {
    await this.withDragSuspended(async () => {
      await this.exportService.exportAsImage(this.wrap.nativeElement, this.imageSrc);
    });
  }

  async exportAsPDF() {
    await this.withDragSuspended(async () => {
      await this.exportService.exportAsPDF(this.wrap.nativeElement, this.imageSrc, this.annotations);
    });
  }

  private async withDragSuspended(fn: () => Promise<void>) {
    const oldDragging = this.isDragging;
    this.isDragging = false;
    try {
      await fn();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      this.isDragging = oldDragging;
    }
  }

}
