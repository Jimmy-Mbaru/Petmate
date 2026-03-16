import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-owner-placeholder',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './owner-placeholder.component.html',
  styleUrl: './owner-placeholder.component.css',
})
export class OwnerPlaceholderComponent {
  constructor(public route: ActivatedRoute) {}
}
