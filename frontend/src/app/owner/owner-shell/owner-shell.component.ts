import { Component, OnInit, HostBinding, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard,
  lucideCat,
  lucideCalendar,
  lucideHeart,
  lucideMapPin,
  lucideShoppingBag,
  lucidePackage,
  lucideUser,
  lucideLogOut,
  lucideHome,
  lucideMessageCircle,
  lucideSparkles,
  lucideChevronsLeft,
  lucideChevronsRight,
} from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';

const SIDEBAR_COLLAPSED_KEY = 'petmate-owner-sidebar-collapsed';

@Component({
  selector: 'app-owner-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideCat,
      lucideCalendar,
      lucideHeart,
      lucideMapPin,
      lucideShoppingBag,
      lucidePackage,
      lucideUser,
      lucideLogOut,
      lucideHome,
      lucideMessageCircle,
      lucideSparkles,
      lucideChevronsLeft,
      lucideChevronsRight,
    }),
  ],
  templateUrl: './owner-shell.component.html',
  styleUrl: './owner-shell.component.css',
})
export class OwnerShellComponent implements OnInit, OnDestroy {
  collapsed = false;

  @HostBinding('attr.data-sidebar-collapsed')
  get sidebarCollapsedAttr(): string {
    return this.collapsed ? 'true' : 'false';
  }

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      this.collapsed = stored === 'true';
    }
    this.updateDocumentAttribute();
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-owner-sidebar');
    }
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
      document.documentElement.setAttribute('data-owner-sidebar', this.collapsed ? 'collapsed' : 'expanded');
    }
  }

  logout(): void {
    this.auth.logout();
    window.location.href = '/';
  }
}
