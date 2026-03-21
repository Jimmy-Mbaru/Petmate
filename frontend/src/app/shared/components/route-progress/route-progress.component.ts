import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-route-progress',
  standalone: true,
  template: `
    <div class="route-progress-track" [class.visible]="active">
      <div class="route-progress-bar"
           [style.width.%]="done ? 100 : (active ? 72 : 0)"
           [class.done]="done">
      </div>
    </div>
  `,
  styleUrl: './route-progress.component.css',
})
export class RouteProgressComponent implements OnInit, OnDestroy {
  active = false;
  done = false;
  private sub!: Subscription;
  private doneTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (this.doneTimer) clearTimeout(this.doneTimer);
        this.done = false;
        this.active = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.active = false;
        this.done = true;
        this.doneTimer = setTimeout(() => { this.done = false; }, 600);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.doneTimer) clearTimeout(this.doneTimer);
  }
}
