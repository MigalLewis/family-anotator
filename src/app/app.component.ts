import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Annotation } from './models/annotation.model';
import { DialogComponent } from './shared/dialog/dialog.component';
import { Dialog } from '@angular/cdk/dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild('wrap') wrap!: ElementRef<HTMLDivElement>;

  annotations: Annotation[] = [];

  isDragging = false;

  dragStart = { xPct: 0, yPct: 0 };
  dragCurrent = { xPct: 0, yPct: 0 };

  nextLabelNumber = 1;

  constructor(private dialog: Dialog) { }

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
}
