import { Component, signal } from '@angular/core';
import { LayoutComponent } from './shared/components/layout/layout.component';

@Component({
  selector: 'app-root',
  imports: [LayoutComponent],
  template: '<app-layout></app-layout>',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
