import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.css',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() initialLat?: number;
  @Input() initialLng?: number;
  @Input() placeholder = 'Click on the map to select location';
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number; address?: string }>();

  @ViewChild('map') mapContainer!: ElementRef;

  private map!: L.Map;
  private marker?: L.Marker;
  readonly hasLocation = signal(false);
  readonly locationText = signal('');

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    const latCh = changes['initialLat'];
    const lngCh = changes['initialLng'];
    if (latCh?.currentValue != null && lngCh?.currentValue != null) {
      const lat = Number(latCh.currentValue);
      const lng = Number(lngCh.currentValue);
      this.map.setView([lat, lng], 13);
      this.addMarker(lat, lng);
      this.hasLocation.set(true);
      this.locationText.set(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    const defaultLat = this.initialLat ?? 51.505;
    const defaultLng = this.initialLng ?? -0.09;

    this.map = L.map(this.mapContainer.nativeElement).setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    if (this.initialLat != null && this.initialLng != null) {
      this.addMarker(this.initialLat, this.initialLng);
      this.hasLocation.set(true);
      this.locationText.set(`Lat: ${this.initialLat.toFixed(4)}, Lng: ${this.initialLng.toFixed(4)}`);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.onMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  private addMarker(lat: number, lng: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], {
        draggable: true,
      }).addTo(this.map);

      this.marker.on('dragend', (e: L.DragEndEvent) => {
        const marker = e.target as L.Marker;
        const position = marker.getLatLng();
        this.onMapClick(position.lat, position.lng);
      });
    }
  }

  private onMapClick(lat: number, lng: number): void {
    this.addMarker(lat, lng);
    this.hasLocation.set(true);
    this.locationText.set(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    this.locationSelected.emit({ lat, lng });

    // Optional: Reverse geocoding could be added here to get address
    this.reverseGeocode(lat, lng);
  }

  private reverseGeocode(lat: number, lng: number): void {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PetMate/1.0 (https://github.com/petmate)',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.display_name) {
          this.locationText.set(data.display_name);
          this.locationSelected.emit({ lat, lng, address: data.display_name });
        }
      })
      .catch(() => {});
  }

  getCurrentLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.warn('Geolocation is not supported');
      return;
    }
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.map.setView([lat, lng], 15);
        this.onMapClick(lat, lng);
      },
      (err) => {
        console.warn('Location error:', err.code, err.message);
      },
      options
    );
  }
}
