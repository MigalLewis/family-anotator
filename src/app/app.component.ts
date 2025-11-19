import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Annotation } from './models/annotation.model';
import { DialogComponent } from './shared/dialog/dialog.component';
import { Dialog } from '@angular/cdk/dialog';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DialogComponent],
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

  exportAsImage() {
    const stage = this.wrap.nativeElement;  // the container
    const imgEl = stage.querySelector('img');
    const svgEl = stage.querySelector('svg');

    if (!imgEl || !svgEl) {
      alert("Nothing to export");
      return;
    }

    const oldDragging = this.isDragging;
    this.isDragging = false;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw image first
    const img = new Image();
    img.src = this.imageSrc ?? '';

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw the SVG onto the canvas
      const cleaned = this.cleanSVG(svgEl);
      const cloned = this.fixSvgPercentUnits(cleaned, canvas.width, canvas.height);
      const svgData = new XMLSerializer().serializeToString(cloned);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const svgImg = new Image();
      svgImg.src = svgUrl;

      svgImg.onload = () => {
        ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);

        // Download PNG
        const link = document.createElement('a');
        link.download = 'family_tags.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        this.isDragging = oldDragging;
      };
    };
  }

  exportAsPDF() {
    const stage = this.wrap.nativeElement;
    const imgEl = stage.querySelector('img');
    const svgEl = stage.querySelector('svg');

    if (!imgEl || !svgEl) {
      alert("No image loaded");
      return;
    }

    const oldDragging = this.isDragging;
    this.isDragging = false;

    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.src = this.imageSrc ?? '';

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Now serialize *clean* SVG
      const cloned = this.cleanSVG(svgEl);
      const svgData = new XMLSerializer().serializeToString(cloned);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const svgImg = new Image();
      svgImg.src = svgUrl;

      svgImg.onload = () => {
        ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);

        // Convert canvas to PNG data
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height + 400]
        });

        // Page 1 - image
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

        // Page 2 - list of annotations
        pdf.addPage();

        pdf.setFontSize(18);
        pdf.text("Family Tags List", 20, 40);

        pdf.setFontSize(14);
        let y = 80;

        for (const a of this.annotations) {
          pdf.text(`${a.label}. ${a.name}`, 20, y);
          y += 24;
        }

        pdf.save('family_tags.pdf');

        this.isDragging = oldDragging;
      };
    };
  }

  cleanSVG(svgEl: SVGElement): SVGElement {
    const cloned = svgEl.cloneNode(true) as SVGElement;

    // REMOVE Angular comment nodes
    const walker = document.createTreeWalker(cloned, NodeFilter.SHOW_COMMENT);
    const comments: Comment[] = [];

    let node = walker.nextNode();
    while (node) {
      comments.push(node as Comment);
      node = walker.nextNode();
    }

    comments.forEach(c => c.parentNode?.removeChild(c));

    return cloned;
  }

  fixSvgPercentUnits(svgEl: SVGElement, imgWidth: number, imgHeight: number): SVGElement {
    const clone = svgEl.cloneNode(true) as SVGElement;

    // convert % → absolute px for lines, circles, text
    const elements = clone.querySelectorAll('line, circle, text');

    elements.forEach((el: any) => {
      if (el.hasAttribute('x1')) {
        el.setAttribute('x1', (parseFloat(el.getAttribute('x1')) / 100 * imgWidth).toString());
      }
      if (el.hasAttribute('y1')) {
        el.setAttribute('y1', (parseFloat(el.getAttribute('y1')) / 100 * imgHeight).toString());
      }
      if (el.hasAttribute('x2')) {
        el.setAttribute('x2', (parseFloat(el.getAttribute('x2')) / 100 * imgWidth).toString());
      }
      if (el.hasAttribute('y2')) {
        el.setAttribute('y2', (parseFloat(el.getAttribute('y2')) / 100 * imgHeight).toString());
      }
      if (el.hasAttribute('cx')) {
        el.setAttribute('cx', (parseFloat(el.getAttribute('cx')) / 100 * imgWidth).toString());
      }
      if (el.hasAttribute('cy')) {
        el.setAttribute('cy', (parseFloat(el.getAttribute('cy')) / 100 * imgHeight).toString());
      }
      if (el.hasAttribute('x')) {
        el.setAttribute('x', (parseFloat(el.getAttribute('x')) / 100 * imgWidth).toString());
      }
      if (el.hasAttribute('y')) {
        el.setAttribute('y', (parseFloat(el.getAttribute('y')) / 100 * imgHeight).toString());
      }
      if (el.hasAttribute('r')) {
        // percentage of width typically
        el.setAttribute('r', (parseFloat(el.getAttribute('r')) / 100 * imgWidth).toString());
      }
    });

    return clone;
  }

}
