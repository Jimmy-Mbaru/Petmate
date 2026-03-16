import { Component, OnInit, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import AOS from 'aos';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly sidebarOpen = signal(true);
  readonly activeMenu = signal('users');

  constructor(
    protected authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: false,
      offset: 30,
    });
    const currentRoute = this.router.url;
    if (currentRoute.includes('users')) {
      this.activeMenu.set('users');
    } else if (currentRoute.includes('dashboard')) {
      this.activeMenu.set('dashboard');
    } else if (currentRoute.includes('store')) {
      this.activeMenu.set('store');
    } else if (currentRoute.includes('chat')) {
      this.activeMenu.set('chat');
    } else if (currentRoute.includes('reports')) {
      this.activeMenu.set('reports');
    } else if (currentRoute.includes('system-stats')) {
      this.activeMenu.set('system-stats');
    } else if (currentRoute.includes('profile')) {
      this.activeMenu.set('profile');
    }
  }

  ngAfterViewInit(): void {
    AOS.refresh();
  }

  ngOnDestroy(): void {
    AOS.refresh();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateTo(section: string): void {
    this.activeMenu.set(section);
    this.router.navigate([`/app/admin/${section}`]);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }
}
