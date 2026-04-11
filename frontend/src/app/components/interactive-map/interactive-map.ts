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
  private clusterGroup: any;
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
    if (!this.L) {
      this.L = await import('leaflet');
      // Expõe o Leaflet globalmente antes de importar o plugin
      // (markercluster precisa do window.L para se registrar)
      (window as any).L = this.L;
      await import('leaflet.markercluster');
    }

    if (!this.map) {
      this.map = this.L.map('map-container').setView([firstPoi.lat, firstPoi.lon], 13);

      this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO'
      }).addTo(this.map);
    }

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 100);
  }

  private updateMarkers(currentPois: any[]) {
    if (!this.map || !this.L) return;

    // Remove o cluster anterior se existir
    if (this.clusterGroup) {
      this.map.removeLayer(this.clusterGroup);
    }

    // Cria novo grupo de cluster com visual neon customizado
    this.clusterGroup = (this.L as any).markerClusterGroup({
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 30 ? 44 : 52;
        const fontSize = count < 10 ? '0.85rem' : count < 30 ? '0.9rem' : '1rem';
        return this.L.divIcon({
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0, 20, 30, 0.85);
              border: 2px solid #00f3ff;
              box-shadow: 0 0 14px rgba(0, 243, 255, 0.6), inset 0 0 8px rgba(0, 243, 255, 0.1);
              color: #00f3ff;
              font-size: ${fontSize};
              font-weight: 800;
              font-family: 'Inter', sans-serif;
              letter-spacing: 0.5px;
              backdrop-filter: blur(4px);
            ">${count}</div>
          `,
          className: 'neon-cluster-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });
      }
    });

    currentPois.forEach(poi => {
      const icon = this.createCategoryIcon(poi.category);
      const marker = this.L.marker([poi.lat, poi.lon], { icon });

      const displayTag = this.translateTag(poi.category);
      marker.bindPopup(`
        <div style="background: #0a0a0a; color: white; border: 1px solid #00f3ff; border-radius: 8px; padding: 10px; min-width: 180px;">
          <strong style="color: #00f3ff; font-size: 1rem; display: block; margin-bottom: 4px;">${poi.name}</strong>
          <p style="font-size: 0.8rem; color: #ccc; margin: 0 0 8px 0;">${poi.address}</p>
          <span style="font-size: 0.7rem; font-weight: 800; color: #00f3ff; text-transform: uppercase;">${displayTag}</span>
        </div>
      `);

      this.clusterGroup.addLayer(marker);
    });

    this.map.addLayer(this.clusterGroup);

    // Ajusta o zoom para mostrar todos os pontos
    try {
      const bounds = this.clusterGroup.getBounds();
      if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.1));
    } catch (e) { /* ignora se bounds inválido */ }
  }

  private createCategoryIcon(category: string) {
    return this.L.divIcon({
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 243, 255, 0.08);
          border: 2px solid #00f3ff;
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.35);
          backdrop-filter: blur(4px);
        ">${this.getCategorySvg(category)}</div>
      `,
      className: 'custom-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  private getCategorySvg(category: string): string {
    const cat = category.toUpperCase();
    const commonProps = `width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

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