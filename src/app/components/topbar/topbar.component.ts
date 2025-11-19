import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  @Output() upload = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() exportImage = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();
}

