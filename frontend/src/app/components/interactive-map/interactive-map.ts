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

  private async ensureMapReady(firstPoi: any) {
    if (!this.L) this.L = await import('leaflet');
    if (!this.map) {
      this.map = this.L.map('map-container').setView([firstPoi.lat, firstPoi.lon], 13);

      this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO'
      }).addTo(this.map);

      this.markersLayer = this.L.layerGroup().addTo(this.map);
    }

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 100);
  }

  private updateMarkers(currentPois: any[]) {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();

    currentPois.forEach(poi => {
      const color = '#00f3ff'; // Ciano Neon Padronizado
      const icon = this.createCategoryIcon(poi.category, color);
      const marker = this.L.marker([poi.lat, poi.lon], { icon });

      const displayTag = this.translateTag(poi.category);

      marker.bindPopup(`
        <div class="map-popup-content" style="background: #0a0a0a; color: white; border: 1px solid #00f3ff; border-radius: 8px; padding: 10px;">
          <strong style="color: #00f3ff; font-size: 1rem; display: block; margin-bottom: 4px;">${poi.name}</strong>
          <p style="font-size: 0.8rem; color: #ccc; margin: 0 0 8px 0;">${poi.address}</p>
          <span style="font-size: 0.7rem; font-weight: 800; color: #00f3ff; text-transform: uppercase;">${displayTag}</span>
        </div>
      `);
      this.markersLayer.addLayer(marker);
    });

    if (currentPois.length > 0) {
      const group = new this.L.FeatureGroup(this.markersLayer.getLayers());
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  private createCategoryIcon(category: string, color: string) {
    const iconHtml = `
      <div style="
        width: 38px; 
        height: 38px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: rgba(0, 243, 255, 0.1); 
        border: 2px solid #00f3ff; 
        box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
        backdrop-filter: blur(4px);
      ">
        ${this.getCategorySvg(category)}
      </div>
    `;

    return this.L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20]
    });
  }

  private getCategorySvg(category: string): string {
    const cat = category.toUpperCase();
    const commonProps = `width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    
    switch (cat) {
      case 'CULTURA':
        return `<svg ${commonProps}><path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>`;
      case 'NATUREZA':
        return `<svg ${commonProps}><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/></svg>`;
      case 'RESTAURANT':
        return `<svg ${commonProps}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
      case 'SHOPPING':
        return `<svg ${commonProps}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
      default:
        return `<svg ${commonProps}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    }
  }

  private translateTag(category: string): string {
    const tags: { [key: string]: string } = {
      'RESTAURANT': 'GASTRONOMIA',
      'SHOPPING': 'COMPRAS',
      'CULTURA': 'CULTURA',
      'NATUREZA': 'NATUREZA'
    };
    return tags[category.toUpperCase()] || category.toUpperCase();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}