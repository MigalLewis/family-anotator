import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Annotation } from '../../models/annotation.model';

@Component({
  selector: 'app-annotation-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './annotation-list.component.html',
  styleUrl: './annotation-list.component.scss'
})
export class AnnotationListComponent {
  @Input({ required: true }) annotations: Annotation[] = [];
  @Output() rename = new EventEmitter<Annotation>();
  @Output() remove = new EventEmitter<Annotation>();
}

