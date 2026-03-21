import { Component, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastComponent } from '../toast/toast.component';
import { LoadingComponent } from '../../loading/loading.component';
import { ConfirmationModalComponent } from '../ui/confirmation-modal/confirmation-modal.component';
import { RouteProgressComponent } from '../route-progress/route-progress.component';
import { BackToTopComponent } from '../back-to-top/back-to-top.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent, LoadingComponent, ConfirmationModalComponent, RouteProgressComponent, BackToTopComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  readonly isOwnerLayout = signal(false);
  readonly isHostLayout = signal(false);
  readonly isAuthRoute = signal(false);
  /** True when on /app, /app/host, /app/admin (so content needs to start below fixed navbar) */
  readonly isAppRoute = signal(false);

  constructor(private router: Router) {}

  private updateLayout(): void {
    const url = this.router.url;
    this.isAppRoute.set(url.startsWith('/app'));
    this.isOwnerLayout.set(url.startsWith('/app') && !url.startsWith('/app/host') && !url.startsWith('/app/admin'));
    this.isHostLayout.set(url.startsWith('/app/host'));
    this.isAuthRoute.set(url.startsWith('/auth/login') || url.startsWith('/auth/register'));
  }

  ngOnInit(): void {
    this.updateLayout();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateLayout());
  }
}
