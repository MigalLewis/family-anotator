import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { Annotation } from '../models/annotation.model';
import { cleanSVG, fixSvgPercentUnits } from '../utils/svg-utils';

@Injectable({ providedIn: 'root' })
export class ExportService {

  async exportAsImage(stage: HTMLElement, imageSrc: string | null): Promise<void> {
    const { imgEl, svgEl } = this.getStageElements(stage);
    if (!imgEl || !svgEl || !imageSrc) {
      throw new Error('Nothing to export');
    }

    const canvas = this.createCanvas(imgEl);
    const ctx = canvas.getContext('2d')!;

    const img = await this.loadImage(imageSrc);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const svgClone = fixSvgPercentUnits(cleanSVG(svgEl), canvas.width, canvas.height);
    const svgImage = await this.renderSvg(svgClone);
    ctx.drawImage(svgImage, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.download = 'family_tags.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async exportAsPDF(stage: HTMLElement, imageSrc: string | null, annotations: Annotation[]): Promise<void> {
    const { imgEl, svgEl } = this.getStageElements(stage);
    if (!imgEl || !svgEl || !imageSrc) {
      throw new Error('No image loaded');
    }

    const canvas = this.createCanvas(imgEl);
    const ctx = canvas.getContext('2d')!;

    const img = await this.loadImage(imageSrc);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const svgClone = cleanSVG(svgEl);
    const svgImage = await this.renderSvg(svgClone);
    ctx.drawImage(svgImage, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height + 400]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.addPage();
    pdf.setFontSize(18);
    pdf.text('Family Tags List', 20, 40);

    pdf.setFontSize(14);
    let y = 80;
    for (const a of annotations) {
      pdf.text(`${a.label}. ${a.name}`, 20, y);
      y += 24;
    }

    pdf.save('family_tags.pdf');
  }

  private getStageElements(stage: HTMLElement) {
    const imgEl = stage.querySelector('img');
    const svgEl = stage.querySelector('svg');
    return { imgEl, svgEl };
  }

  private createCanvas(imgEl: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    return canvas;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  private async renderSvg(svgEl: SVGElement): Promise<HTMLImageElement> {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await this.loadImage(svgUrl);
      return img;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }
}

