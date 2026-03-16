import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';

@Component({
  selector: 'app-host-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-settings.component.html',
  styleUrls: ['./host-settings.component.css'],
})
export class HostSettingsComponent implements OnInit {
  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
  }
}
