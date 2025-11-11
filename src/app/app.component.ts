import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, HostListener, signal, ViewChild } from '@angular/core';
import { Annotation, Point } from './models/annotation.model';
import { AnnotationService as AnnotationService } from './services/annotation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  title = 'Family Photo Annotator';

  @ViewChild('imgEl') imgEl!: ElementRef<HTMLImageElement>;
  @ViewChild('wrap') wrap!: ElementRef<HTMLDivElement>;
  @ViewChild('svg') svg!: ElementRef<SVGSVGElement>;


  // Reactive state (Angular signals)
  imageLoaded = signal(false);
  hoverId = signal<string | null>(null);
  tooltip = signal<{ x: number; y: number; text: string } | null>(null);
  drawMode = signal<'point' | 'polygon' | null>('point');
  drawingPolygon: Point[] = [];
  zoom = signal(1);
  pan = signal({ x: 0, y: 0 });


  // Convenience getter
  get annotations(): Annotation[] { return this.svc.all; }


  constructor(private svc: AnnotationService) {
  }


  onImageLoad() {
    this.imageLoaded.set(true);
  }


  // Translate client coords -> percentage within image box
  private toPct(clientX: number, clientY: number): Point | null {
    const rect = this.wrap.nativeElement.getBoundingClientRect();
    const x = (clientX - rect.left - this.pan().x) / (rect.width * this.zoom());
    const y = (clientY - rect.top - this.pan().y) / (rect.height * this.zoom());
    if (x < 0 || y < 0 || x > 1 || y > 1) return null;
    return { xPct: x, yPct: y };
  }


  onCanvasClick(ev: MouseEvent) {
    if (!this.imageLoaded()) return;
    const p = this.toPct(ev.clientX, ev.clientY);
    if (!p) return;


    if (this.drawMode() === 'point') {
      const name = prompt('Name of this person?');
      if (name && name.trim()) this.svc.addPoint(name.trim(), p, '#2a4de3');
    } else if (this.drawMode() === 'polygon') {
      // Left click adds a vertex; Right click or double click finishes
      this.drawingPolygon.push(p);
    }
  }


  @HostListener('document:dblclick', ['$event'])
  finishPolygon(ev: MouseEvent) {
    if (this.drawMode() !== 'polygon' || this.drawingPolygon.length < 3) return;
    const name = prompt('Name for this area/person?');
    if (name && name.trim()) this.svc.addPolygon(name.trim(), [...this.drawingPolygon], '#e67e22');
    this.drawingPolygon = [];
  }

  onMouseMove(ev: MouseEvent) {
    if (!this.imageLoaded()) return;
    const p = this.toPct(ev.clientX, ev.clientY);
    const hit = p ? this.hitTest(p) : null;

    if (hit) {
      this.hoverId.set(hit.id);
      this.tooltip.set({ x: ev.clientX + 12, y: ev.clientY + 12, text: hit.name });
    } else {
      this.hoverId.set(null);
      this.tooltip.set(null); // <— do it here directly
    }
  }
  private hitTest(p: Point): Annotation | null {
    const ptRadius = 0.018; // ~1.8% of image width/height


    // Try points
    for (const a of this.annotations) {
      if (a.type === 'point') {
        const q = a.points[0];
        const dx = p.xPct - q.xPct;
        const dy = p.yPct - q.yPct;
        if (Math.hypot(dx, dy) < ptRadius) return a;
      }
    }


    // Try polygons (ray-casting)
    const inside = (polygon: Point[]) => {
      let c = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pi = polygon[i], pj = polygon[j];
        const intersect = ((pi.yPct > p.yPct) !== (pj.yPct > p.yPct)) &&
          (p.xPct < (pj.xPct - pi.xPct) * (p.yPct - pi.yPct) / (pj.yPct - pi.yPct) + pi.xPct);
        if (intersect) c = !c;
      }
      return c;
    };


    for (const a of this.annotations) {
      if (a.type === 'polygon' && inside(a.points)) return a;
    }


    return null;
  }


  // UI helpers
  deleteAnn(a: Annotation) {
    if (confirm(`Delete \"${a.name}\"?`)) this.svc.remove(a.id);
  }
  renameAnn(a: Annotation) {
    const name = prompt('New name:', a.name);
    if (name && name.trim()) this.svc.updateName(a.id, name.trim());
  }

  startPointMode() { this.drawMode.set('point'); this.drawingPolygon = []; }
  startPolyMode() { this.drawMode.set('polygon'); this.drawingPolygon = []; }
  cancelDraw() { this.drawMode.set(null); this.drawingPolygon = []; }


  zoomIn() { this.zoom.set(Math.min(3, this.zoom() + 0.1)); }
  zoomOut() { this.zoom.set(Math.max(0.5, this.zoom() - 0.1)); }
  resetView() { this.zoom.set(1); this.pan.set({ x: 0, y: 0 }); }


  onWheel(ev: WheelEvent) {
    ev.preventDefault();
    if (ev.deltaY > 0) this.zoomOut(); else this.zoomIn();
  }

  exportJSON() {
    const data = this.svc.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'family-annotations.json'; a.click();
    URL.revokeObjectURL(url);
  }


  importJSON(input: Event) {
    const file = (input.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.svc.import(String(reader.result ?? '[]'));
      (input.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  getDrawingPolygonPoints(points: Point[]): string {
    return points.map(p => (p.xPct * 100) + ',' + (p.yPct * 100)).join(' ');
  }

  get stageStyle() {
    return {
      '--z': this.zoom().toString(),
      '--px': this.pan().x + 'px',
      '--py': this.pan().y + 'px'
    } as any;
  }
}
