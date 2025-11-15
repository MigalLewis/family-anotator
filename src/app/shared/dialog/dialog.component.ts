import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DialogModule, DIALOG_DATA } from '@angular/cdk/dialog';
import { NameDialogData } from '../../models/annotation.model';


@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss'
})
export class DialogComponent {
  name: string = '';

  constructor(
    public ref: DialogRef<string>,
    @Inject(DIALOG_DATA) public data: NameDialogData
  ) {
    this.name = data.name || '';
  }

  save() {
    this.ref.close(this.name.trim());
  }

  close() {
    this.ref.close(undefined);
  }
}
