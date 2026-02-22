import { Component, Input, PLATFORM_ID, inject, effect, OnDestroy, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div id="map-container" style="height: 400px; width: 100%; border-radius: 12px; z-index: 1;"></div>`
})
export class InteractiveMap implements OnDestroy {
  // Cria um sinal interno para rastrear os dados com o effect
  private poisSignal = signal<any[]>([]);

  @Input() set pois(value: any[]) {
    this.poisSignal.set(value);
  }

  private platformId = inject(PLATFORM_ID);
  private map: any;
  private markersLayer: any;
  private L: any;

  constructor() {
    // Agora o effect rastreia o poisSignal() e rodará sempre que os dados mudarem
    effect(async () => {
      const currentPois = this.poisSignal();
      if (currentPois.length > 0 && isPlatformBrowser(this.platformId)) {
        await this.ensureMapReady(currentPois[0]);
        this.updateMarkers(currentPois);
      }
    });
  }

  private async ensureMapReady(firstPoi: any) {
    if (!this.L) this.L = await import('leaflet');
    if (!this.map) {
      this.map = this.L.map('map-container').setView([firstPoi.lat, firstPoi.lon], 13);
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      this.markersLayer = this.L.layerGroup().addTo(this.map);
    }

    // Força o Leaflet a recalcular o tamanho (evita o mapa cinza/vazio)
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  private updateMarkers(currentPois: any[]) {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();

    currentPois.forEach(poi => {
      const color = this.getCategoryColor(poi.category);
      const marker = this.L.circleMarker([poi.lat, poi.lon], {
        radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.8
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 150px;">
          <strong style="color: #2c3e50; font-size: 1rem;">${poi.name}</strong><br>
          <p style="font-size: 0.75rem; margin: 8px 0;">${poi.address}</p>
        </div>
      `);
      this.markersLayer.addLayer(marker);
    });

    if (currentPois.length > 0) {
      const group = new this.L.FeatureGroup(this.markersLayer.getLayers());
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  private getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'RESTAURANT': '#e67e22', 'SHOPPING': '#3498db', 'CULTURA': '#27ae60'
    };
    return colors[category] || '#95a5a6';
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
