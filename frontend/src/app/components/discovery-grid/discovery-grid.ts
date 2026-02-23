import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-discovery-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './discovery-grid.html',
  styleUrls: ['./discovery-grid.scss']
})
export class DiscoveryGrid {
  destinationName = input<string>('');
  rawPOIs = input<any[]>([]);

  // Avisa o Maestro para adicionar ao roteiro
  addRequested = output<any>();

  activeFilter = signal<string>('Todos');
  currentPage = signal<number>(1);
  itemsPerPage = 10;

  filteredPOIs = computed(() => { // Computed que retorna os POIs filtrados e paginados
    const filter = this.activeFilter();
    const page = this.currentPage();
    const pois = this.rawPOIs();

    let filtered = pois;
    if (filter !== 'Todos') {
      const filterMap: Record<string, string> = {
        'Cultura': 'CULTURA', 'Gastronomia': 'RESTAURANT', 'Shopping': 'SHOPPING', 'Compras': 'SHOPPING'
      };
      filtered = pois.filter(poi => poi.category === filterMap[filter]);
    }

    const startIndex = (page - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  });

  setFilter(filter: string) { // Atualiza o filtro ativo e reseta para a primeira página
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    this.currentPage.set(page);
    // Faz o scroll suave para o topo do grid ao mudar de página
    window.scrollTo({ top: 800, behavior: 'smooth' });
  }

  translateCategory(category: string): string { // Função de tradução para exibir os nomes das categorias de forma amigável
    const categories: Record<string, string> = {
      'CULTURA': 'Cultura', 'RESTAURANT': ' Gastronomia', 'SHOPPING': 'Compras'
    };
    return categories[category] || category;
  }
}
