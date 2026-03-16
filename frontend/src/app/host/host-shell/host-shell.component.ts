import { Component, OnInit, signal, AfterViewInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import AOS from 'aos';

const SIDEBAR_COLLAPSED_KEY = 'petmate-host-sidebar-collapsed';

@Component({
  selector: 'app-host-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './host-shell.component.html',
  styleUrls: ['./host-shell.component.css'],
})
export class HostShellComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly activeMenu = signal('dashboard');
  collapsed = false;

  @HostBinding('attr.data-sidebar-collapsed')
  get sidebarCollapsedAttr(): string {
    return this.collapsed ? 'true' : 'false';
  }

  constructor(
    protected authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: false,
      offset: 30,
    });

    // Load collapsed state from localStorage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      this.collapsed = stored === 'true';
    }
    this.updateDocumentAttribute();

    const currentRoute = this.router.url;
    if (currentRoute.includes('dashboard')) {
      this.activeMenu.set('dashboard');
    } else if (currentRoute.includes('bookings')) {
      this.activeMenu.set('bookings');
    } else if (currentRoute.includes('profile')) {
      this.activeMenu.set('profile');
    } else if (currentRoute.includes('settings')) {
      this.activeMenu.set('settings');
    } else if (currentRoute.includes('chat')) {
      this.activeMenu.set('chat');
    }
  }

  ngAfterViewInit(): void {
    AOS.refresh();
  }

  ngOnDestroy(): void {
    AOS.refresh();
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-host-sidebar');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateTo(section: string): void {
    this.activeMenu.set(section);
    this.router.navigate([`/app/host/${section}`]);
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.collapsed));
    }
    this.updateDocumentAttribute();
  }

  private updateDocumentAttribute(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-host-sidebar',
        this.collapsed ? 'collapsed' : 'expanded',
      );
    }
  }
}
