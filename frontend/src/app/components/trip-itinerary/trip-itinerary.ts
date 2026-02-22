import { Component, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trip-itinerary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-itinerary.html'
})
export class TripItinerary {
  // Signal Input para receber os itens do roteiro
  items = input<any[]>([]);

  // Evento para avisar o Maestro que um item deve ser removido
  @Output() removeRequested = new EventEmitter<string>();

  // Lógica de tradução isolada
  translateCategory(category: string): string {
    const categories: { [key: string]: string } = {
      'CULTURA': '🏛️ Cultura',
      'RESTAURANT': '🍴 Gastronomia',
      'SHOPPING': '🛍️ Compras'
    };
    return categories[category] || category;
  }

  removeItem(id: string) {
    this.removeRequested.emit(id);
  }
}
