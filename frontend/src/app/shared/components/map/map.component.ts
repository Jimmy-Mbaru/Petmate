import {
  Component,
  input,
  output,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import * as L from 'leaflet';

export interface MapMarker {
  lat: number;
  lng: number;
  title?: string;
  popup?: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnInit, OnDestroy, OnChanges {
  /** Latitude for map center */
  lat = input<number>(51.505);
  /** Longitude for map center */
  lng = input<number>(-0.09);
  /** Optional height (e.g. '300px', '50vh'). Default 300px */
  height = input<string>('300px');
  /** Zoom level */
  zoom = input<number>(13);
  /** Markers to display on the map */
  markers = input<MapMarker[]>([]);
  /** Whether to show user location button */
  showLocateMe = input<boolean>(false);
  /** Map options */
  options = input<{
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    doubleClickZoom?: boolean;
    dragging?: boolean;
  }>({});

  /** Event emitted when map is clicked */
  mapClick = output<{ lat: number; lng: number }>();
  /** Event emitted when marker is clicked */
  markerClick = output<MapMarker>();

  private map: L.Map | null = null;
  private markerGroup: L.LayerGroup | null = null;

  ngOnInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      if (changes['lat'] || changes['lng']) {
        this.map.setView([this.lat(), this.lng()], this.zoom());
      }
      if (changes['markers']) {
        this.updateMarkers();
      }
      if (changes['height']) {
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 100);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    const mapOptions: L.MapOptions = {
      zoomControl: this.options().zoomControl ?? true,
      scrollWheelZoom: this.options().scrollWheelZoom ?? true,
      doubleClickZoom: this.options().doubleClickZoom ?? true,
      dragging: this.options().dragging ?? true,
    };

    this.map = L.map('map-container', mapOptions).setView(
      [this.lat(), this.lng()],
      this.zoom()
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.markerGroup = L.layerGroup().addTo(this.map);
    this.updateMarkers();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
  }

  private updateMarkers(): void {
    if (!this.map || !this.markerGroup) return;

    this.markerGroup.clearLayers();

    const markersList = this.markers();
    markersList.forEach((marker) => {
      const markerInstance = L.marker([marker.lat, marker.lng]);
      if (marker.title || marker.popup) {
        markerInstance.bindPopup(marker.popup || marker.title || '');
      }
      markerInstance.on('click', () => {
        this.markerClick.emit(marker);
      });
      markerInstance.addTo(this.markerGroup!);
    });

    if (markersList.length > 0) {
      this.markerGroup.addTo(this.map);
    }
  }

  locateMe(): void {
    if (!this.map) return;

    this.map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true,
    });

    this.map.on('locationfound', (e: L.LocationEvent) => {
      const marker = L.marker(e.latlng).addTo(this.map!);
      marker
        .bindPopup('You are within ' + e.accuracy + ' meters from this point')
        .openPopup();
    });

    this.map.on('locationerror', (e: L.ErrorEvent) => {
      console.error('Location error:', e.message);
    });
  }
}
