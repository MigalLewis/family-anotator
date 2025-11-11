import { Injectable } from '@angular/core';
import { Annotation, Point } from '../models/annotation.model';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'family-annotator.v1';

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {

  private _items: Annotation[] = [];


  constructor() {
    this.load();
  }


  get all() { return this._items; }


  addPoint(name: string, p: Point, color?: string): Annotation {
    const a: Annotation = {
      id: uuidv4(),
      name,
      type: 'point',
      points: [p],
      color,
      createdAt: new Date().toISOString(),
    };
    this._items.push(a);
    this.save();
    return a;
  }


  addPolygon(name: string, pts: Point[], color?: string): Annotation {
    const a: Annotation = {
      id: uuidv4(),
      name,
      type: 'polygon',
      points: pts,
      color,
      createdAt: new Date().toISOString(),
    };
    this._items.push(a);
    this.save();
    return a;
  }


  updateName(id: string, name: string) {
    const i = this._items.findIndex(x => x.id === id);
    if (i >= 0) {
      this._items[i] = { ...this._items[i], name };
      this.save();
    }
  }


  remove(id: string) {
    this._items = this._items.filter(x => x.id !== id);
    this.save();
  }


  clear() { this._items = []; this.save(); }


  export(): string { return JSON.stringify(this._items, null, 2); }
  import(json: string) {
    try {
      const data = JSON.parse(json) as Annotation[];
      if (Array.isArray(data)) {
        this._items = data;
        this.save();
      }
    } catch { /* ignore */ }
  }


  private load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { this._items = JSON.parse(raw) as Annotation[]; } catch { }
    }
  }


  private save() {
  }
}
