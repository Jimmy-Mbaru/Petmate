import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import AOS from 'aos';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  host: { class: 'block mb-0' },
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  protected showScrollToTop = false;
  private resizeListener = (): void => AOS.refresh();

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollToTop = window.scrollY > 300;
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 80,
      delay: 0,
    });
  }

  ngAfterViewInit(): void {
    AOS.refresh();
    requestAnimationFrame(() => AOS.refresh());
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
    AOS.refresh();
  }
}
