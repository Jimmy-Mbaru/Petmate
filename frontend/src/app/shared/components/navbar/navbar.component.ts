import { AsyncPipe } from '@angular/common';
import { Component, inject, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  private router = inject(Router);
  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);
  activeSection = '';
  mobileMenuOpen = false;

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const sections = ['how-it-works', 'success-stories', 'faq', 'about'];
    const scrollPosition = window.scrollY + 150;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetHeight = element.offsetHeight;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          this.activeSection = section;
          return;
        }
      }
    }
    this.activeSection = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileMenuOpen = false;
  }

  protected get isHome(): boolean {
    return this.router.url === '/' || this.router.url === '';
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenuOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('mobile-menu')) {
      this.mobileMenuOpen = false;
    }
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
