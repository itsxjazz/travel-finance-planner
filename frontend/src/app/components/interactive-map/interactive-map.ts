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
      const icon = this.createCategoryIcon(poi.category, color);
      const marker = this.L.marker([poi.lat, poi.lon], { icon });

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

  private createCategoryIcon(category: string, color: string) {
    const iconHtml = `
      <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${color};border:2px solid rgba(255,255,255,0.18);box-shadow:0 0 16px rgba(0,243,255,0.28);">
        ${this.getCategorySvg(category)}
      </div>
    `;

    return this.L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -38]
    });
  }

  private getCategorySvg(category: string): string {
    const cat = category.toUpperCase();
    switch (cat) {
      case 'CULTURA':
        return `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16" />
            <path d="M6 20V8" />
            <path d="M18 20V8" />
            <path d="M8 12h8" />
            <path d="M10 16h4" />
            <path d="M12 4l6 4H6l6-4z" />
          </svg>
        `;
      case 'RESTAURANT':
        return `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 2v7" />
            <path d="M11 2v7" />
            <path d="M14 2v7" />
            <path d="M17 2v7" />
            <path d="M8 9h9" />
            <path d="M10 9v10" />
            <path d="M14 9v10" />
            <path d="M10 19h4" />
          </svg>
        `;
      case 'SHOPPING':
        return `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
        `;
      default:
        return `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
          </svg>
        `;
    }
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
