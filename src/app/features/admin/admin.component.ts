import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaletteComponent } from './components/palette/palette.component';
import { CanvasComponent } from './components/canvas/canvas.component';

/** Admin (form builder) feature: palette + canvas. First route. */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, PaletteComponent, CanvasComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {}
