import { Component, Input, PLATFORM_ID, inject, OnDestroy, signal, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interactive-map.html',
  styleUrl: './interactive-map.scss'
})
export class InteractiveMap implements OnDestroy {
  private poisSignal = signal<any[]>([]);

  @Input() set pois(value: any[]) {
    this.poisSignal.set(value);
  }

  private platformId = inject(PLATFORM_ID);
  private map: any;
  private markersLayer: any;
  private L: any;

  constructor() {
    effect(async () => {
      const currentPois = this.poisSignal();
      if (currentPois.length > 0 && isPlatformBrowser(this.platformId)) {
        await this.ensureMapReady(currentPois[0]);
        this.updateMarkers(currentPois);
      }
    });
  }

  private async ensureMapReady(firstPoi: any) { // Inicializa o mapa se ainda não estiver pronto
    if (!this.L) this.L = await import('leaflet');
    if (!this.map) {
      this.map = this.L.map('map-container').setView([firstPoi.lat, firstPoi.lon], 13);

      this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO'
      }).addTo(this.map);

      this.markersLayer = this.L.layerGroup().addTo(this.map);
    }

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 100);
  }

  private updateMarkers(currentPois: any[]) { // Atualiza os marcadores no mapa com base nos POIs atuais
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();

    currentPois.forEach(poi => {
      const color = this.getCategoryColor(poi.category);

      const marker = this.L.circleMarker([poi.lat, poi.lon], {
        radius: 8,
        fillColor: color,
        color: '#00f3ff',
        weight: 1.5,
        fillOpacity: 0.9
      });

      // Tradução visual no Popup
      const displayTag = this.translateTag(poi.category);

      marker.bindPopup(`
        <div class="map-popup-content">
          <strong class="text-cyan">${poi.name}</strong>
          <p class="address">${poi.address}</p>
          <span class="category-tag" style="color: ${color}">${displayTag}</span>
        </div>
      `);
      this.markersLayer.addLayer(marker);
    });

    if (currentPois.length > 0) {
      const group = new this.L.FeatureGroup(this.markersLayer.getLayers());
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  // SINCRONIZAÇÃO COM A LEGENDA DO PLANNER
  private getCategoryColor(category: string): string {
    const cat = category.toUpperCase();
    const colors: { [key: string]: string } = {
      'CULTURA': '#00f3ff',    // Ciano Neon Puro
      'RESTAURANT': '#00b8c4', // Ciano Médio
      'SHOPPING': '#007a82'    // Ciano Profundo
    };
    return colors[cat] || '#00b8c4';
  }

  private translateTag(category: string): string {
    const cat = category.toUpperCase();
    const tags: { [key: string]: string } = {
      'RESTAURANT': 'GASTRONOMIA',
      'SHOPPING': 'COMPRAS',
      'CULTURA': 'CULTURA'
    };
    return tags[cat] || cat;
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
