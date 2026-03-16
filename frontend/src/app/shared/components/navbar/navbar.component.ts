import { AsyncPipe } from '@angular/common';
import { Component, inject, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

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
  activeSection = '';

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

  protected get isHome(): boolean {
    return this.router.url === '/' || this.router.url === '';
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
