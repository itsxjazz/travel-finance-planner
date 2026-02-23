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
  addRequested = output<any>();

  activeFilter = signal<string>('Todos');
  currentPage = signal<number>(1);
  itemsPerPage = 10;

  // Filtra os POIs antes de paginar
  private allFilteredPOIs = computed(() => {
    const filter = this.activeFilter();
    const pois = this.rawPOIs();
    if (filter === 'Todos') return pois;

    const filterMap: Record<string, string> = {
      'Cultura': 'CULTURA', 'Gastronomia': 'RESTAURANT', 'Shopping': 'SHOPPING', 'Compras': 'SHOPPING'
    };
    return pois.filter(poi => poi.category === filterMap[filter]);
  });

  filteredPOIs = computed(() => { // Aplica a paginação aos POIs já filtrados
    const pois = this.allFilteredPOIs();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return pois.slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => { // Calcula o total de páginas com base nos itens filtrados
    const count = this.allFilteredPOIs().length;
    return Math.ceil(count / this.itemsPerPage);
  });

  pagesArray = computed(() => { // Gera um array de páginas para o template
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  });

  setFilter(filter: string) { // Define o filtro ativo e reseta para a primeira página
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  setPage(page: number) { // Define a página ativa
    this.currentPage.set(page);
    window.scrollTo({ top: 800, behavior: 'smooth' });
  }

  translateCategory(category: string): string { // Traduz as categorias para exibição
    const categories: Record<string, string> = {
      'CULTURA': 'Cultura', 'RESTAURANT': ' Gastronomia', 'SHOPPING': 'Compras'
    };
    return categories[category] || category;
  }
}
